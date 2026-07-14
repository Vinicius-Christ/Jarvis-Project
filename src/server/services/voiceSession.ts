/**
 * voiceSession.ts — WebSocket Voice Server
 * 
 * Full-duplex voice session manager with:
 * - State machine: IDLE → LISTENING → PROCESSING → SPEAKING
 * - Groq Whisper STT (server-side)
 * - Groq LLaMA streaming LLM
 * - Edge TTS streamed back via WebSocket
 * - Barge-in interrupt support
 * - In-memory conversation context buffer (15 last exchanges per session)
 */

import { WebSocketServer, WebSocket } from "ws";
import { Server as HTTPServer } from "http";
import crypto from "crypto";
import { EdgeTTS } from "node-edge-tts";
import { AI_PERSONAS, getRelevantVaultContext } from "./aiUtils";
import { prisma, jarvisState } from "../database";

// ─── Types ───────────────────────────────────────────────────────────────────

export type VoiceState = "IDLE" | "LISTENING" | "PROCESSING" | "SPEAKING";

interface ConversationTurn {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
}

interface VoiceSession {
    id: string;
    state: VoiceState;
    conversationBuffer: ConversationTurn[];
    abortController: AbortController | null;
    ttsAborted: boolean;
    ws: WebSocket;
    createdAt: number;
    partialResponse: string;
}

// ─── Session Store ───────────────────────────────────────────────────────────

const sessions = new Map<string, VoiceSession>();

const MAX_CONVERSATION_BUFFER = 15;
const SILENCE_TIMEOUT_MS = 60000; // Auto-close idle sessions after 60s

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sendJSON(ws: WebSocket, data: Record<string, any>) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

function float32ToWav(samples: Float32Array, sampleRate: number = 16000): Buffer {
    const length = samples.length;
    const buffer = Buffer.alloc(44 + length * 2);

    // RIFF header
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(36 + length * 2, 4);
    buffer.write("WAVE", 8);

    // fmt sub-chunk
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16);       // Sub-chunk size
    buffer.writeUInt16LE(1, 20);        // PCM format
    buffer.writeUInt16LE(1, 22);        // Mono
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate
    buffer.writeUInt16LE(2, 32);        // Block align
    buffer.writeUInt16LE(16, 34);       // Bits per sample

    // Data sub-chunk
    buffer.write("data", 36);
    buffer.writeUInt32LE(length * 2, 40);

    for (let i = 0; i < length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        buffer.writeInt16LE(s < 0 ? s * 0x8000 : s * 0x7FFF, 44 + i * 2);
    }

    return buffer;
}

// ─── STT via Groq Whisper ────────────────────────────────────────────────────

