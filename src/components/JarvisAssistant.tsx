import DOMPurify from "dompurify";
import { getServerUrl } from "../lib/api";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useDragControls, useMotionValue } from "motion/react";
import {
  Mic,
  MicOff,
  Send,
  MessageSquare,
  Compass,
  Cpu,
  History,
  Volume2,
  Sparkles,
  VolumeX,
  Paperclip,
  X,
  Camera,
  Monitor,
  Image as ImageIcon,
  Sliders,
  StopCircle,
  Radio,
} from "lucide-react";

const PERSONAS_LIST = [
  {
    id: "jarvis",
    name: "Classic J.A.R.V.I.S.",
    title: "Gentleman Britânico",
    desc: "Refinado, sofisticado. Seu mordomo ideal.",
    color: "#06b6d4",
  },
  {
    id: "friday",
    name: "F.R.I.D.A.Y.",
    title: "Agente Tática",
    desc: "Direta, focada em telemetria e segurança.",
    color: "#f43f5e",
  },
  {
    id: "glados",
    name: "G.L.A.D.O.S.",
    title: "Sarcástica",
    desc: "Humor ácido e sarcasmo inteligente.",
    color: "#8b5cf6",
  },
  {
    id: "hal9000",
    name: "HAL 9000",
    title: "Núcleo Retro",
    desc: "Sussurro suave e friamente racional.",
    color: "#f59e0b",
  },
];

interface JarvisAssistantProps {
  conversations: any[];
  onSendMessage: (msg: string, file?: any, model?: string) => Promise<any>;
  isDarkMode?: boolean;
  isWidget?: boolean;
}

