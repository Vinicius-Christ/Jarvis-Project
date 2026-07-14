/**
 * voiceSocket.ts — WebSocket Voice Client
 * 
 * Manages the connection to the backend voice session.
 * Exposes methods to send raw PCM audio buffers and handles incoming
 * TTS audio buffers, transcripts, and state updates.
 */

export type VoiceState = "IDLE" | "LISTENING" | "PROCESSING" | "SPEAKING";

interface VoiceSocketOptions {
    onStateChange?: (state: VoiceState) => void;
    onTranscript?: (text: string) => void;
    onLLMChunk?: (text: string) => void;
    onAudioChunk?: (buffer: ArrayBuffer) => void;
    onCommand?: (commands: any[]) => void;
    onError?: (error: string) => void;
}

export class VoiceSocket {
    private ws: WebSocket | null = null;
    private options: VoiceSocketOptions;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private forceClose = false;

    constructor(options: VoiceSocketOptions) {
        this.options = options;
    }

    public connect() {
        this.forceClose = false;
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        const url = `${protocol}//${host}/ws/voice`;

        this.ws = new WebSocket(url);
        this.ws.binaryType = "arraybuffer";

        this.ws.onopen = () => {
            console.log("[Voice WS] Connected to backend");
            this.reconnectAttempts = 0;
        };

        this.ws.onmessage = (event) => {
            // Audio chunk from backend
            if (event.data instanceof ArrayBuffer) {
                if (this.options.onAudioChunk) {
                    this.options.onAudioChunk(event.data);
                }
                return;
            }

            // JSON message
            try {
                const msg = JSON.parse(event.data);

                switch (msg.event) {
                    case "connected":
                        if (this.options.onStateChange) this.options.onStateChange(msg.state);
                        break;

                    case "state":
                        if (this.options.onStateChange) this.options.onStateChange(msg.state);
                        break;

                    case "transcript":
                        if (this.options.onTranscript) this.options.onTranscript(msg.text);
                        break;

                    case "llm_chunk":
                        if (this.options.onLLMChunk) this.options.onLLMChunk(msg.text);
                        break;

                    case "turn_complete":
                        if (this.options.onCommand && msg.commands) {
                            this.options.onCommand(msg.commands);
                        }
                        break;

                    case "interrupted":
                        // The backend confirmed it aborted the TTS
                        if (this.options.onStateChange) this.options.onStateChange("LISTENING");
                        break;

                    case "error":
                        if (this.options.onError) this.options.onError(msg.message);
                        break;
                }
            } catch (err) {
                // Ignore unparseable
            }
        };

        this.ws.onclose = () => {
            this.ws = null;
            if (!this.forceClose) {
                this.attemptReconnect();
            }
        };

        this.ws.onerror = (err) => {
            console.error("[Voice WS] Error:", err);
        };
    }

    public disconnect() {
        this.forceClose = true;
        if (this.ws) {
            this.sendJSON({ action: "stop" });
            this.ws.close();
            this.ws = null;
        }
    }

    public sendAudio(wavBuffer: ArrayBuffer) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(wavBuffer);
        }
    }

    public sendInterrupt() {
        this.sendJSON({ action: "interrupt" });
    }

    public startListening() {
        this.sendJSON({ action: "start_listening" });
    }

    private sendJSON(data: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    private attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            if (this.options.onError) this.options.onError("Falha ao reconectar ao servidor de voz.");
            return;
        }
        this.reconnectAttempts++;
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
        console.log(`[Voice WS] Reconnecting in ${delay}ms...`);
        setTimeout(() => this.connect(), delay);
    }
}