async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
    const groqApiKey = process.env.GROQ_API_KEY?.trim();
    if (!groqApiKey) {
        throw new Error("GROQ_API_KEY not configured for STT");
    }

    // Build multipart/form-data manually
    const boundary = `----VoiceBoundary${Date.now()}`;
    const fileName = "audio.wav";

    const preamble = Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
        `Content-Type: audio/wav\r\n\r\n`
    );
    const midPart = Buffer.from(
        `\r\n--${boundary}\r\n` +
        `Content-Disposition: form-data; name="model"\r\n\r\n` +
        `whisper-large-v3-turbo\r\n` +
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="language"\r\n\r\n` +
        `pt\r\n` +
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="response_format"\r\n\r\n` +
        `json\r\n` +
        `--${boundary}--\r\n`
    );

    const body = Buffer.concat([preamble, audioBuffer, midPart]);

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${groqApiKey}`,
            "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body: body,
        signal: AbortSignal.timeout(15000),
    } as any);

    if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`Whisper STT failed (${response.status}): ${errText}`);
    }

    const data = await response.json() as any;
    return (data.text || "").trim();
}

// ─── LLM Streaming via Groq ─────────────────────────────────────────────────

async function* streamLLMResponse(
    session: VoiceSession,
    userMessage: string,
    abortSignal: AbortSignal
): AsyncGenerator<string> {
    const groqApiKey = process.env.GROQ_API_KEY?.trim();
    if (!groqApiKey) {
        yield "Senhor, a chave GROQ_API_KEY não está configurada.";
        return;
    }

    // Build context (reuses existing aiUtils pipeline)
    let contextPrompt = getRelevantVaultContext(jarvisState.obsidianNotes, userMessage);

    // Inject agenda context
    contextPrompt += `\n[MEMÓRIA DE CURTO PRAZO - AGENDA]:\n`;
    try {
        const agendaList = await prisma.agenda.findMany();
        if (agendaList.length > 0) {
            const nowTime = Date.now();
            const pastWeekTime = nowTime - (7 * 24 * 60 * 60 * 1000);
            const relevantAgenda = agendaList.filter((item: any) => new Date(item.datetime).getTime() >= pastWeekTime);
            if (relevantAgenda.length > 0) {
                relevantAgenda.forEach((item: any) => {
                    contextPrompt += `- ${item.title} | ${item.datetime} | ${item.category || "Geral"}\n`;
                });
            } else {
                contextPrompt += `*(Nenhum evento recente)*\n`;
            }
        }
    } catch { /* DB not available */ }

    // Inject finances context  
    contextPrompt += `\n[MEMÓRIA DE CURTO PRAZO - FINANÇAS]:\n`;
    try {
        const financesList = await prisma.finance.findMany();
        if (financesList.length > 0) {
            const relevantFinances = financesList.slice(-30);
            relevantFinances.forEach((item: any) => {
                contextPrompt += `- R$ ${parseFloat(item.value).toFixed(2)} | ${item.category} | ${item.description}\n`;
            });
        }
    } catch { /* DB not available */ }

    contextPrompt += `\n[MENSAGEM ATUAL DO USUÁRIO]:\n${userMessage}`;

    const currentTime = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const selectedP = jarvisState.activePersona || "jarvis";
    const personaDetails = AI_PERSONAS[selectedP] || AI_PERSONAS.jarvis;

    const systemInstruction =
        `[IDENTIDADE E PAPEL]\n${personaDetails.prompt}\n\n` +
        `[CONTEXTO TEMPORAL]\nData e Hora: ${currentTime} (Brasília/SP)\n\n` +
        `[REGRAS]\n` +
        `1. Responda de forma CURTA e DIRETA — esta é uma conversa por voz, não texto.\n` +
        `2. Evite markdown, listas longas e formatação visual.\n` +
        `3. Seja natural e conversacional como se estivesse falando ao vivo.\n` +
        `4. Nunca resuma agenda/finanças a menos que perguntado.\n` +
        `5. Use "senhor" naturalmente.\n` +
        `6. Para comandos XML, emita-os mas mantenha a resposta verbal curta.\n\n` +
        `[COMANDOS XML DISPONÍVEIS]\n` +
        `- Agenda: <command type="Agenda" title="..." datetime="..." />\n` +
        `- Finanças: <command type="Finance" financeType="Despesa|Receita" value="..." category="..." description="..." />\n` +
        `- IoT: <command type="IoT" action="..." />\n` +
        `- PC: <command type="LocalPC" action="..." target="..." />\n`;

    // Build history from session buffer
    const historyMessages = session.conversationBuffer.map(turn => ({
        role: turn.role,
        content: turn.content,
    }));

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqApiKey}`,
        },
        signal: abortSignal,
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemInstruction },
                ...historyMessages,
                { role: "user", content: contextPrompt },
            ],
            temperature: 0.7,
            stream: true,
        }),
    });

    if (!groqRes.ok) {
        const errText = await groqRes.text().catch(() => "");
        yield `Erro na conexão com Groq: ${groqRes.status}`;
        return;
    }

    // Parse SSE stream
    const reader = (groqRes.body as any)?.getReader?.();
    if (!reader) {
        yield "Streaming não suportado nesta versão do Node.";
        return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (!trimmed.startsWith("data: ")) continue;

            try {
                const json = JSON.parse(trimmed.slice(6));
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) {
                    yield delta;
                }
            } catch {
                // Skip malformed SSE chunks
            }
        }
    }
}

// ─── TTS Generation & Streaming ──────────────────────────────────────────────