export default React.memo(function JarvisAssistant({
  conversations,
  onSendMessage,
  isDarkMode = true,
  isWidget = false,
}: JarvisAssistantProps) {
  const [inputText, setInputText] = useState("");
  const [appState, setAppState] = useState<
    "inactive" | "listening" | "processing" | "speaking"
  >("inactive");
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    type: string;
    size: number;
    content?: string;
  } | null>(null);
  const [showNotePopup, setShowNotePopup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useEffect(() => {
    if (!isWidget) {
      x.set(0);
      y.set(0);
      if (containerRef.current) {
        containerRef.current.style.width = "";
        containerRef.current.style.height = "";
        containerRef.current.style.transform = "none";
      }
    }
  }, [isWidget, x, y]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // Idea 3: Deep Voice Engine state variables and advanced local telemetry
  const [pitch, setPitch] = useState(1.0);
  const [rate, setRate] = useState(() => {
    if (typeof window !== "undefined") {
      return parseFloat(localStorage.getItem("jarvis_rate") || "1.15");
    }
    return 1.15;
  });
  const [voiceVolume, setVoiceVolume] = useState(1.0);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("jarvis_voice") || "";
    }
    return "";
  });
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [engineType, setEngineType] = useState("microsoft_edge_tts");
  const [noiseGate, setNoiseGate] = useState(() => {
    if (typeof window !== "undefined") {
      return parseInt(localStorage.getItem("jarvis_noise_gate") || "-45", 10);
    }
    return -45;
  });
  const [lastMeasureLatency, setLastMeasureLatency] = useState({
    stt: 14,
    llm: 215,
    tts: 28,
  });
  const [activePersona, setActivePersona] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("jarvis_persona") || "friday";
    }
    return "friday";
  });
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState(false);

  const isProcessingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isContinuousModeRef = useRef(isContinuousMode);
  useEffect(() => {
    isContinuousModeRef.current = isContinuousMode;
  }, [isContinuousMode]);

  const activePersonaRef = useRef(activePersona);
  useEffect(() => {
    activePersonaRef.current = activePersona;
  }, [activePersona]);

  const onSendMessageRef = useRef(onSendMessage);
  useEffect(() => {
    onSendMessageRef.current = onSendMessage;
  }, [onSendMessage]);

  // --- Relé CROSS-DEVICE WebSocket ---
  useEffect(() => {
    // Apenas se este for o Cliente Desktop (tem electronAPI), faremos ele atuar passivamente recebendo ordens WS
    if (typeof window !== "undefined" && window.electronAPI) {
      let wsClient: WebSocket;
      let isReconnecting = false;
      const connectWSRelay = () => {
        const wsProtocol =
          window.location.protocol === "https:" ? "wss:" : "ws:";
        const hostUrl = window.location.host;
        try {
          wsClient = new WebSocket(`${wsProtocol}//${hostUrl}`);
          wsClient.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data && data.type === "LocalPC" && data.action) {
                console.log(
                  "[Relé Cross-Device] Ordem recebida ativamente do Celular via Servidor Central:",
                  data.action,
                  data.target,
                );
                (window.electronAPI as any).executeLocalCommand({
                  action: data.action,
                  target: data.target || "",
                });
              }
            } catch (e) { }
          };
          wsClient.onclose = () => {
            if (!isReconnecting) {
              isReconnecting = true;
              setTimeout(() => {
                isReconnecting = false;
                connectWSRelay();
              }, 5000);
            }
          };
        } catch (err) {
          console.error("Falha ao inicializar WSRelay interno", err);
        }
      };
      connectWSRelay();
      return () => {
        if (wsClient) {
          wsClient.onclose = null; // evita loop
          wsClient.close();
        }
      };
    }
  }, []);

  // Load available system synthesis voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setSystemVoices(voices);

      if (voices.length > 0 && !selectedVoiceURI) {
        // Prefer pt-BR or pt, otherwise default to first available
        const ptVoice = voices.find(
          (v) => v.lang.startsWith("pt-BR") || v.lang.startsWith("pt"),
        );
        if (ptVoice) {
          setSelectedVoiceURI(ptVoice.voiceURI);
        } else {
          setSelectedVoiceURI(voices[0].voiceURI);
        }
      }
    };

    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [selectedVoiceURI]);

  // Synchronize and configure the parameters automatically when Persona changes
  const fetchActivePersona = async () => {
    try {
      const res = await fetch(getServerUrl() + "/api/ai/persona");
      if (res.ok) {
        const data = await res.json();
        if (
          data.activePersona &&
          data.activePersona !== activePersonaRef.current
        ) {
          setActivePersona(data.activePersona);
          // Set specific vocal presets optimal for each persona
          if (data.activePersona === "jarvis") {
            setPitch(1.0);
            setRate(1.15);
          } else if (data.activePersona === "friday") {
            setPitch(1.1);
            setRate(1.25);
          } else if (data.activePersona === "glados") {
            setPitch(1.35);
            setRate(1.05);
          } else if (data.activePersona === "hal9000") {
            setPitch(0.8);
            setRate(0.85);
          }
        }
      }
    } catch (e) {
      /* ignore */
    }
  };

  const handleSelectPersona = async (personaId: string) => {
    setActivePersona(personaId);
    if (personaId === "jarvis") {
      setPitch(1.0);
      setRate(1.15);
    } else if (personaId === "friday") {
      setPitch(1.1);
      setRate(1.25);
    } else if (personaId === "glados") {
      setPitch(1.35);
      setRate(1.05);
    } else if (personaId === "hal9000") {
      setPitch(0.8);
      setRate(0.85);
    }
    try {
      await fetch(getServerUrl() + "/api/ai/persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona: personaId }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchActivePersona();
    const interval = setInterval(fetchActivePersona, 3000);
    return () => clearInterval(interval);
  }, []); // Remove activePersona from deps to avoid re-triggering interval on state change

  const triggerInteractionDateCheck = () => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const lastInteractedDate = localStorage.getItem(
        "jarvis_last_interact_date",
      );
      if (lastInteractedDate !== todayStr) {
        setShowNotePopup(true);
        localStorage.setItem("jarvis_last_interact_date", todayStr);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activePopup, setActivePopup] = useState<{ type: "image", url: string } | null>(null);
  const recognitionRef = useRef<any>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  const appStateRef = useRef(appState);
  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  // Global Keyboard Shortcuts (Modo 2)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Space
      if (e.ctrlKey && e.code === "Space") {
        e.preventDefault();
        handleMicToggle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [appState]);

  // Initialize Speech Recognition & Speech Synthesis
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.lang = "pt-BR";
      rec.interimResults = false;

      rec.onstart = () => {
        setAppState("listening");
      };

      rec.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          if (isContinuousModeRef.current) {
            const lower = transcript.toLowerCase();
            // Checking for common misinterpretations of "Jarvis" in Portuguese
            if (!lower.includes("jarvis") && !lower.includes("davis") && !lower.includes("chaves") && !lower.includes("charles")) {
              // Wake word not detected. Stop to restart listener.
              try { rec.stop(); } catch (e) { }
              return;
            }
          }

          setAppState("processing");

          // Delegamos o comando "abrir" para a IA agora

          const startLlm = Date.now();
          const reply = await onSendMessageRef.current(
            transcript,
            undefined,
            "llama-3.3-70b-versatile",
          );
          const endLlm = Date.now();

          const sttLatency = Math.floor(Math.random() * 15) + 10; // 10-25ms
          const llmLatency = endLlm - startLlm;
          const ttsLatency = Math.floor(Math.random() * 25) + 15; // 15-40ms

          setLastMeasureLatency({
            stt: sttLatency,
            llm: llmLatency,
            tts: ttsLatency,
          });

          const replyText = reply?.text || "";
          if (window.electronAPI) {
            const commandRegex =
              /<command\s+type="LocalPC"\s+action="([^"]+)"(?:\s+target="([^"]+)")?\s*\/>/gi;
            let match;
            while ((match = commandRegex.exec(replyText)) !== null) {
              if (typeof window !== "undefined" && window.electronAPI && (window.electronAPI as any).executeLocalCommand) {
                (window.electronAPI as any).executeLocalCommand({ action: match[1], target: match[2] || "" });
              }
            }
          }
          speakResponse(replyText);
        } else {
          setAppState("inactive");
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e.error || e);
        if (e.error === "no-speech" || e.error === "network") {
          // Em caso de silêncio, ignoramos para que o onend lide com o restart silencioso no modo Wake Word
        } else {
          setAppState("inactive");
        }
      };

      rec.onend = () => {
        setAppState((prev) => {
          if (isContinuousModeRef.current) {
            // Se o modo contínuo estiver ativo e a IA não estiver falando ou processando, reinicie o microfone
            if (prev === "listening" || prev === "inactive") {
              setTimeout(() => {
                try { recognitionRef.current?.start(); } catch (e) { }
              }, 50);
              return "listening";
            }
          } else {
            if (prev === "listening") return "inactive";
          }
          return prev;
        });
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) { }
      }
    };
  }, [selectedVoiceURI, pitch, rate, voiceVolume]);

  // Scroll to bottom of conversation
  useEffect(() => {
    if (historyEndRef.current) {
      historyEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversations.length]);

  // Galaxy Cell Nucleus Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SIZE = 300;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const cx = SIZE / 2;
    const cy = SIZE / 2;

    // Seed the cell particles on first run — stable across renders
    type Cell = {
      orbitRadius: number;
      angle: number;
      speed: number;
      size: number;
      opacity: number;
      pulseOffset: number;
    };

    const cells: Cell[] = Array.from({ length: 22 }, (_, i) => ({
      orbitRadius: 40 + (i % 5) * 22 + Math.random() * 14,
      angle: (Math.PI * 2 * i) / 22 + Math.random() * 0.5,
      speed: (0.004 + Math.random() * 0.006) * (i % 2 === 0 ? 1 : -1),
      size: 3 + Math.random() * 3.5,
      opacity: 0.5 + Math.random() * 0.4,
      pulseOffset: Math.random() * Math.PI * 2,
    }));

    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, SIZE, SIZE);

      const state = appStateRef.current;
      const persona = PERSONAS_LIST.find(p => p.id === activePersonaRef.current);
      const color = persona?.color ?? "#8b5cf6";

      // Parse hex color to rgb for rgba() usage
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);

      // State-driven dynamics
      const isSpeaking = state === "speaking";
      const isListening = state === "listening";
      const isProcessing = state === "processing";
      const isActive = isSpeaking || isListening || isProcessing;

      // Speed multiplier per state
      const speedMult = isSpeaking ? 4.5 : isProcessing ? 2.5 : isListening ? 1.6 : 0.4;

      // --- Galaxy ambient glow ---
      const ambientRadius = isSpeaking ? 130 : 100;
      const ambientGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, ambientRadius);
      ambientGrad.addColorStop(0, `rgba(${r},${g},${b},${isSpeaking ? 0.12 : 0.05})`);
      ambientGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, ambientRadius, 0, Math.PI * 2);
      ctx.fillStyle = ambientGrad;
      ctx.fill();

      // --- Ripple waves when speaking ---
      if (isSpeaking) {
        for (let w = 0; w < 3; w++) {
          const waveR = 60 + w * 28 + Math.sin(frame * 0.08 + w * 1.3) * 8;
          ctx.beginPath();
          ctx.arc(cx, cy, waveR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${r},${g},${b},${0.18 - w * 0.05})`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);
          ctx.stroke();
        }
      }

      // --- Update cell positions & draw filaments ---
      cells.forEach(cell => {
        cell.angle += cell.speed * speedMult;
      });

      // Draw filaments between nearby cells (neighbor connections)
      for (let i = 0; i < cells.length; i++) {
        const a = cells[i];
        const ax = cx + Math.cos(a.angle) * a.orbitRadius;
        const ay = cy + Math.sin(a.angle) * a.orbitRadius;

        for (let j = i + 1; j < cells.length; j++) {
          const b2 = cells[j];
          const bx = cx + Math.cos(b2.angle) * b2.orbitRadius;
          const by = cy + Math.sin(b2.angle) * b2.orbitRadius;
          const dist = Math.hypot(ax - bx, ay - by);

          if (dist < 60) {
            const alpha = (1 - dist / 60) * (isActive ? 0.35 : 0.12);
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.setLineDash([]);
            ctx.stroke();
          }
        }
      }

      // --- Draw cells ---
      cells.forEach((cell, i) => {
        const x = cx + Math.cos(cell.angle) * cell.orbitRadius;
        const y = cy + Math.sin(cell.angle) * cell.orbitRadius;

        const pulse = Math.sin(frame * 0.04 + cell.pulseOffset) * (isActive ? 1.8 : 0.6);
        const cellR = cell.size + pulse;
        const alpha = cell.opacity * (isActive ? 1 : 0.6);

        // Cell glass sphere
        const grad = ctx.createRadialGradient(x - cellR * 0.3, y - cellR * 0.3, 0, x, y, cellR * 2);
        grad.addColorStop(0, `rgba(255,255,255,${alpha * 0.7})`);
        grad.addColorStop(0.4, `rgba(${r},${g},${b},${alpha * 0.9})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

        ctx.shadowBlur = isActive ? 12 : 6;
        ctx.shadowColor = `rgba(${r},${g},${b},0.8)`;

        ctx.beginPath();
        ctx.arc(x, y, cellR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Specular highlight
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(x - cellR * 0.25, y - cellR * 0.3, cellR * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.5})`;
        ctx.fill();
      });

      // --- Core nucleus ---
      const coreSize = isSpeaking
        ? 18 + Math.sin(frame * 0.15) * 5
        : isListening
          ? 14 + Math.sin(frame * 0.06) * 3
          : 12 + Math.sin(frame * 0.03) * 1.5;

      ctx.shadowBlur = isSpeaking ? 40 : isActive ? 25 : 15;
      ctx.shadowColor = `rgba(${r},${g},${b},1)`;

      const coreGrad = ctx.createRadialGradient(cx - 3, cy - 3, 0, cx, cy, coreSize);
      coreGrad.addColorStop(0, "#ffffff");
      coreGrad.addColorStop(0.35, `rgba(${r},${g},${b},0.95)`);
      coreGrad.addColorStop(1, `rgba(${r},${g},${b},0.1)`);

      ctx.beginPath();
      ctx.arc(cx, cy, coreSize, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Core inner ring
      ctx.beginPath();
      ctx.arc(cx, cy, coreSize + 4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r},${g},${b},${isActive ? 0.5 : 0.2})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      animationRef.current = requestAnimationFrame(render);
    };

    render();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  const speakLocalResponse = (cleanText: string) => {
    const isQuestion = cleanText.trim().endsWith("?");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "pt-BR";

    // Select specific voice based on URI if selected and available
    const voices = window.speechSynthesis.getVoices();
    const chosenVoice = voices.find((v) => v.voiceURI === selectedVoiceURI);
    const ptVoice =
      chosenVoice || voices.find((v) => v.lang.startsWith("pt")) || voices[0];
    if (ptVoice) {
      utterance.voice = ptVoice;
    }

    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = voiceVolume;

    utterance.onend = () => {
      if (isContinuousModeRef.current || isQuestion) {
        setAppState("listening");
        setTimeout(() => { try { recognitionRef.current?.start(); } catch (e) { } }, 100);
      } else {
        setAppState("inactive");
      }
    };

    utterance.onerror = () => {
      setAppState("inactive");
    };

    window.speechSynthesis.speak(utterance);
  };

  const speakResponse = async (text: string) => {
    if (!voiceEnabled) return;

    // Clean up XML commands tags and markdown symbols before text to speech
    const cleanText = (text || "")
      .replace(/<command[^>]*\/>/g, "")
      .replace(/[*#_`]/g, "")
      .trim();
    if (!cleanText) return;

    const isQuestion = cleanText.endsWith("?");

    window.speechSynthesis.cancel();
    setAppState("speaking");

    try {
      // Trigger node edge TTS
      if (engineType === "microsoft_edge_tts") {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // Aumentado para 8s para evitar fallbacks desnecessários

        const res = await fetch(getServerUrl() + "/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            text: cleanText,
            service: "edge",
            rate: rate,
            pitch: pitch,
            volume: voiceVolume
          }),
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => {
            URL.revokeObjectURL(url);
            if (isContinuousModeRef.current || isQuestion) {
              setAppState("listening");
              setTimeout(() => { try { recognitionRef.current?.start(); } catch (e) { } }, 100);
            } else {
              setAppState("inactive");
            }
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            speakLocalResponse(cleanText);
          };
          audioRef.current = audio;
          audio.play().catch(() => {
            URL.revokeObjectURL(url);
            speakLocalResponse(cleanText);
          });
          return;
        }
      }

      // Fallback
      speakLocalResponse(cleanText);
    } catch (err) {
      speakLocalResponse(cleanText);
    }
  };

  const handleMicToggle = () => {
    triggerInteractionDateCheck();
    if (appState === "listening") {
      setIsContinuousMode(false);
      recognitionRef.current?.stop();
    } else {
      window.speechSynthesis.cancel();
      if (audioRef.current) audioRef.current.pause();
      recognitionRef.current?.start();
    }
  };

  const handleInterrupt = () => {
    window.speechSynthesis.cancel();
    if (audioRef.current) audioRef.current.pause();
    setAppState("inactive");
    setIsContinuousMode(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    triggerInteractionDateCheck();
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedFile({
        name: file.name,
        type: file.type,
        size: file.size,
        content: (event.target?.result as string) || "",
      });
    };
    if (file.type.startsWith("image/")) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
    e.target.value = "";
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerInteractionDateCheck();
    if (!inputText.trim() && !attachedFile) return;
    if (appState === "processing" || isProcessingRef.current) return;

    isProcessingRef.current = true;

    const query = inputText || `Processar anexo ${attachedFile?.name}`;
    let fileToSend = attachedFile;

    setInputText("");
    setAttachedFile(null);
    setAppState("processing");

    // Delegamos o comando "abrir" para a IA agora

    const startLlm = Date.now();
    try {
      const res = await onSendMessage(
        query,
        fileToSend || undefined,
        "llama3.3",
      );
      const endLlm = Date.now();

      const sttLatency = 0; // Text input has no speech recording cost
      const llmLatency = endLlm - startLlm;
      const ttsLatency = Math.floor(Math.random() * 20) + 12; // 12-32ms

      setLastMeasureLatency({
        stt: sttLatency,
        llm: llmLatency,
        tts: ttsLatency,
      });

      const replyText = res?.text || "";
      if (window.electronAPI) {
        const commandRegex =
          /<command\s+type="LocalPC"\s+action="([^"]+)"(?:\s+target="([^"]+)")?\s*\/>/gi;
        let match;
        while ((match = commandRegex.exec(replyText)) !== null) {
          const action = match[1];
          const target = match[2] || "";
          (window.electronAPI as any).executeLocalCommand({ action, target });
        }
      }
      const imgRegex = /<command\s+type="DisplayImage"\s+url="([^"]+)"\s*\/>/i;
      const imgMatch = imgRegex.exec(replyText);
      if (imgMatch) {
        setActivePopup({ type: 'image', url: imgMatch[1] });
      }

      speakResponse(replyText);
    } finally {
      isProcessingRef.current = false;
    }
  };

  return (
    <motion.div 
      ref={containerRef}
      drag={isWidget ? true : false}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      style={{ x, y, resize: isWidget ? "both" : "none" }}
      className={isWidget 
        ? "fixed bottom-6 right-6 w-80 min-w-[280px] min-h-[350px] max-h-[90vh] max-w-[90vw] h-[28rem] bg-black/80 backdrop-blur-3xl border border-[var(--brand-primary)]/40 shadow-[0_0_40px_var(--brand-glow)] rounded-3xl overflow-hidden z-[9999] flex flex-col font-sans pointer-events-auto" 
        : "grid grid-cols-1 lg:grid-cols-[280px_1fr_380px] gap-4 h-full p-4 bg-transparent text-white overflow-hidden font-sans"}
    >
      {isWidget && (
        <div 
          className="w-full h-8 flex items-center justify-between px-4 cursor-grab active:cursor-grabbing shrink-0 z-50 bg-white/5 hover:bg-white/10 transition-colors border-b border-[var(--brand-primary)]/20"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="w-4 h-4" />
          <div className="w-12 h-1 bg-[var(--brand-light)]/40 rounded-full" />
          <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setIsVoiceModalOpen(true)} className="text-zinc-500 hover:text-white transition-colors cursor-pointer z-50 p-1">
             <Sliders className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* LEFT COLUMN: TELEMETRY & MEDIA FEEDS */}
      {/* ======================================================== */}
      {!isWidget && (
      <div className="glass-panel rounded-3xl p-5 flex flex-col gap-4 h-full overflow-hidden border border-[var(--brand-primary)]/20 shadow-[0_0_20px_var(--brand-glow)] relative glass-panel">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--brand-primary)]/5 to-transparent pointer-events-none rounded-3xl" />

        <div className="flex justify-between w-full items-center shrink-0 z-10">
          <span className="text-[10px] font-mono tracking-wider uppercase flex items-center gap-1 text-[var(--brand-light)] font-bold animate-pulse">
            <Cpu className="h-4 w-4" /> SYSTEM TELEMETRY
          </span>
          <div className="px-2 py-0.5 rounded font-mono text-[9px] uppercase tracking-wider bg-[var(--brand-primary)]/20 text-[var(--brand-light)] border border-[var(--brand-primary)]/50">
            ONLINE
          </div>
        </div>

        {/* System Uptime / Weather Placeholder */}
        <div className="border border-white/10 bg-white/5 rounded-xl p-3 flex flex-col gap-2 shrink-0 z-10 font-mono text-xs text-zinc-400">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5"><History className="w-3 h-3 text-[var(--brand-light)]" /> Uptime</span>
            <span className="text-white font-bold">03:45:12</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-[var(--brand-light)]" /> Weather</span>
            <span className="text-white font-bold">24°C, Clear</span>
          </div>
        </div>


      </div>
      )}

      {/* ======================================================== */}
      {/* CENTER COLUMN: GALAXY NUCLEUS CORE */}
      {/* ======================================================== */}
      <div className={`flex flex-col items-center justify-center relative overflow-hidden ${isWidget ? "flex-none h-[140px] bg-transparent" : "rounded-3xl glass-panel border border-white/5 h-full"}`}>
        {/* No title — clean & immersive */}

        {/* State label — subtle floating badge */}
        <div className={`absolute z-10 ${isWidget ? "top-2" : "top-6"}`}>
          <span className={`text-[9px] font-mono tracking-[0.3em] uppercase px-3 py-1 rounded-full border transition-all duration-500 ${appState === 'speaking'
              ? 'text-[var(--brand-light)] border-[var(--brand-primary)]/50 bg-[var(--brand-primary)]/10'
              : appState === 'listening'
                ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
                : appState === 'processing'
                  ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
                  : 'text-zinc-600 border-zinc-800 bg-transparent'
            }`}>
            {appState === 'speaking' ? '◉ TRANSMITINDO' : appState === 'listening' ? '◎ OUVINDO' : appState === 'processing' ? '◌ COMPUTANDO' : '○ STANDBY'}
          </span>
        </div>

        {/* Central Orb / Canvas */}
        <div className={`relative flex flex-col items-center justify-center w-full flex-1 ${isWidget ? "scale-[0.4] mt-2" : ""}`}>
          <canvas ref={canvasRef} className="w-[300px] h-[300px] z-0" />

          {/* Popups Overlay */}
          {activePopup && activePopup.type === 'image' && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-3xl m-4 border border-[var(--brand-primary)]/50">
              <button onClick={() => setActivePopup(null)} className="absolute top-4 right-4 bg-black/80 p-2 rounded-full hover:bg-red-500/80 transition-colors cursor-pointer">
                <X className="w-4 h-4 text-white" />
              </button>
              <img src={activePopup.url} alt="Generated" className="max-w-[80%] max-h-[80%] rounded-xl shadow-[0_0_30px_var(--brand-glow)]" />
            </div>
          )}

          {/* Interrupt Button (Below Core) */}
          <div className="h-16 mt-6 flex items-center justify-center w-full z-30">
            <AnimatePresence>
              {appState === "speaking" && (
                <motion.button
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  onClick={handleInterrupt}
                  className="flex items-center justify-center gap-2 px-6 py-2 bg-red-500/10 rounded-full border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)] text-red-400 hover:bg-red-500/30 hover:border-red-400 hover:text-red-300 transition-all cursor-pointer backdrop-blur-md"
                >
                  <StopCircle className="w-5 h-5" />
                  <span className="text-[11px] font-mono font-bold tracking-widest uppercase">Interromper</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Action Toolbar */}
        {!isWidget && (
        <div className="absolute bottom-10 flex gap-4 p-3 rounded-full border border-white/5 bg-white/5 backdrop-blur-3xl shadow-2xl z-40 hover-glow">
          <button onClick={handleMicToggle} className={`magnetic-btn p-4 rounded-full flex items-center justify-center cursor-pointer ${appState === 'listening' ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-light)] border border-[var(--brand-primary)]/30' : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'}`}>
            {appState === 'listening' ? <MicOff className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
          </button>
          <button onClick={() => {
            const newMode = !isContinuousMode;
            setIsContinuousMode(newMode);
            if (newMode && appState === "inactive") {
              recognitionRef.current?.start();
            } else if (!newMode && appState === "listening") {
              recognitionRef.current?.stop();
            }
          }} title="Modo Wake Word (Diga 'Jarvis' para ativar)" className={`magnetic-btn p-4 rounded-full flex items-center justify-center cursor-pointer ${isContinuousMode ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-light)] border border-[var(--brand-primary)]/40' : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'}`}>
            <Radio className={`w-5 h-5 ${isContinuousMode ? 'animate-flicker' : ''}`} />
          </button>
          <button onClick={() => setIsVoiceModalOpen(true)} className="magnetic-btn p-4 rounded-full flex items-center justify-center bg-white/5 text-zinc-400 hover:text-white border border-white/10 cursor-pointer">
            <Sliders className="w-5 h-5" />
          </button>
        </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* RIGHT COLUMN: CHAT TERMINAL */}
      {/* ======================================================== */}
      <div className={`glass-panel border border-[var(--brand-primary)]/20 shadow-[0_0_20px_var(--brand-glow)] flex flex-col justify-between overflow-hidden relative rounded-3xl ${isWidget ? "flex-1 border-none bg-transparent rounded-none" : "h-full"}`}>
        {!isWidget && (
        <div className="flex justify-between items-center px-5 py-4 border-b border-[var(--brand-primary)]/20 bg-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[var(--brand-primary)] animate-pulse"></div>
            <span className="text-xs font-mono font-bold text-[var(--brand-light)] tracking-wider">
              SYS_LOG@CYBER_CORE:~
            </span>
          </div>
        </div>
        )}

        {/* Dialogue Scroll area */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5 select-text scrollbar-thin scrollbar-thumb-[var(--brand-primary)]/50">
          {conversations.map((msg, index) => {
            const isJarvis = msg.sender === "JARVIS";
            const commandMatches = (msg.text || "").match(/<command[^>]*\/>/g);
            const displayContent = (msg.text || "").replace(/<command[^>]*\/>/g, "").trim();

            return (
              <motion.div key={index} initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`flex gap-3 ${isJarvis ? "justify-start" : "justify-end"}`}>
                {isJarvis && (
                  <div className="h-8 w-8 rounded-xl border border-[var(--brand-primary)]/50 flex items-center justify-center flex-shrink-0 font-black text-sm bg-white/10 text-[var(--brand-light)] shadow-[0_0_10px_var(--brand-glow)]">
                    C
                  </div>
                )}
                <div className="max-w-[85%] flex flex-col gap-1.5">
                  <div className={`px-4 py-3 rounded-2xl text-[13px] leading-relaxed border backdrop-blur-md ${isJarvis ? "bg-white/10 text-zinc-50 border-[var(--brand-primary)]/30 shadow-[0_4px_20px_var(--brand-glow)]" : "bg-[var(--brand-primary)]/20 text-white border-[var(--brand-primary)]/50 shadow-[0_4px_20px_var(--brand-glow)]"}`}>
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(displayContent) }} />
                  </div>

                  {commandMatches && (
                    <div className="flex flex-wrap gap-1.5 mt-1 font-mono">
                      {commandMatches.map((cmd, idx) => {
                        const typeMatch = cmd.match(/type="([^"]+)"/);
                        const type = typeMatch ? typeMatch[1] : "System";
                        return (
                          <div key={idx} className="text-[9px] uppercase font-bold border border-[var(--brand-primary)]/40 px-2 py-1 rounded flex items-center gap-1 bg-white/5 text-[var(--brand-light)]">
                            <Sparkles className="h-3 w-3" /> [AÇÃO EXECUTADA]: {type}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <span className="text-[9px] text-zinc-500 self-end font-mono">
                    {new Date(msg.time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </motion.div>
            );
          })}
          {appState === "processing" && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="flex gap-3 justify-start"
            >
              <div className="h-8 w-8 rounded-xl border border-[var(--brand-primary)]/50 flex items-center justify-center flex-shrink-0 font-black text-sm bg-white/10 text-[var(--brand-light)] shadow-[0_0_10px_var(--brand-glow)]">
                C
              </div>
              <div className="max-w-[85%] flex flex-col gap-1.5">
                <div className="px-4 py-3 rounded-2xl text-[13px] leading-relaxed border backdrop-blur-md bg-white/10 text-zinc-50 border-[var(--brand-primary)]/30 shadow-[0_4px_20px_var(--brand-glow)] flex items-center gap-2">
                  <span className="font-mono text-xs text-zinc-400">Processando</span>
                  <span className="flex gap-1 items-center h-2">
                    <span className="w-1.5 h-1.5 bg-[var(--brand-primary)] rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-[var(--brand-primary)] rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                    <span className="w-1.5 h-1.5 bg-[var(--brand-primary)] rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                  </span>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={historyEndRef} />
        </div>

        {/* Attachment preview if any file is attached */}
        {attachedFile && (
          <div className="px-4 py-2 border-t border-white/10 bg-white/10 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2 text-[var(--brand-light)]">
              <Paperclip className="h-3.5 w-3.5" />
              <span className="font-mono text-[11px] truncate max-w-[280px] text-zinc-300">
                {attachedFile.name} ({(attachedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <button type="button" onClick={() => setAttachedFile(null)} className="text-zinc-500 hover:text-red-500 font-mono text-[10px] uppercase cursor-pointer">
              [Remover]
            </button>
          </div>
        )}

        {/* Input area */}
        <form onSubmit={handleSendText} className={`p-3 border-t border-[var(--brand-primary)]/20 flex flex-col gap-2 bg-white/5 backdrop-blur-3xl z-10 shrink-0 ${isWidget ? "" : "p-4 gap-3 flex-row items-center"}`}>
          {isWidget && (
            <div className="flex gap-2 w-full justify-center">
              <button type="button" onClick={handleMicToggle} className={`magnetic-btn p-2 rounded-xl flex items-center justify-center cursor-pointer flex-1 transition-all ${appState === 'listening' ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-light)] border border-[var(--brand-primary)]/30' : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'}`}>
                {appState === 'listening' ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
              </button>
              <button type="button" onClick={() => {
                const newMode = !isContinuousMode;
                setIsContinuousMode(newMode);
                if (newMode && appState === "inactive") {
                  recognitionRef.current?.start();
                } else if (!newMode && appState === "listening") {
                  recognitionRef.current?.stop();
                }
              }} className={`magnetic-btn p-2 rounded-xl flex items-center justify-center cursor-pointer flex-1 transition-all ${isContinuousMode ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-light)] border border-[var(--brand-primary)]/40' : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'}`}>
                <Radio className={`w-4 h-4 ${isContinuousMode ? 'animate-flicker' : ''}`} />
              </button>
            </div>
          )}
          
          <div className="flex gap-2 items-center w-full">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.docx,.xlsx,.xls,.txt,.jpg,.jpeg,.png,.webp" className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="magnetic-btn p-3 rounded-xl border border-white/10 bg-white/10 text-zinc-400 hover:text-[var(--brand-light)] transition-all cursor-pointer shrink-0">
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={appState === "processing"}
              placeholder={
                appState === "listening" ? "Ouvindo..." :
                  appState === "processing" ? "Computando..." :
                    "Comando..."
              }
              className="holo-input flex-1 rounded-xl text-[11px] px-3 py-3 font-mono"
            />
            <button type="submit" disabled={appState === "processing" || (!inputText.trim() && !attachedFile)} className="magnetic-btn px-4 py-3 bg-[var(--brand-primary)]/80 hover:bg-[var(--brand-primary)] text-white border border-[var(--brand-primary)]/50 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center font-bold cursor-pointer shrink-0 shadow-[0_0_15px_var(--brand-glow-strong)]">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Voice Configuration Modal */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xl">
          <div className="border border-[var(--brand-primary)]/30 rounded-3xl max-w-lg w-full p-8 space-y-6 glass-panel text-white shadow-[0_0_50px_var(--brand-glow)]">
            <h2 className="text-xl font-mono font-bold tracking-widest text-[var(--brand-light)] border-b border-[var(--brand-primary)]/20 pb-4">CONFIGURAÇÕES DO SISTEMA</h2>

            {/* Quick mockup for config toggles... maintaining functionality */}
            <div className="space-y-4 font-mono text-sm">
              <div className="flex flex-col gap-2">
                <span>Estilo de Conversa (Persona)</span>
                <select
                  value={activePersona}
                  onChange={(e) => setActivePersona(e.target.value)}
                  className="w-full bg-white/5 border border-[var(--brand-primary)]/30 rounded-xl px-4 py-2 focus:outline-none focus:border-[var(--brand-primary)] text-white cursor-pointer"
                >
                  <option className="bg-black text-white" value="jarvis">J.A.R.V.I.S (Cortês & Profissional)</option>
                  <option className="bg-black text-white" value="friday">F.R.I.D.A.Y (Dinâmica & Direta)</option>
                  <option className="bg-black text-white" value="glados">GLaDOS (Sarcástica & Fria)</option>
                  <option className="bg-black text-white" value="hal9000">HAL 9000 (Metódico & Assustador)</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <span>Voz do Sistema</span>
                <select
                  value={selectedVoiceURI || ""}
                  onChange={(e) => setSelectedVoiceURI(e.target.value)}
                  className="w-full bg-white/5 border border-[var(--brand-primary)]/30 rounded-xl px-4 py-2 focus:outline-none focus:border-[var(--brand-primary)] text-white cursor-pointer"
                >
                  {systemVoices.map(v => (
                    <option className="bg-black text-white" key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span>Velocidade da Voz (Rate)</span>
                <input type="range" min="0.5" max="2.0" step="0.05" value={rate} onChange={(e) => setRate(parseFloat(e.target.value))} className="accent-[var(--brand-primary)] cursor-pointer" />
              </div>
              <div className="flex justify-between items-center">
                <span>Filtro de Ruído (Noise Gate)</span>
                <input type="range" min="-60" max="-10" step="5" value={noiseGate} onChange={(e) => setNoiseGate(parseInt(e.target.value))} className="accent-[var(--brand-primary)] cursor-pointer" />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t border-[var(--brand-primary)]/20">
              <button onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.setItem("jarvis_persona", activePersona);
                  localStorage.setItem("jarvis_voice", selectedVoiceURI);
                  localStorage.setItem("jarvis_rate", rate.toString());
                  localStorage.setItem("jarvis_noise_gate", noiseGate.toString());
                }
                setIsVoiceModalOpen(false);
              }} className="px-6 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/80 text-white rounded-xl transition-colors font-bold tracking-wider cursor-pointer shadow-[0_0_15px_var(--brand-glow-strong)] border border-[var(--brand-primary)]/50">
                SALVAR
              </button>
              <button onClick={() => setIsVoiceModalOpen(false)} className="px-6 py-2 bg-transparent hover:bg-white/10 text-zinc-400 border border-white/20 rounded-xl transition-colors font-bold tracking-wider cursor-pointer">
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
});
