import { getServerUrl } from "../lib/api";
import React, { useState, useEffect } from "react";
import { Plus, Wifi, Save, ArrowUpRight, Cpu, ShieldCheck, Palette } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";

interface DeviceConfigProps {
  devices: any[];
  onRefresh: () => void;
  currentTheme: "cyan" | "amber" | "violet" | "emerald" | "rose";
  onChangeTheme: (theme: "cyan" | "amber" | "violet" | "emerald" | "rose") => void;
  configTab: "general" | "appearance";
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  bgImage?: string;
  onChangeBgImage?: (url: string) => void;
}

const PERSONAS_LIST = [
  {
    id: "jarvis",
    name: "Classic J.A.R.V.I.S.",
    title: "O Gentleman Britânico",
    desc: "Refinado, polidíssimo, extremamente sofisticado. Seu mordomo inteligente ideal.",
    theme: "cyan" as const,
    color: "#06b6d4"
  },
  {
    id: "friday",
    name: "F.R.I.D.A.Y.",
    title: "A Agente Tática",
    desc: "Direta, tática, ultra-tecnológica. Focada em performance e telemetria de segurança.",
    theme: "rose" as const,
    color: "#f43f5e"
  },
  {
    id: "glados",
    name: "G.L.A.D.O.S.",
    title: "A Construto Sarcástica",
    desc: "Mente brilhante recheada de humor ácido, piadas de laboratório e sarcasmo inteligente.",
    theme: "violet" as const,
    color: "#8b5cf6"
  },
  {
    id: "hal9000",
    name: "HAL 9000",
    title: "O Núcleo Retro Telemetria",
    desc: "Sussurro suave, friamente racional e isento de variações emocionais. Segurança absoluta.",
    theme: "amber" as const,
    color: "#f59e0b"
  }
];

const HOLO_THEMES = {
  cyan: {
    name: "Cyan Holo (Padrão)",
    desc: "Estilo padrão JARVIS. Tom azul gelado ciberneÌtico e limpo.",
    color: "#06b6d4",
    bgClass: "from-[var(--brand-dark)] to-blue-950/10 border-[var(--brand-primary)]/25",
    textClass: "text-[var(--brand-light)]"
  },
  amber: {
    name: "Amber Matrix",
    desc: "Filtro ouro tático. Computador de bordo militar retro-futurista.",
    color: "#f59e0b",
    bgClass: "from-amber-950/20 to-yellow-950/10 border-amber-500/25",
    textClass: "text-amber-400"
  },
  violet: {
    name: "Violet Nebula",
    desc: "Estilo inteligência cósmica or magenta neon espacial.",
    color: "#8b5cf6",
    bgClass: "from-violet-950/20 to-fuchsia-950/10 border-violet-500/25",
    textClass: "text-violet-400"
  },
  emerald: {
    name: "Emerald Eco-Grid",
    desc: "Tom verde bio-energia relaxante, inspirado em matrizes digitais.",
    color: "#10b981",
    bgClass: "from-emerald-950/20 to-teal-950/10 border-emerald-500/25",
    textClass: "text-emerald-400"
  },
  rose: {
    name: "Crimson Laser",
    desc: "Protocolo Stark de segurança máxima. Alerta laser vermelho ativo.",
    color: "#f43f5e",
    bgClass: "from-rose-950/20 to-red-950/10 border-rose-500/25",
    textClass: "text-rose-400"
  }
};