async function streamTTSToClient(session: VoiceSession, text: string): Promise<void> {
    if (session.ttsAborted || session.ws.readyState !== WebSocket.OPEN) return;

    // Clean XML commands and markdown from text before TTS
    const cleanText = (text || "")
        .replace(/<command[^>]*\/>/g, "")
        .replace(/[*#_`]/g, "")
        .replace(/```[\s\S]*?```/g, "")
        .trim();

    if (!cleanText || cleanText.length < 2) return;

    try {
        const selectedP = jarvisState.activePersona || "jarvis";
        let voice = "pt-BR-AntonioNeural";
        if (selectedP === "friday" || selectedP === "glados") {
            voice = "pt-BR-FranciscaNeural";
        }

        const tts = new EdgeTTS({
            voice: voice,
            lang: "pt-BR",
            outputFormat: "audio-24khz-48kbitrate-mono-mp3",
            rate: "+10%",
        });

        const audioData = await tts.toBuffer();

        if (session.ttsAborted || session.ws.readyState !== WebSocket.OPEN) return;

        // Send audio as binary frame
        sendJSON(session.ws, { event: "tts_start", textLength: cleanText.length });
        session.ws.send(audioData, { binary: true });
        sendJSON(session.ws, { event: "tts_end" });
    } catch (err: any) {
        console.error("[Voice TTS] Error:", err.message);
        sendJSON(session.ws, { event: "tts_error", error: err.message });
    }
}

// ─── Process Voice Turn ──────────────────────────────────────────────────────

async function processVoiceTurn(session: VoiceSession, audioBuffer: Buffer) {
    // STATE: PROCESSING
    session.state = "PROCESSING";
    sendJSON(session.ws, { event: "state", state: "PROCESSING" });

    try {
        // 1. STT — Transcribe audio
        const startSTT = Date.now();
        const transcript = await transcribeAudio(audioBuffer);
        const sttLatency = Date.now() - startSTT;

        if (!transcript || transcript.length < 2) {
            session.state = "LISTENING";
            sendJSON(session.ws, { event: "state", state: "LISTENING" });
            return;
        }

        sendJSON(session.ws, {
            event: "transcript",
            text: transcript,
            sttLatency,
        });

        // Add user message to conversation buffer
        session.conversationBuffer.push({
            role: "user",
            content: transcript,
            timestamp: Date.now(),
        });

        // Trim buffer to max size
        while (session.conversationBuffer.length > MAX_CONVERSATION_BUFFER) {
            session.conversationBuffer.shift();
        }

        // 2. LLM — Stream response
        session.abortController = new AbortController();
        session.ttsAborted = false;
        const startLLM = Date.now();
        let fullResponse = "";
        let sentenceBuffer = "";

        // STATE: SPEAKING (start as soon as LLM begins responding)
        let firstChunk = true;

        for await (const chunk of streamLLMResponse(session, transcript, session.abortController.signal)) {
            if (session.ttsAborted) break;

            fullResponse += chunk;
            sentenceBuffer += chunk;
            session.partialResponse = fullResponse;

            if (firstChunk) {
                const llmLatency = Date.now() - startLLM;
                session.state = "SPEAKING";
                sendJSON(session.ws, {
                    event: "state",
                    state: "SPEAKING",
                    llmLatency,
                });
                firstChunk = false;
            }

            // Send text chunk to client for display
            sendJSON(session.ws, { event: "llm_chunk", text: chunk });

            // When we accumulate a sentence, generate TTS for it
            const sentenceEnd = /[.!?\n]/.test(chunk);
            if (sentenceEnd && sentenceBuffer.trim().length > 10) {
                await streamTTSToClient(session, sentenceBuffer.trim());
                sentenceBuffer = "";
            }
        }

        // Send remaining text as TTS
        if (sentenceBuffer.trim().length > 2 && !session.ttsAborted) {
            await streamTTSToClient(session, sentenceBuffer.trim());
        }

        // Add assistant response to conversation buffer
        if (fullResponse.trim()) {
            session.conversationBuffer.push({
                role: "assistant",
                content: fullResponse,
                timestamp: Date.now(),
            });

            while (session.conversationBuffer.length > MAX_CONVERSATION_BUFFER) {
                session.conversationBuffer.shift();
            }
        }

        // Also store in jarvisState for cross-session persistence
        if (fullResponse.trim()) {
            jarvisState.conversations.push(
                { sender: "You", text: transcript, timestamp: new Date().toISOString() },
                { sender: "JARVIS", text: fullResponse, timestamp: new Date().toISOString() },
            );
        }

        sendJSON(session.ws, {
            event: "turn_complete",
            fullResponse,
            commands: extractXMLCommands(fullResponse),
        });

        // Process XML commands server-side (broadcast LocalPC commands)
        processServerCommands(fullResponse);

    } catch (err: any) {
        if (err.name === "AbortError") {
            // Interrupted — save partial response
            if (session.partialResponse) {
                session.conversationBuffer.push({
                    role: "assistant",
                    content: session.partialResponse + " [interrompido]",
                    timestamp: Date.now(),
                });
            }
            sendJSON(session.ws, { event: "interrupted", partialText: session.partialResponse });
        } else {
            console.error("[Voice] Processing error:", err.message);
            sendJSON(session.ws, { event: "error", message: err.message });
        }
    }

    // Return to LISTENING state
    if (session.ws.readyState === WebSocket.OPEN) {
        session.state = "LISTENING";
        sendJSON(session.ws, { event: "state", state: "LISTENING" });
    }
}

// ─── Command Extraction ──────────────────────────────────────────────────────

function extractXMLCommands(text: string): any[] {
    const commands: any[] = [];
    const regex = /<command\s+([^>]+)\/>/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const attrs: Record<string, string> = {};
        const attrRegex = /(\w+)="([^"]+)"/g;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(match[1])) !== null) {
            attrs[attrMatch[1]] = attrMatch[2];
        }
        commands.push(attrs);
    }
    return commands;
}

