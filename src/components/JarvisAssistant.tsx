import DOMPurify from "dompurify";
import { getServerUrl } from "../lib/api";
import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
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
}

export default React.memo(function JarvisAssistant({
  conversations,
  onSendMessage,
  isDarkMode = true,
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
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // Idea 3: Deep Voice Engine state variables and advanced local telemetry
  const [pitch, setPitch] = useState(1.0);
  const [rate, setRate] = useState(1.15);
  const [voiceVolume, setVoiceVolume] = useState(1.0);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [engineType, setEngineType] = useState("microsoft_edge_tts");
  const [noiseGate, setNoiseGate] = useState(-45);
  const [lastMeasureLatency, setLastMeasureLatency] = useState({
    stt: 14,
    llm: 215,
    tts: 28,
  });
  const [activePersona, setActivePersona] = useState("friday");
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  const isProcessingRef = useRef(false);

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
                window.electronAPI.executeLocalCommand({
                  action: data.action,
                  target: data.target || "",
                });
              }
            } catch (e) {}
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
  
  // CYBER Dashboard Media Refs
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const [mediaMode, setMediaMode] = useState<"none" | "camera" | "screen">("none");
  const [activePopup, setActivePopup] = useState<{ type: "image", url: string } | null>(null);

  // Stop current media streams helper
  const stopMediaTracks = () => {
    if (cameraVideoRef.current && cameraVideoRef.current.srcObject) {
      const stream = cameraVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      cameraVideoRef.current.srcObject = null;
    }
    if (screenVideoRef.current && screenVideoRef.current.srcObject) {
      const stream = screenVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      screenVideoRef.current.srcObject = null;
    }
  };

  const toggleCameraMode = async () => {
    if (mediaMode === "camera") {
      stopMediaTracks();
      setMediaMode("none");
      return;
    }
    try {
      stopMediaTracks();
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        setMediaMode("camera");
      }
    } catch (e) {
      console.error("Camera access denied", e);
    }
  };

  const toggleScreenMode = async () => {
    if (mediaMode === "screen") {
      stopMediaTracks();
      setMediaMode("none");
      return;
    }
    try {
      stopMediaTracks();
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
        setMediaMode("screen");
      }
      stream.getVideoTracks()[0].onended = () => {
        setMediaMode("none");
        stopMediaTracks();
      };
    } catch (e) {
      console.error("Screen share access denied", e);
    }
  };

  // Extract base64 frame from active video
  const captureFrame = (): string | null => {
    const video = mediaMode === "camera" ? cameraVideoRef.current : mediaMode === "screen" ? screenVideoRef.current : null;
    if (!video || !video.srcObject) return null;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const ctx = tempCanvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
      return tempCanvas.toDataURL("image/jpeg", 0.7);
    }
    return null;
  };
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
              const action = match[1];
              const target = match[2] || "";
              window.electronAPI.executeLocalCommand({ action, target });
            }
          }
          speakResponse(replyText);
        } else {
          setAppState("inactive");
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        setAppState("inactive");
      };

      rec.onend = () => {
        // Only return to inactive if we didn't initiate processing/speaking
        setAppState((prev) => (prev === "listening" ? "inactive" : prev));
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [selectedVoiceURI, pitch, rate, voiceVolume]);

  // Scroll to bottom of conversation
  useEffect(() => {
    if (historyEndRef.current) {
      historyEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversations.length]);

  // Animated canvas circles resembling Tony Stark's HUD
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = (canvas.width = 180);
    const height = (canvas.height = 180);
    const particles: {
      angle: number;
      radius: number;
      size: number;
      speed: number;
      phase: number;
    }[] = [];

    // Initialize 80 particles in circular tracks
    for (let i = 0; i < 90; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: 25 + Math.random() * 40,
        size: 1 + Math.random() * 1.5,
        speed: 0.01 + Math.random() * 0.02,
        phase: Math.random() * Math.PI * 2,
      });
    }

    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const currentState = appStateRef.current;

      // Draw subtle holographic grid rings
      ctx.strokeStyle = "rgba(0, 229, 255, 0.06)";
      ctx.lineWidth = 1;
      for (let r = 20; r <= 70; r += 15) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw spinning arcs depending on the active state
      if (currentState === "processing") {
        ctx.strokeStyle = "rgba(0, 245, 255, 0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
          cx,
          cy,
          45,
          (frame * 0.05) % (Math.PI * 2),
          (frame * 0.05 + Math.PI * 0.5) % (Math.PI * 2),
        );
        ctx.stroke();

        ctx.strokeStyle = "rgba(124, 77, 255, 0.4)";
        ctx.beginPath();
        ctx.arc(
          cx,
          cy,
          50,
          (-frame * 0.03) % (Math.PI * 2),
          (-frame * 0.03 + Math.PI * 0.7) % (Math.PI * 2),
        );
        ctx.stroke();
      }

      // Render the particles with custom styles per state
      particles.forEach((p, idx) => {
        p.angle += p.speed;
        let radiusOffset = 0;
        let color = "rgba(100, 116, 139, 0.5)"; // Default passive zinc

        if (currentState === "listening") {
          // Pulsing blue dots
          radiusOffset = Math.sin(p.phase + frame * 0.1) * 4;
          color = `rgba(0, 229, 255, ${0.4 + Math.sin(p.phase + frame * 0.05) * 0.2})`;
        } else if (currentState === "processing") {
          // Rapid revolving cyan loops
          p.angle += p.speed * 2;
          color = "rgba(0, 229, 255, 0.7)";
        } else if (currentState === "speaking") {
          // Wave amplitude reactive points
          radiusOffset = Math.sin(p.angle * 6 + frame * 0.15) * 8;
          const hue = (180 + idx * 2) % 360;
          color = `hsla(${hue}, 100%, 60%, 0.7)`;
        }

        const x = cx + Math.cos(p.angle) * (p.radius + radiusOffset);
        const y = cy + Math.sin(p.angle) * (p.radius + radiusOffset);

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(
          x,
          y,
          p.size + (currentState === "speaking" ? 1 : 0),
          0,
          Math.PI * 2,
        );
        ctx.fill();

        // Holographic connectors
        if (currentState === "listening" && idx % 15 === 0) {
          ctx.strokeStyle = "rgba(0, 229, 255, 0.15)";
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      });

      // Draw active status description text
      ctx.fillStyle =
        currentState === "listening"
          ? "#00E5FF"
          : currentState === "processing"
            ? "#FF80AB"
            : currentState === "speaking"
              ? "#00E676"
              : "#4F4F4F";
      ctx.font = "8px JetBrains Mono, monospace";
      ctx.textAlign = "center";

      let text = "JARVIS DEACTIVATED";
      if (currentState === "listening") text = "LISTENING SENHOR...";
      if (currentState === "processing") text = "AI CUDA COMPUTING";
      if (currentState === "speaking") text = "JARVIS RESPONDING";

      ctx.fillText(text, cx, cy + 4);

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const speakLocalResponse = (cleanText: string) => {
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
      setAppState("inactive");
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

    window.speechSynthesis.cancel();
    setAppState("speaking");

    try {
      // Trigger node edge TTS
      if (engineType === "microsoft_edge_tts") {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(getServerUrl() + "/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            text: cleanText,
            service: "edge",
          }),
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => {
            setAppState("inactive");
            URL.revokeObjectURL(url);
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            speakLocalResponse(cleanText);
          };
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
      recognitionRef.current?.stop();
    } else {
      window.speechSynthesis.cancel();
      recognitionRef.current?.start();
    }
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
    reader.readAsText(file);
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
    if (mediaMode !== "none") {
      const frameBase64 = captureFrame();
      if (frameBase64) {
        fileToSend = {
          name: "vision_frame.jpg",
          type: "image/jpeg",
          size: Math.round(frameBase64.length * 0.75),
          content: frameBase64,
        };
      }
    }

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
          window.electronAPI.executeLocalCommand({ action, target });
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
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_380px] gap-4 h-[100dvh] max-h-screen p-4 bg-zinc-950 text-white overflow-hidden font-sans">
      
      {/* ======================================================== */}
      {/* LEFT COLUMN: TELEMETRY & MEDIA FEEDS */}
      {/* ======================================================== */}
      <div className="glass-panel rounded-3xl p-5 flex flex-col gap-4 h-full overflow-hidden border border-[var(--brand-primary)]/20 shadow-[0_0_20px_rgba(6,182,212,0.1)] relative bg-black/30 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--brand-primary)]/5 to-transparent pointer-events-none rounded-3xl" />
        
        <div className="flex justify-between w-full items-center shrink-0 z-10">
          <span className="text-[10px] font-mono tracking-wider uppercase flex items-center gap-1 text-[var(--brand-light)] font-bold">
            <Cpu className="h-4 w-4" /> SYSTEM TELEMETRY
          </span>
          <div className="px-2 py-0.5 rounded font-mono text-[9px] uppercase tracking-wider bg-[var(--brand-primary)]/20 text-[var(--brand-light)] border border-[var(--brand-primary)]/50">
            ONLINE
          </div>
        </div>

        {/* System Uptime / Weather Placeholder */}
        <div className="border border-white/10 bg-black/40 rounded-xl p-3 flex flex-col gap-2 shrink-0 z-10 font-mono text-xs text-zinc-400">
           <div className="flex justify-between items-center">
             <span className="flex items-center gap-1.5"><History className="w-3 h-3 text-[var(--brand-light)]"/> Uptime</span>
             <span className="text-white font-bold">03:45:12</span>
           </div>
           <div className="flex justify-between items-center">
             <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-[var(--brand-light)]"/> Weather</span>
             <span className="text-white font-bold">24°C, Clear</span>
           </div>
        </div>

        {/* Media Feeds */}
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto z-10 scrollbar-thin scrollbar-thumb-[var(--brand-primary)]/50">
          {/* Camera Feed Widget */}
          <div className="border border-[var(--brand-primary)]/30 rounded-xl bg-black/60 relative overflow-hidden h-40 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
             <video ref={cameraVideoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-80" />
             <div className="absolute top-2 left-2 px-2 py-1 bg-black/80 rounded text-[9px] font-mono uppercase text-[var(--brand-light)] border border-[var(--brand-primary)]/30 flex items-center gap-1">
               <div className={`w-1.5 h-1.5 rounded-full ${mediaMode === 'camera' ? 'bg-red-500 animate-pulse' : 'bg-zinc-600'}`}></div>
               OPTICAL SENSOR
             </div>
          </div>
          
          {/* Screen Share Feed Widget */}
          <div className="border border-[var(--brand-primary)]/30 rounded-xl bg-black/60 relative overflow-hidden h-40 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
             <video ref={screenVideoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-80" />
             <div className="absolute top-2 left-2 px-2 py-1 bg-black/80 rounded text-[9px] font-mono uppercase text-[var(--brand-light)] border border-[var(--brand-primary)]/30 flex items-center gap-1">
               <div className={`w-1.5 h-1.5 rounded-full ${mediaMode === 'screen' ? 'bg-red-500 animate-pulse' : 'bg-zinc-600'}`}></div>
               SCREEN LINK
             </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CENTER COLUMN: THE C.Y.B.E.R CORE */}
      {/* ======================================================== */}
      <div className="flex flex-col items-center justify-center relative h-full rounded-3xl overflow-hidden glass-panel border border-white/5 bg-zinc-950/40">
        <h1 className="absolute top-8 font-mono text-2xl lg:text-4xl tracking-[0.4em] font-black text-[var(--brand-light)] drop-shadow-[0_0_15px_rgba(6,182,212,0.5)] z-10">
          C.Y.B.E.R
        </h1>
        
        {/* Central Orb / Canvas */}
        <div className="relative flex items-center justify-center w-full h-[400px]">
          <canvas ref={canvasRef} className="rounded-full holographic-glow w-[350px] h-[350px] z-0" />
          
          {/* Popups Overlay */}
          {activePopup && activePopup.type === 'image' && (
             <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl m-4 border border-[var(--brand-primary)]/50">
               <button onClick={() => setActivePopup(null)} className="absolute top-4 right-4 bg-black/80 p-2 rounded-full hover:bg-red-500/80 transition-colors cursor-pointer">
                 <X className="w-4 h-4 text-white" />
               </button>
               <img src={activePopup.url} alt="Generated" className="max-w-[80%] max-h-[80%] rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.4)]" />
             </div>
          )}
        </div>

        {/* Mode Status Indicator */}
        <div className="absolute bottom-32 text-xs font-mono tracking-widest px-4 py-1.5 rounded-full border bg-black/50 backdrop-blur-md transition-colors duration-300">
          <span className={mediaMode === 'camera' ? 'text-red-400 font-bold' : mediaMode === 'screen' ? 'text-blue-400 font-bold' : 'text-[var(--brand-light)]'}>
            {mediaMode === 'camera' ? '>> VISION MODE ACTIVE <<' : mediaMode === 'screen' ? '>> SCREEN SHARE ACTIVE <<' : '>> SYSTEM STANDBY <<'}
          </span>
        </div>

        {/* Action Toolbar */}
        <div className="absolute bottom-10 flex gap-3 p-3 rounded-full border border-white/10 bg-zinc-950/80 backdrop-blur-xl shadow-2xl">
          <button onClick={toggleCameraMode} className={`p-4 rounded-full transition-all cursor-pointer ${mediaMode === 'camera' ? 'bg-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}>
             <Camera className="w-5 h-5" />
          </button>
          <button onClick={handleMicToggle} className={`p-4 rounded-full transition-all cursor-pointer ${appState === 'listening' ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}>
             {appState === 'listening' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button onClick={toggleScreenMode} className={`p-4 rounded-full transition-all cursor-pointer ${mediaMode === 'screen' ? 'bg-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}>
             <Monitor className="w-5 h-5" />
          </button>
          <button onClick={() => setIsVoiceModalOpen(true)} className="p-4 rounded-full transition-all cursor-pointer hover:bg-white/10 text-zinc-400 hover:text-white">
             <Sliders className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT COLUMN: CHAT TERMINAL */}
      {/* ======================================================== */}
      <div className="glass-panel border border-[var(--brand-primary)]/20 shadow-[0_0_20px_rgba(6,182,212,0.1)] flex flex-col justify-between overflow-hidden h-full relative rounded-3xl bg-black/30 backdrop-blur-xl">
        <div className="flex justify-between items-center px-5 py-4 border-b border-[var(--brand-primary)]/20 bg-black/40 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[var(--brand-primary)] animate-pulse"></div>
            <span className="text-xs font-mono font-bold text-[var(--brand-light)] tracking-wider">
              SYS_LOG@CYBER_CORE:~
            </span>
          </div>
        </div>

        {/* Dialogue Scroll area */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5 select-text scrollbar-thin scrollbar-thumb-[var(--brand-primary)]/50">
          {conversations.map((msg, index) => {
            const isJarvis = msg.sender === "JARVIS";
            const commandMatches = (msg.text || "").match(/<command[^>]*\/>/g);
            const displayContent = (msg.text || "").replace(/<command[^>]*\/>/g, "").trim();

            return (
              <motion.div key={index} initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`flex gap-3 ${isJarvis ? "justify-start" : "justify-end"}`}>
                {isJarvis && (
                  <div className="h-8 w-8 rounded-xl border border-[var(--brand-primary)]/50 flex items-center justify-center flex-shrink-0 font-black text-sm bg-black/80 text-[var(--brand-light)] shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                    C
                  </div>
                )}
                <div className="max-w-[85%] flex flex-col gap-1.5">
                  <div className={`px-4 py-3 rounded-2xl text-[13px] leading-relaxed border backdrop-blur-md ${isJarvis ? "bg-black/60 text-cyan-50 border-[var(--brand-primary)]/30 shadow-[0_4px_20px_rgba(6,182,212,0.15)]" : "bg-[var(--brand-primary)]/20 text-white border-[var(--brand-primary)]/50 shadow-[0_4px_20px_rgba(6,182,212,0.2)]"}`}>
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(displayContent) }} />
                  </div>

                  {commandMatches && (
                    <div className="flex flex-wrap gap-1.5 mt-1 font-mono">
                      {commandMatches.map((cmd, idx) => {
                        const typeMatch = cmd.match(/type="([^"]+)"/);
                        const type = typeMatch ? typeMatch[1] : "System";
                        return (
                          <div key={idx} className="text-[9px] uppercase font-bold border border-[var(--brand-primary)]/40 px-2 py-1 rounded flex items-center gap-1 bg-black/50 text-[var(--brand-light)]">
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
          <div ref={historyEndRef} />
        </div>

        {/* Attachment preview if any file is attached */}
        {attachedFile && (
          <div className="px-4 py-2 border-t border-white/10 bg-black/60 flex items-center justify-between text-xs shrink-0">
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
        <form onSubmit={handleSendText} className="p-4 border-t border-[var(--brand-primary)]/20 flex gap-3 items-center bg-black/60 backdrop-blur-xl z-10 shrink-0">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.docx,.xlsx,.xls,.txt" className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 rounded-xl border border-[var(--brand-primary)]/30 bg-black/50 text-[var(--brand-light)] hover:bg-[var(--brand-primary)]/20 transition-all cursor-pointer">
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={appState === "processing"}
            placeholder={
              appState === "listening" ? "Aguardando entrada de voz..." : 
              appState === "processing" ? "Processando..." : 
              "Inicializar comando..."
            }
            className="flex-1 bg-black/50 border border-[var(--brand-primary)]/30 rounded-xl text-xs px-4 py-3 focus:outline-none focus:border-[var(--brand-primary)] focus:shadow-[0_0_20px_rgba(6,182,212,0.2)] text-white placeholder:text-[var(--brand-light)]/50 transition-all font-mono"
          />
          <button type="submit" disabled={appState === "processing" || (!inputText.trim() && !attachedFile && mediaMode === "none")} className="px-5 py-3 bg-[var(--brand-primary)]/80 hover:bg-[var(--brand-primary)] text-white rounded-xl transition-all disabled:opacity-50 flex items-center justify-center font-bold cursor-pointer">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Voice Configuration Modal */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="border border-[var(--brand-primary)]/30 rounded-3xl max-w-lg w-full p-8 space-y-6 bg-zinc-950 text-white shadow-[0_0_50px_rgba(6,182,212,0.2)]">
             <h2 className="text-xl font-mono font-bold tracking-widest text-[var(--brand-light)] border-b border-[var(--brand-primary)]/20 pb-4">CONFIGURAÇÕES DO SISTEMA</h2>
             
             {/* Quick mockup for config toggles... maintaining functionality */}
             <div className="space-y-4 font-mono text-sm">
                <div className="flex flex-col gap-2">
                   <span>Estilo de Conversa (Persona)</span>
                   <select 
                     value={activePersona} 
                     onChange={(e) => setActivePersona(e.target.value)} 
                     className="w-full bg-black/50 border border-[var(--brand-primary)]/30 rounded-xl px-4 py-2 focus:outline-none focus:border-[var(--brand-primary)] text-white cursor-pointer"
                   >
                     <option value="jarvis">J.A.R.V.I.S (Cortês & Profissional)</option>
                     <option value="friday">F.R.I.D.A.Y (Dinâmica & Direta)</option>
                     <option value="glados">GLaDOS (Sarcástica & Fria)</option>
                     <option value="hal9000">HAL 9000 (Metódico & Assustador)</option>
                   </select>
                </div>
                
                <div className="flex flex-col gap-2">
                   <span>Voz do Sistema</span>
                   <select 
                     value={selectedVoiceURI || ""} 
                     onChange={(e) => setSelectedVoiceURI(e.target.value)} 
                     className="w-full bg-black/50 border border-[var(--brand-primary)]/30 rounded-xl px-4 py-2 focus:outline-none focus:border-[var(--brand-primary)] text-white cursor-pointer"
                   >
                     {systemVoices.map(v => (
                       <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
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
                <button onClick={() => setIsVoiceModalOpen(false)} className="px-6 py-2 bg-[var(--brand-primary)]/20 hover:bg-[var(--brand-primary)]/40 text-[var(--brand-light)] border border-[var(--brand-primary)]/50 rounded-xl transition-colors font-bold tracking-wider cursor-pointer">
                  FECHAR
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
});