export default React.memo(function DeviceConfig({ devices, onRefresh, currentTheme, onChangeTheme, configTab, isDarkMode = true, onToggleDarkMode, bgImage = "", onChangeBgImage }: DeviceConfigProps) {
  // Local states for device additions
  const [activePersona, setActivePersona] = useState<string>("friday");

  const [haIp, setHaIp] = useState("");
  const [haToken, setHaToken] = useState("");
  const [haWsStatus, setHaWsStatus] = useState("disconnected");

  const [hiddenDevices, setHiddenDevices] = useState<string[]>([]);
  const [modesConfig, setModesConfig] = useState<Record<string, any>>({
    "Modo Trabalho": { brightness: 90, color: "#E0F7FA", temp: 22 },
    "Modo Cinema": { brightness: 15, color: "#E040FB", temp: 20 },
    "Modo Noturno": { brightness: 5, color: "#FF8F00", temp: 24 }
  });
  const [savingHA, setSavingHA] = useState(false);

  const [isGoogleConnected, setIsGoogleConnected] = useState(!!localStorage.getItem("google_token"));
  const [googleEmail, setGoogleEmail] = useState<string | null>(localStorage.getItem("google_user_email"));

  const loginGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        if (!tokenResponse.access_token) return;
        localStorage.setItem("google_token", tokenResponse.access_token);

        // Fetch profile
        const checkRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });
        if (checkRes.ok) {
          const profile = await checkRes.json();
          if (profile.email) {
            localStorage.setItem("google_user_email", profile.email);
            setGoogleEmail(profile.email);
          }
        }
        setIsGoogleConnected(true);
      } catch (err) {
        console.error("Failed to connect google account", err);
      }
    },
    onError: () => console.error("Google authentication failed")
  });

  const handleDisconnectGoogle = () => {
    localStorage.removeItem("google_token");
    localStorage.removeItem("google_user_email");
    setIsGoogleConnected(false);
    setGoogleEmail(null);
  };

  useEffect(() => {
    fetch(getServerUrl() + "/api/ai/persona")
      .then(r => r.json())
      .then(data => {
        if (data.activePersona) {
          setActivePersona(data.activePersona);
        }
      })
      .catch(() => { });

    const fetchHAConfig = () => {
      fetch(getServerUrl() + "/api/db")
        .then(r => r.json())
        .then(data => {

          if (data.homeAssistant) {
            setHaIp(data.homeAssistant.ip || (typeof window !== 'undefined' ? window.location.hostname : ""));
            setHaToken(data.homeAssistant.token || "");
            setHaWsStatus(data.homeAssistant.wsStatus || "disconnected");
            if (data.homeAssistant.hiddenDevices) setHiddenDevices(data.homeAssistant.hiddenDevices);
            if (data.homeAssistant.modesConfig) setModesConfig(data.homeAssistant.modesConfig);
          }
        })
        .catch(() => { });
    };

    fetchHAConfig();
    const interval = setInterval(fetchHAConfig, 3000);
    return () => clearInterval(interval);
  }, []);

  const [name, setName] = useState("");
  const [type, setType] = useState("Lâmpada Inteligente");
  const [brand, setBrand] = useState("Positivo Casa Inteligente");
  const [integration, setIntegration] = useState("Tuya Local Integration");
  const [status, setStatus] = useState("Sincronizado via LocalTuya");
  const [targetUrl, setTargetUrl] = useState(`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8123`);

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const deviceTypes = [
    "Lâmpada Inteligente (RGB/Dimmer)",
    "Fita LED Inteligente",
    "Ar-Condicionado / Climatizador",
    "Alto-falante Alexa / Echo Dot",
    "Tomada Inteligente (Smart Plug)",
    "Robô Aspirador",
    "Interruptor Inteligente"
  ];

  const brands = [
    "Positivo Casa Inteligente",
    "Amazon Alexa",
    "Tuya / Smart Life",
    "Sonoff / eWeLink",
    "Philips Hue",
    "Generic Zigbee / Matter Mesh",
    "ESPHome (DIY Hardware)"
  ];

  const integrations = [
    "Tuya Local Integration (Sem Nuvem)",
    "Alexa Media Player Integration",
    "Zigbee2MQTT Bridge",
    "Home Assistant Core Integration",
    "Local REST API / Webhook trigger",
    "ESPHome Auto-Discovery"
  ];

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setSuccessMsg(null);

    try {
      const res = await fetch(getServerUrl() + "/api/iot/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          brand,
          integration,
          status,
          targetUrl
        })
      });

      if (res.ok) {
        setSuccessMsg("Dispositivo registrado e mapeado com sucesso na pilha local!");
        setName("");
        onRefresh();
        // Clear message after 4s
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleDevice = async (deviceId: string, currentState: string) => {
    try {
      await fetch(getServerUrl() + "/api/update/iot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          state: currentState === "on" ? "off" : "on"
        }),
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleHiddenDevice = async (deviceId: string) => {
    const isHidden = hiddenDevices.includes(deviceId);
    const newHidden = isHidden ? hiddenDevices.filter(id => id !== deviceId) : [...hiddenDevices, deviceId];
    setHiddenDevices(newHidden);

    try {
      await fetch(getServerUrl() + "/api/homeassistant/config", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hiddenDevices: newHidden })
      });
      onRefresh();
    } catch (err) { }
  };

  const handleUpdateModeConfig = async (mode: string, field: string, value: any) => {
    const newConfig = { ...modesConfig, [mode]: { ...modesConfig[mode], [field]: value } };
    setModesConfig(newConfig);

    try {
      await fetch(getServerUrl() + "/api/homeassistant/config", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modesConfig: newConfig })
      });
      onRefresh();
    } catch (err) { }
  };



  const handleSaveHAConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingHA(true);
    try {
      const res = await fetch(getServerUrl() + "/api/homeassistant/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: haIp, token: haToken })
      });
      if (res.ok) {
        setSuccessMsg("Ponte de comunicação Home Assistant WebSocket estabelecida!");
        onRefresh();
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingHA(false);
    }
  };

  return (
    <>
      {configTab === "appearance" ? (
        <div className="bg-white/10/30 border border-white/10 p-5 md:p-6 rounded-2xl space-y-6">
          {/* NOVO: CONFIGURAÃ‡ÃƒO DE BACKGROUND URL */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Palette className="w-4 h-4 text-[var(--brand-light)]" />
              Plano de Fundo (Wallpaper)
            </h3>
            <p className="text-xs text-zinc-400 mt-1 mb-3">
              Faça o upload de uma imagem (gif, jpg, png) para substituir o fundo escuro por um wallpaper personalizado.
            </p>
            <div className="flex flex-col gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const base64 = event.target?.result as string;
                    try {
                      onChangeBgImage?.(base64);
                    } catch (err) {
                      alert("Imagem muito grande! O limite de armazenamento local foi excedido. Tente uma imagem com resolução menor.");
                    }
                  };
                  reader.readAsDataURL(file);
                }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[var(--brand-primary)] focus:shadow-[0_0_15px_var(--brand-glow)] transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--brand-primary)]/20 file:text-[var(--brand-light)] hover:file:bg-[var(--brand-primary)]/30"
              />
              {bgImage && (
                <button
                  onClick={() => onChangeBgImage?.("")}
                  className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-all font-bold text-xs uppercase self-start"
                >
                  Remover Plano de Fundo Atual
                </button>
              )}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Palette className="w-4 h-4 text-[var(--brand-light)]" />
              Selecione seu Esquema de Cor Holográfica (Vibe Virtual)
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Altere as cores principais das linhas de varredura laser, botões de comando, badges de telemetria e gráficos instantaneamente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Object.entries(HOLO_THEMES).map(([key, t]) => (
              <button
                key={key}
                onClick={() => onChangeTheme(key as any)}
                className={`text-left p-5 rounded-2xl border transition-all duration-300 relative cursor-pointer overflow-hidden group hover:scale-[1.02] flex flex-col justify-between h-44 ${currentTheme === key
                    ? "bg-white/5 border-[var(--brand-primary)] shadow-[0_4px_12px_var(--brand-glow)]"
                    : "bg-white/5 border-white/10 hover:border-white/10 hover:bg-white/5/90 text-zinc-400"
                  }`}
              >
                {/* Subtle colored glow bubble inside active card */}
                <span className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full blur-2xl opacity-10 transition-opacity group-hover:opacity-20" style={{ backgroundColor: t.color }}></span>

                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3 w-3 rounded-full border border-white/10 shadow-inner shrink-0" style={{ backgroundColor: t.color }}></span>
                    <span className="font-semibold text-sm text-white">{t.name}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-zinc-400">
                    {t.desc}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-white/10 w-full font-mono">
                  <span className="text-[9px] tracking-widest text-zinc-500 uppercase">Tailwind hex: {t.color}</span>
                  {currentTheme === key && (
                    <span className="text-[10px] font-bold text-[var(--brand-light)] px-2 py-0.5 rounded bg-[var(--brand-glow)] uppercase border border-[var(--brand-border)] transition-opacity duration-300">
                      Ativo
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Elegant Preview Hud Frame */}
          <div className="bg-white/5 border border-white/10 p-5 rounded-xl space-y-4 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-zinc-500 uppercase text-[10px]">Demonstração de Elementos Holográficos</span>
              <span className="text-[9px] text-zinc-500">PREVIEW LIVE DO TEMA ATIVO</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-glow)] space-y-2">
                <span className="text-[9px] text-zinc-500 block">CARD COM BRILHO TELEMETRIA</span>
                <span className="text-[var(--brand-light)] font-bold text-xs flex items-center gap-1.5 justify-between">
                  <span>Active Neural Node</span>
                  <span className="h-2 w-2 rounded-full bg-[var(--brand-light)] "></span>
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-white/10 bg-white/10 flex items-center justify-between">
                <span>Badge holográfico:</span>
                <span className="text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest bg-[var(--brand-glow)] border border-[var(--brand-border)] text-[var(--brand-light)]">
                  Status OK
                </span>
              </div>
              <button className="p-3.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-glow)] text-[var(--brand-light)] hover:bg-[var(--brand-glow-strong)] transition-all font-bold flex items-center justify-center gap-1 text-[11px] cursor-pointer">
                Botão Holográfico Ativo
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* Column 1: Home Assistant Live & Groq Cloud */}
            <div className="space-y-6">

              {/* Home Assistant WebSocket Config Card */}
              <div className="holographic-card p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-805 pb-3">
                  <h3 className="text-sm font-sans font-semibold text-[var(--brand-light,rgb(6,182,212))] uppercase tracking-wider flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-[var(--brand-light,rgb(6,182,212))]" />
                    Domótica: HA Live WebSocket
                  </h3>

                  <span className={`text-[9px] px-2 py-0.5 rounded font-mono uppercase font-bold flex items-center gap-1 border shadow-inner ${haWsStatus === "connected"
                      ? "bg-emerald-950/70 text-emerald-400 border-emerald-900/40"
                      : haWsStatus === "connecting" || haWsStatus === "authenticating"
                        ? "bg-amber-950/70 text-amber-400 border-amber-900/40 animate-pulse"
                        : "bg-red-950/70 text-red-400 border-red-900/40"
                    }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${haWsStatus === "connected"
                        ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                        : haWsStatus === "connecting" || haWsStatus === "authenticating"
                          ? "bg-amber-400"
                          : "bg-red-500"
                      }`}></span>
                    {haWsStatus === "connected" ? "CONECTADO LIVE" : haWsStatus === "connecting" ? "CONECTANDO..." : haWsStatus === "authenticating" ? "AUTENTICANDO" : "DESCONECTADO"}
                  </span>
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Consuma dados reais de sensores de temperatura, iluminação e interruptores da sua residência (IP: <code className="text-[var(--brand-light)] font-mono">{haIp}</code>) conectando-se diretamente ao barramento de eventos do Home Assistant.
                </p>

                <form onSubmit={handleSaveHAConfig} className="space-y-3 font-mono text-xs p-3.5 bg-white/5 border border-white/10 rounded-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-zinc-500 block text-[9px] uppercase mb-1">Servidor IP / Local Host</label>
                      <div className="w-full bg-white/10 border border-white/10 text-zinc-400 font-mono text-xs px-2 py-1.5 rounded select-none cursor-not-allowed">
                        {haIp || "Auto-detected"}
                      </div>
                    </div>
                    <div>
                      <label className="text-zinc-500 block text-[9px] uppercase mb-1">Status de Conectividade</label>
                      <div className="bg-white/10 border border-white/10 text-zinc-400 font-mono text-xs p-1.5 rounded flex items-center gap-1.5 h-[32px] select-none">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${haWsStatus === "connected" ? "bg-emerald-400 " : haWsStatus === "connecting" || haWsStatus === "authenticating" ? "bg-amber-400 animate-pulse" : "bg-red-400"}`}></span>
                        <span className="text-[10px] uppercase font-bold tracking-widest">{haWsStatus}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-500 block text-[9px] uppercase mb-1">Token de Acesso de Longa Duração (Long-Lived Token)</label>
                    <input
                      type="password"
                      required
                      placeholder="Seu token dente das configurações de perfil do Home Assistant"
                      value={haToken}
                      onChange={(e) => setHaToken(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-zinc-300 font-mono text-xs px-2 py-1.5 rounded focus:outline-none focus:border-[var(--brand-primary)]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingHA}
                    className="w-full py-1.5 bg-white/10 border border-white/10 hover:border-white/10 text-[var(--brand-light)] hover:text-white font-mono font-bold tracking-wider rounded uppercase hover:bg-zinc-850 transition flex items-center justify-center gap-1.5 cursor-pointer text-[10px] disabled:opacity-50"
                  >
                    <Wifi className="h-3.5 w-3.5" />
                    {savingHA ? "REINICIANDO AMBIENTE SOCKET..." : "SALVAR E CONECTAR VIA WEBSOCKET"}
                  </button>
                </form>
              </div>

              {/* Column 1 Card 2: Groq Cloud Configuration & Verification Tutorials */}
              <div className="holographic-card p-5 space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-sm font-sans font-semibold text-[var(--brand-light)] uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-[var(--brand-light)]" />
                    IA Groq LPU (API Route)
                  </h3>
                  <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded font-mono uppercase font-bold animate-pulse">
                    100% Cloud
                  </span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  De acordo com as especificações, seu JARVIS <strong>usará infraestrutura de aceleração LPU do Groq</strong>. Toda a lógica de NLP e respostas são executadas quase instantaneamente de forma terceirizada via API (Modelos Llama 3).
                </p>

                <div className="space-y-3 font-mono text-xs bg-white/5 border border-white/10 rounded-xl p-4">
                  <div>
                    <label className="text-zinc-500 block text-[10px] uppercase mb-1">Status da Chave (Token Groq)</label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-white/10 border border-white/10 text-zinc-400 font-mono text-xs px-2.5 py-1.5 rounded select-none cursor-not-allowed">
                        Validação via "Chaves APIs"
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-zinc-500 block text-[10px] uppercase mb-1">Modelo Principal</label>
                      <div className="bg-white/5 border border-white/10 text-zinc-300 font-mono text-xs p-1.5 rounded flex items-center justify-center gap-1.5 h-[34px] opacity-75 cursor-not-allowed text-center">
                        llama-3.3-70b-versatile
                      </div>
                    </div>
                    <div>
                      <label className="text-zinc-500 block text-[10px] uppercase mb-1">Hardware LPU</label>
                      <div className="bg-white/5 border border-emerald-900/30 text-emerald-400 font-mono text-xs p-1.5 rounded flex items-center justify-center gap-1.5 font-bold h-[34px]">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        Groq Cloud LPU
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-950/20 border border-emerald-900/30 p-2.5 rounded-lg text-emerald-400 text-[11px] leading-relaxed flex items-start gap-2 mt-4">
                    <span className="h-2 w-2 rounded-full bg-emerald-400  mt-1 shrink-0"></span>
                    <div>
                      <strong className="block">DEPLOY CLOUD LIGADO:</strong>
                      Se você adicionou o token Groq na aba Módulo de Tokens, o LLM e RAG responderão em milisegundos usando o Groq.
                    </div>
                  </div>
                </div>

                {/* Practical guide details for vinicius */}
                <div className="space-y-4">
                  <h4 className="text-xs font-mono font-bold text-white uppercase border-l-2 border-[var(--brand-primary)] pl-2">
                    Como configurar as Chaves Cloud Corretamente?
                  </h4>

                  <div className="space-y-3.5 text-xs text-zinc-300 leading-relaxed">
                    <div className="flex gap-2.5 items-start">
                      <span className="bg-[var(--brand-dark)] text-[var(--brand-light)] rounded-full h-5.5 w-5.5 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                      <div>
                        <span className="font-semibold block text-white text-[11px]">Gerar e Inserir API Keys</span>
                        <div className="text-[11px] text-zinc-400 mt-1">
                          Vá até a guia "Configurações Globais" {'>'} "Gerenciador de Tokens". Lá você verá as configurações do <strong>Groq API Key</strong>. Registre-se em <code className="text-zinc-400 font-mono bg-white/10 px-1 py-0.5 rounded">console.groq.com</code> e valide e insira a chave obtida lá no painel esquerdo.
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2.5 items-start">
                      <span className="bg-[var(--brand-dark)] text-[var(--brand-light)] rounded-full h-5.5 w-5.5 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                      <div>
                        <span className="font-semibold block text-white text-[11px]">Sincronização Física Real do Obsidian Vault no Contexto</span>
                        <p className="text-[11px] text-zinc-400">
                          O ecossistema detecta as anotações geradas via aplicativo Obsidian salvas em texto puro Markdown na pasta <code className="text-yellow-400 font-mono">C:\jarvis-vault</code> no Windows e constrói o prompt injetando-os perfeitamente junto ao modelo local e online, orquestrando um RAG nativo e sem dependência extra.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2.5 items-start">
                      <span className="bg-[var(--brand-dark)] text-[var(--brand-light)] rounded-full h-5.5 w-5.5 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                      <div>
                        <span className="font-semibold block text-white text-[11px]">Conectando com Lâmpadas Positivos e Alexa</span>
                        <p className="text-[11px] text-zinc-400">
                          O Home Assistant atua como o seu Hub IoT unificado. Como ele roda em <code className="text-[var(--brand-light)] font-mono">network_mode: host</code> no Docker, ele varre automaticamente a rede Wi-Fi da sua residência buscando lâmpadas Tuya/Positivo e caixas Echo Dot via protocolo UPnP. Você só precisa pareá-las adicionando a integração correspondente no portal.
                        </p>
                      </div>
                    </div>

                    <div className="mt-8 border-t border-white/10 pt-5 space-y-4">
                      <h4 className="text-[13px] font-sans font-bold text-cyan-400 uppercase tracking-wide flex items-center gap-2">
                        <Wifi className="h-4 w-4" />
                        Módulo de Acesso Remoto: Acesso de Qualquer Lugar (Nível Ultra Fácil)
                      </h4>
                      <p className="text-[11px] text-zinc-400 leading-relaxed max-w-2xl">
                        Vamos usar a "Mágica do Cloudflare". Ã‰ como criar um túnel invisível da sua casa direto pro seu celular. Não importa onde você esteja, você clica e entra na sua casa.
                      </p>

                      {/* Fase 1 */}
                      <div className="bg-white/5 p-4 rounded-xl border border-white/10 focus-ring hover:border-cyan-500/30 transition-colors">
                        <h5 className="text-[12px] font-bold text-cyan-400 flex items-center gap-2 mb-3">
                          <span className="bg-cyan-500/20 text-cyan-400 w-5 h-5 rounded flex items-center justify-center">1</span>
                          Criando a sua Conta (O Terreno)
                        </h5>
                        <ul className="text-[11px] text-zinc-300 space-y-2.5 list-disc pl-4 marker:text-zinc-600">
                          <li>Pelo seu computador da casa, entre no site <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">dash.cloudflare.com</a>.</li>
                          <li>Clique em <strong>"Sign Up"</strong> (que significa "Cadastrar") para criar uma conta com seu e-mail e uma senha.</li>
                          <li>Depois que criar, você precisa avisar pro site qual será o seu "endereço mágico" (por exemplo, <code className="text-pink-400 font-mono">meunome.com</code>). Assista um video rápido no YouTube ensinando como ter um "domínio na Cloudflare" ou "freenom Cloudflare" caso você não tenha nenhum.</li>
                        </ul>
                      </div>

                      {/* Fase 2 */}
                      <div className="bg-white/5 p-4 rounded-xl border border-white/10 focus-ring hover:border-cyan-500/30 transition-colors mt-3">
                        <h5 className="text-[12px] font-bold text-cyan-400 flex items-center gap-2 mb-3">
                          <span className="bg-cyan-500/20 text-cyan-400 w-5 h-5 rounded flex items-center justify-center">2</span>
                          Cavando o Túnel (Zero Trust)
                        </h5>
                        <ul className="text-[11px] text-zinc-300 space-y-2.5 list-disc pl-4 marker:text-zinc-600">
                          <li>Dentro do Cloudflare, procure pela palavra <strong>Zero Trust</strong> no lado esquerdo (tem o desenho de um escudinho azul) e clique nela.</li>
                          <li>Escolha o plano <strong>Free</strong> (Grátis).</li>
                          <li>Na nova tela, Ã  esquerda, clique na palavra <strong>Networks</strong> (Redes) e depois clique embaixo em <strong>Tunnels</strong> (Túneis).</li>
                          <li>Clique no <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded">Botão Azul</span> no meio da tela chamado <strong>"Create a tunnel"</strong>.</li>
                          <li>Marque a primeira bolinha chamada <strong>"Cloudflared"</strong> e clique em <em>Next</em>.</li>
                          <li>Ele vai pedir um nome. Escreva <code className="text-pink-400 font-mono">MeuJarvis</code> e clique em <strong>"Save tunnel"</strong>.</li>
                        </ul>
                      </div>

                      {/* Fase 3 */}
                      <div className="bg-white/5 p-4 rounded-xl border border-white/10 focus-ring hover:border-cyan-500/30 transition-colors mt-3">
                        <h5 className="text-[12px] font-bold text-cyan-400 flex items-center gap-2 mb-3">
                          <span className="bg-cyan-500/20 text-cyan-400 w-5 h-5 rounded flex items-center justify-center">3</span>
                          Ligando o Túnel no seu Computador
                        </h5>
                        <ul className="text-[11px] text-zinc-300 space-y-2.5 list-disc pl-4 marker:text-zinc-600">
                          <li>O site agora mostra um código de instalação. Olhe as caixinhas de sistema em cima e clique em <strong>Windows</strong>.</li>
                          <li>No quadrado cinza embaixo, olhe pro lado direito dele e <b>clique no desenho de 2 folhinhas</b>. Isso vai "Copiar" esse script grandão para a memória.</li>
                          <li>Abra o PowerShell no seu Servidor Windows como Administrador.</li>
                          <li>Cole o comando completo e aperte <strong>"ENTER"</strong> no teclado. Ele irá baixar o pacote e instalar o cloudflared daemon.</li>
                          <li>Espere baixar e instalar. Volte pro site do Cloudflare: se lá embaixo estiver escrito <strong><span className="text-emerald-400">Connected</span></strong> (Conectado), sorria! Você conseguiu fazer o túnel! Clique em <strong>Next</strong>.</li>
                        </ul>
                      </div>

                      {/* Fase 4 */}
                      <div className="bg-white/5 p-4 rounded-xl border border-white/10 focus-ring hover:border-cyan-500/30 transition-colors mt-3">
                        <h5 className="text-[12px] font-bold text-cyan-400 flex items-center gap-2 mb-3">
                          <span className="bg-cyan-500/20 text-cyan-400 w-5 h-5 rounded flex items-center justify-center">4</span>
                          Ensinando o Caminho Pro Seu Celular
                        </h5>
                        <p className="text-[11px] text-zinc-300 mb-3">Agora a gente cria as rotas para o JARVIS e para os amigos dele (n8n e Casa) passarem pelo túnel.</p>

                        <div className="pl-2 border-l border-cyan-500/30 ml-2 space-y-4">
                          <div>
                            <strong className="text-pink-400 text-[11px]">Passo 1: A Rota do JARVIS!</strong>
                            <ul className="text-[11px] text-zinc-400 list-disc pl-5 mt-1 space-y-1">
                              <li>Ele pergunta o "Subdomain". Escreva: <strong>jarvis</strong></li>
                              <li>No "Domain", selecione o seu site que você cadastrou no começo da Fase 1.</li>
                              <li>No "Service Type", escolha do menu: <strong>HTTP</strong></li>
                              <li>No "URL", digite exatamente: <strong>localhost:3000</strong></li>
                              <li>E clique no botão azul <strong>"Save hostname"</strong>. Pronto! O Jarvis já está na internet!</li>
                            </ul>
                          </div>

                          <div>
                            <strong className="text-yellow-400 text-[11px]">Passo 2: A Rota do n8n (As Mãos)</strong>
                            <ul className="text-[11px] text-zinc-400 list-disc pl-5 mt-1 space-y-1">
                              <li>Clique em cima do túnel que você acabou de criar e clique para Configurar (Configure).</li>
                              <li>Lá em cima, clique na aba <strong>Public Hostnames</strong>.</li>
                              <li>Clique no botão azul <strong>Add a public hostname</strong>.</li>
                              <li>Em Subdomain escreva <strong>n8n</strong></li>
                              <li>Service Type: <strong>HTTP</strong></li>
                              <li>URL: <strong>localhost:5678</strong></li>
                              <li>Salve!</li>
                            </ul>
                          </div>

                          <div>
                            <strong className="text-emerald-400 text-[11px]">Passo 3: A Rota do Home Assistant (A Casa)</strong>
                            <ul className="text-[11px] text-zinc-400 list-disc pl-5 mt-1 space-y-1">
                              <li>Faça de novo: <strong>Add a public hostname</strong>.</li>
                              <li>Em Subdomain escreva <strong>casa</strong></li>
                              <li>Service Type: <strong>HTTP</strong></li>
                              <li>URL: <strong>localhost:8123</strong></li>
                              <li>Salve! Magia completa!</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Fase 5 */}
                      <div className="bg-gradient-to-r from-emerald-900/40 to-cyan-900/20 p-4 rounded-xl border border-emerald-500/20 space-y-2 mt-3">
                        <h5 className="text-[12px] font-bold text-emerald-400 uppercase flex items-center gap-2">
                          E pra eu atualizar o aplicativo da rua?! Funciona?
                        </h5>
                        <p className="text-[11px] text-zinc-300 leading-relaxed font-semibold">
                          Sim! O seu celular pelo 4G entra pelo túnel do site. Quando você está dentro do site do JARVIS na rua e aperta o botão <span className="text-emerald-400 bg-emerald-900/30 px-1 rounded">Atualizar do Git</span> na aba de Modificações, este comando viagem super rápido da nuvem do seu celular, desce o túnel, chega no seu computador do quarto e ele mesmo puxa o novo arquivo da internet e reinicia SOZINHO! Quando seu celular piscar, já carregará a versão nova perfeitamente!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Devices Integration Form & Mapped Devices Status */}
            <div className="space-y-6">

              {/* Diagnostic Registry Form */}
              <div className="holographic-card p-5">
                <h3 className="text-sm font-sans font-semibold text-[var(--brand-light)] uppercase tracking-wider border-b border-white/10 pb-3 mb-4 flex items-center gap-1.5">
                  <Plus className="h-4.5 w-4.5" />
                  Cadastrar Novo Dispositivo (Sem Limite de Compatibilidade)
                </h3>

                <p className="text-xs text-zinc-400 leading-normal mb-4">
                  Tenha controle total! Adicione lâmpadas Positivo, assistentes Alexa ou novos aparelhos Zigbee/Matter. Defina qual container Docker ou site é responsável pela configuração dele.
                </p>

                <form onSubmit={handleAddDevice} className="space-y-4 font-mono text-xs">

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-zinc-500 block text-[10px] uppercase mb-1">Nome do Gadget</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Lâmpada do Quarto Positivo"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-zinc-300 px-2.5 py-1.5 rounded focus:outline-none focus:border-[var(--brand-primary)] text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-500 block text-[10px] uppercase mb-1">Tipo do Equipamento</label>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-zinc-300 p-1.5 rounded focus:outline-none focus:border-[var(--brand-primary)] text-xs"
                      >
                        {deviceTypes.map(t => (
                          <option className="bg-black text-white" key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-zinc-500 block text-[10px] uppercase mb-1">Marca / Fabricante</label>
                      <select
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-zinc-300 p-1.5 rounded focus:outline-none focus:border-[var(--brand-primary)] text-xs"
                      >
                        {brands.map(b => (
                          <option className="bg-black text-white" key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-zinc-500 block text-[10px] uppercase mb-1">Tecnologia / Protocolo</label>
                      <select
                        value={integration}
                        onChange={(e) => setIntegration(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-zinc-300 p-1.5 rounded focus:outline-none focus:border-[var(--brand-primary)] text-xs"
                      >
                        {integrations.map(i => (
                          <option className="bg-black text-white" key={i} value={i}>{i}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-zinc-500 block text-[10px] uppercase mb-1">Status de Comunicação (Inicial)</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Pronto via LocalTuya"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-zinc-300 px-2.5 py-1.5 rounded focus:outline-none focus:border-[var(--brand-primary)] text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-500 block text-[10px] uppercase mb-1">URL de Configuração do Docker/HA</label>
                      <div className="w-full bg-white/10 border border-white/10 text-zinc-400 font-mono text-xs px-2.5 py-1.5 rounded select-none cursor-not-allowed">
                        {targetUrl || "Auto-detected"}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2 bg-[var(--brand-dark)] text-[var(--brand-light)] hover:bg-[var(--brand-dark)] font-bold tracking-wider rounded border border-[var(--brand-border)] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {submitting ? "Mapeando e Persistindo..." : "Mapear Dispositivo no Core"}
                  </button>

                  {successMsg && (
                    <div className="bg-emerald-950/20 border border-emerald-900/30 p-2.5 rounded-lg text-emerald-400 font-sans leading-normal text-xs text-center ">
                      âœ“ {successMsg}
                    </div>
                  )}
                </form>
              </div>

              {/* List of Registered IoT Entities */}
              <div className="holographic-card p-5">
                <h3 className="text-xs font-mono font-medium text-zinc-400 uppercase border-l border-[var(--brand-primary)] pl-2 mb-4">
                  Dispositivos Mapeados no Home Assistant & Rede Local
                </h3>

                <div className="space-y-2.5">
                  {devices && devices.length > 0 ? (
                    devices.map((device: any, idx: number) => (
                      <div
                        key={device.id || idx}
                        className="bg-white/5 border border-white/10/60 p-3 rounded-xl flex flex-col gap-3"
                      >
                        <div className="flex justify-between items-center w-full">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white">{device.name}</span>
                              <span className="text-[9px] bg-white/10 border border-white/10 px-1.5 py-0.5 rounded text-zinc-400 font-mono">
                                {device.brand || "Positivo"}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                              Protocolo: {device.integration || device.type} | {device.status}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <label className="flex items-center gap-2 cursor-pointer text-[10px] text-zinc-400 select-none">
                              <input
                                type="checkbox"
                                className="bg-white/5 border-white/10 rounded cursor-pointer accent-[var(--brand-primary)]"
                                checked={!hiddenDevices.includes(device.id)}
                                onChange={() => handleToggleHiddenDevice(device.id)}
                              />
                              Painel
                            </label>
                            <button
                              onClick={() => handleToggleDevice(device.id, device.state)}
                              className={`w-11 h-6 rounded-full p-0.5 transition-all duration-300 ease-in-out cursor-pointer relative flex items-center shrink-0 active:scale-90 hover:brightness-110 shadow-inner ${device.state === "on"
                                  ? "bg-[var(--brand-primary,rgb(6,182,212))] shadow-[0_2px_8px_var(--brand-primary,rgba(6,182,212,0.45))]"
                                  : "bg-white/20 border border-white/10/35"
                                }`}
                              title={device.state === "on" ? "Desligar Dispositivo" : "Ligar Dispositivo"}
                            >
                              <div
                                className={`bg-white/5 w-4.5 h-4.5 rounded-full shadow-inner transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1.2)] flex items-center justify-center ${device.state === "on" ? "transform translate-x-5" : "transform translate-x-0"
                                  }`}
                              >
                                {/* Inner small status indicator dot with custom color */}
                                <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${device.state === "on" ? "bg-[var(--brand-light,rgb(6,182,212))] animate-pulse" : "bg-zinc-650"}`} />
                              </div>
                            </button>

                            <a
                              href={device.targetUrl || `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8123`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 bg-white/5 hover:bg-[var(--brand-dark)] border border-zinc-805 text-[10px] font-mono text-[var(--brand-light)] hover:text-white transition rounded flex items-center gap-1 cursor-pointer"
                            >
                              <span>Abrir Portal</span>
                              <ArrowUpRight className="h-3 w-3" />
                            </a>
                          </div>
                        </div>

                      </div>
                    ))
                  ) : (
                    <div className="text-zinc-650 italic text-center text-xs py-4">
                      Nenhum dispositivo cadastrado no momento. Preencha o formulário acima.
                    </div>
                  )}
                </div>
              </div>

              {/* Modes Config UI */}
              <div className="holographic-card p-5 mt-6">
                <h3 className="text-xs font-mono font-medium text-zinc-400 uppercase border-l border-[var(--brand-primary)] pl-2 mb-4">
                  Configuração dos Modos
                </h3>
                <div className="space-y-4">
                  {Object.entries(modesConfig).map(([mode, config]: [string, any]) => (
                    <div key={mode} className="bg-white/5 border border-white/10/60 p-3 rounded-xl">
                      <div className="mb-2 text-xs font-bold text-zinc-200">{mode}</div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] text-zinc-500 mb-1 block">Brilho (%)</label>
                          <input
                            type="number" min="0" max="100"
                            value={config.brightness || 0}
                            onChange={(e) => handleUpdateModeConfig(mode, "brightness", parseInt(e.target.value))}
                            className="w-full bg-white/10 border border-white/10 text-xs px-2 py-1 rounded"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 mb-1 block">Cor Hexo</label>
                          <div className="flex gap-2 items-center">
                            <input
                              type="color"
                              value={config.color || "#000000"}
                              onChange={(e) => handleUpdateModeConfig(mode, "color", e.target.value)}
                              className="w-6 h-6 border-0 bg-transparent rounded cursor-pointer shrink-0"
                            />
                            <input
                              type="text"
                              value={config.color || ""}
                              onChange={(e) => handleUpdateModeConfig(mode, "color", e.target.value)}
                              className="w-full bg-white/10 border border-white/10 text-[10px] font-mono px-2 py-1 rounded uppercase"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 mb-1 block">Ar (Â°C)</label>
                          <input
                            type="number" min="16" max="30"
                            value={config.temp || 24}
                            onChange={(e) => handleUpdateModeConfig(mode, "temp", parseInt(e.target.value))}
                            className="w-full bg-black/50 border border-white/10 text-xs px-2 py-1 rounded"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </>
  );
});