function processServerCommands(responseText: string) {
    // Broadcast LocalPC commands to connected desktop clients
    const pcCommandRegex = /<command\s+type="LocalPC"\s+action="([^"]+)"(?:\s+target="([^"]+)")?\s*\/>/gi;
    let pcMatch;
    while ((pcMatch = pcCommandRegex.exec(responseText || "")) !== null) {
        if ((global as any).wssRelay) {
            const payload = JSON.stringify({ type: "LocalPC", action: pcMatch[1], target: pcMatch[2] || "" });
            (global as any).wssRelay.clients.forEach((client: any) => {
                if (client.readyState === 1) {
                    client.send(payload);
                }
            });
        }
    }

    // Process Obsidian updates
    const updateRegex = /```obsidian-update\s*\npath:\s*([^\n]+)\ncontent:\s*\n([\s\S]*?)(?:```|$)/g;
    let obsMatch;
    while ((obsMatch = updateRegex.exec(responseText)) !== null) {
        const parsedPath = obsMatch[1].trim();
        const parsedContent = obsMatch[2].trim();
        const existingNote = jarvisState.obsidianNotes.find((n: any) => n.path === parsedPath);
        if (existingNote) {
            existingNote.content = parsedContent;
        } else {
            jarvisState.obsidianNotes.push({ path: parsedPath, content: parsedContent });
        }
    }
}

// ─── WebSocket Server Init ───────────────────────────────────────────────────

export function initVoiceWSS(server: HTTPServer): WebSocketServer {
    const wss = new WebSocketServer({ server, path: "/ws/voice" });

    console.log("[Voice WSS] WebSocket voice server mounted on /ws/voice");

    wss.on("connection", (ws: WebSocket) => {
        const sessionId = crypto.randomUUID();
        const session: VoiceSession = {
            id: sessionId,
            state: "IDLE",
            conversationBuffer: [],
            abortController: null,
            ttsAborted: false,
            ws,
            createdAt: Date.now(),
            partialResponse: "",
        };

        sessions.set(sessionId, session);
        console.log(`[Voice] Session ${sessionId} connected`);

        sendJSON(ws, {
            event: "connected",
            sessionId,
            state: "IDLE",
        });

        // Idle timeout
        let idleTimer = setTimeout(() => {
            sendJSON(ws, { event: "timeout" });
            ws.close();
        }, SILENCE_TIMEOUT_MS);

        const resetIdleTimer = () => {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                sendJSON(ws, { event: "timeout" });
                ws.close();
            }, SILENCE_TIMEOUT_MS);
        };

        ws.on("message", async (data: Buffer | string) => {
            resetIdleTimer();

            // Binary data = audio from client
            if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
                const audioBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

                if (session.state === "IDLE" || session.state === "LISTENING") {
                    session.state = "LISTENING";
                    processVoiceTurn(session, audioBuffer);
                }
                return;
            }

            // JSON message
            try {
                const msg = JSON.parse(data.toString());

                switch (msg.action) {
                    case "start_listening":
                        session.state = "LISTENING";
                        sendJSON(ws, { event: "state", state: "LISTENING" });
                        break;

                    case "interrupt":
                        console.log(`[Voice] Session ${sessionId} interrupted`);
                        session.ttsAborted = true;
                        if (session.abortController) {
                            session.abortController.abort();
                            session.abortController = null;
                        }
                        session.state = "LISTENING";
                        sendJSON(ws, { event: "state", state: "LISTENING" });
                        break;

                    case "stop":
                        session.state = "IDLE";
                        session.ttsAborted = true;
                        if (session.abortController) {
                            session.abortController.abort();
                            session.abortController = null;
                        }
                        sendJSON(ws, { event: "state", state: "IDLE" });
                        break;

                    default:
                        break;
                }
            } catch {
                // Not JSON, might be binary-like string — ignore
            }
        });

        ws.on("close", () => {
            console.log(`[Voice] Session ${sessionId} disconnected`);
            clearTimeout(idleTimer);

            // Save conversation summary to database if there were exchanges
            if (session.conversationBuffer.length > 0) {
                saveSessionSummary(session).catch(err => {
                    console.error("[Voice] Failed to save session summary:", err.message);
                });
            }

            sessions.delete(sessionId);
        });

        ws.on("error", (err) => {
            console.error(`[Voice] Session ${sessionId} error:`, err.message);
            sessions.delete(sessionId);
        });
    });

    return wss;
}

// ─── Session Summary Persistence ─────────────────────────────────────────────

async function saveSessionSummary(session: VoiceSession) {
    if (session.conversationBuffer.length === 0) return;

    const summary = session.conversationBuffer
        .map(t => `${t.role === "user" ? "Usuário" : "Jarvis"}: ${t.content}`)
        .join("\n");

    const duration = Date.now() - session.createdAt;

    console.log(`[Voice] Session ${session.id} saved (${session.conversationBuffer.length} turns, ${Math.round(duration / 1000)}s)`);

    // The conversation turns are already pushed to jarvisState.conversations
    // during processVoiceTurn, so they persist normally via the existing DB mechanism.
}
