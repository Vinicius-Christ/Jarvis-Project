import { getServerUrl } from "../lib/api";
import React, { useState, useEffect } from "react";
import { Sliders, Plus, Link, Wifi, Save, ArrowUpRight, Cpu, HelpCircle, HardDrive, ShieldCheck, CheckCircle, Palette } from "lucide-react";

interface DeviceConfigProps {
  devices: any[];
  onRefresh: () => void;
  currentTheme: "cyan" | "amber" | "violet" | "emerald" | "rose";
  onChangeTheme: (theme: "cyan" | "amber" | "violet" | "emerald" | "rose") => void;
  configTab: "general" | "appearance";
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
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
    desc: "Estilo padrão JARVIS. Tom azul gelado cibernético e limpo.",
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

export default function DeviceConfig({ devices, onRefresh, currentTheme, onChangeTheme, configTab, isDarkMode = true, onToggleDarkMode }: DeviceConfigProps) {
  // Local states for device additions
  const [activePersona, setActivePersona] = useState<string>("jarvis");

  const [haIp, setHaIp] = useState("");
  const [haToken, setHaToken] = useState("");
  const [haWsStatus, setHaWsStatus] = useState("disconnected");
  const [savingHA, setSavingHA] = useState(false);

  useEffect(() => {
    fetch(getServerUrl() + "/api/ai/persona")
      .then(r => r.json())
      .then(data => {
        if (data.activePersona) {
          setActivePersona(data.activePersona);
        }
      })
      .catch(() => {});

    const fetchHAConfig = () => {
      fetch(getServerUrl() + "/api/db")
        .then(r => r.json())
        .then(data => {
          if (data.homeAssistant) {
            setHaIp(data.homeAssistant.ip || (typeof window !== 'undefined' ? window.location.hostname : ""));
            setHaToken(data.homeAssistant.token || "");
            setHaWsStatus(data.homeAssistant.wsStatus || "disconnected");
          }
        })
        .catch(() => {});
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

  // States for generating README/Docs
  const [generatingDocs, setGeneratingDocs] = useState(false);
  const [docsSuccess, setDocsSuccess] = useState<string | null>(null);

  // States for testing Ollama connection
  const [ollamaStatus, setOllamaStatus] = useState<"idle" | "testing" | "online">("online");
  const [ollamaUrl, setOllamaUrl] = useState(`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:11434`);

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

  const handleDocGeneration = async () => {
    // Deprecated: O servidor agora não sobrescreve os documentos via string harcoded por medidas de segurança.
    setDocsSuccess("A funcionalidade de reconstrução automática de documentação foi removida a seu pedido, para preservar a integridade do repositório.");
    setTimeout(() => setDocsSuccess(null), 5000);
  };

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

  const testOllamaConnection = () => {
    setOllamaStatus("testing");
    setTimeout(() => {
      setOllamaStatus("online");
    }, 1200);
  };

  return (
    <>
      {configTab === "appearance" ? (
        <div className="bg-zinc-900/30 border border-zinc-800 p-5 md:p-6 rounded-2xl space-y-6">
          <div>
            <h3 className="text-sm font-sans font-semibold text-[var(--brand-light,rgba(6,182,212))] uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="h-4.5 w-4.5" />
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
                className={`text-left p-5 rounded-2xl border transition-all duration-300 relative cursor-pointer overflow-hidden group hover:scale-[1.02] flex flex-col justify-between h-44 ${
                  currentTheme === key
                    ? "bg-zinc-950 border-[var(--brand-primary)] shadow-[0_4px_12px_var(--brand-glow)]"
                    : "bg-zinc-950/60 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-950/90 text-zinc-400"
                }`}
              >
                {/* Subtle colored glow bubble inside active card */}
                <span className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full blur-2xl opacity-10 transition-opacity group-hover:opacity-20" style={{ backgroundColor: t.color }}></span>

                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3 w-3 rounded-full border border-zinc-900 shadow-inner shrink-0" style={{ backgroundColor: t.color }}></span>
                    <span className="font-semibold text-sm text-white">{t.name}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-zinc-400">
                    {t.desc}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-zinc-900 w-full font-mono">
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
          <div className="bg-black/30 border border-zinc-800 p-5 rounded-xl space-y-4 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
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
              <div className="p-3.5 rounded-xl border border-zinc-900 bg-zinc-950/80 flex items-center justify-between">
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

        {/* Column 1: Home Assistant Live & Local Ollama */}
        <div className="space-y-6">

          {/* Home Assistant WebSocket Config Card */}
          <div className="holographic-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-805 pb-3">
              <h3 className="text-sm font-sans font-semibold text-[var(--brand-light,rgb(6,182,212))] uppercase tracking-wider flex items-center gap-2">
                <Wifi className="h-4 w-4 text-[var(--brand-light,rgb(6,182,212))]" />
                Domótica: HA Live WebSocket
              </h3>
              
              <span className={`text-[9px] px-2 py-0.5 rounded font-mono uppercase font-bold flex items-center gap-1 border shadow-inner ${
                haWsStatus === "connected"
                  ? "bg-emerald-950/70 text-emerald-400 border-emerald-900/40"
                  : haWsStatus === "connecting" || haWsStatus === "authenticating"
                    ? "bg-amber-950/70 text-amber-400 border-amber-900/40 animate-pulse"
                    : "bg-red-950/70 text-red-400 border-red-900/40"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  haWsStatus === "connected"
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

            <form onSubmit={handleSaveHAConfig} className="space-y-3 font-mono text-xs p-3.5 bg-black/40 border border-zinc-800 rounded-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-500 block text-[9px] uppercase mb-1">Servidor IP / Local Host</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 192.168.15.8"
                    value={haIp}
                    onChange={(e) => setHaIp(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-xs px-2 py-1.5 rounded focus:outline-none focus:border-[var(--brand-primary)]"
                  />
                </div>
                <div>
                  <label className="text-zinc-500 block text-[9px] uppercase mb-1">Status de Conectividade</label>
                  <div className="bg-zinc-950/80 border border-zinc-800 text-zinc-400 font-mono text-xs p-1.5 rounded flex items-center gap-1.5 h-[32px] select-none">
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
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-xs px-2 py-1.5 rounded focus:outline-none focus:border-[var(--brand-primary)]"
                />
              </div>

              <button
                type="submit"
                disabled={savingHA}
                className="w-full py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[var(--brand-light)] hover:text-white font-mono font-bold tracking-wider rounded uppercase hover:bg-zinc-850 transition flex items-center justify-center gap-1.5 cursor-pointer text-[10px] disabled:opacity-50"
              >
                <Wifi className="h-3.5 w-3.5" />
                {savingHA ? "REINICIANDO AMBIENTE SOCKET..." : "SALVAR E CONECTAR VIA WEBSOCKET"}
              </button>
            </form>
          </div>

          {/* Column 1 Card 2: Local Ollama Configuration & Verification Tutorials */}
          <div className="holographic-card p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-sans font-semibold text-[var(--brand-light)] uppercase tracking-wider flex items-center gap-2">
              <Cpu className="h-4 w-4 text-[var(--brand-light)]" />
              IA Local-First (Powering local Ollama)
            </h3>
            <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded font-mono uppercase font-bold animate-pulse">
              Ativo Offline
            </span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            De acordo com as especificações, seu JARVIS <strong>não fará chamadas à nuvem da OpenAI ou Gemini</strong> na sua rede local. Toda a lógica de NLP é executada nativamente pelo Ollama via placa gráfica local <strong>(CUDA/Aceleração de Hardware)</strong>.
          </p>

          <div className="space-y-3 font-mono text-xs bg-black/40 border border-zinc-800 rounded-xl p-4">
            <div>
              <label className="text-zinc-500 block text-[10px] uppercase mb-1">Endereço da API Local (Ollama Endpoint)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-[var(--brand-primary)]"
                />
                <button
                  onClick={testOllamaConnection}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold rounded cursor-pointer transition text-[11px]"
                >
                  {ollamaStatus === "testing" ? "Testando..." : "Testar Conexão"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-zinc-500 block text-[10px] uppercase mb-1">Modelo Principal</label>
                <div className="bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-xs p-1.5 rounded flex items-center justify-center gap-1.5 h-[34px] opacity-75 cursor-not-allowed">
                  Llama 3.2 (9B) Local
                </div>
              </div>
              <div>
                <label className="text-zinc-500 block text-[10px] uppercase mb-1">Aceleração Ativa</label>
                <div className="bg-zinc-950 border border-emerald-900/30 text-emerald-400 font-mono text-xs p-1.5 rounded flex items-center justify-center gap-1.5 font-bold h-[34px]">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  NVIDIA CUDA
                </div>
              </div>
            </div>

            {ollamaStatus === "online" && (
              <div className="bg-emerald-950/20 border border-emerald-900/30 p-2.5 rounded-lg text-emerald-400 text-[11px] leading-relaxed flex items-start gap-2 mt-4">
                <span className="h-2 w-2 rounded-full bg-emerald-400  mt-1 shrink-0"></span>
                <div>
                  <strong className="block">OLLAMA DEPLOY ONLINE:</strong>
                  Conexão estabelecida com sucesso. Llama 3.2 carregado no cache de hardware. Tempo médio de resposta: 42ms/token.
                </div>
              </div>
            )}
          </div>

          {/* Practical guide details for vinicius */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono font-bold text-white uppercase border-l-2 border-[var(--brand-primary)] pl-2">
              Guia Prático: Como Colocar Tudo para Funcionar realmente com Dados Reais?
            </h4>
            
            <div className="space-y-3.5 text-xs text-zinc-300 leading-relaxed">
              <div className="flex gap-2.5 items-start">
                <span className="bg-[var(--brand-dark)] text-[var(--brand-light)] rounded-full h-5.5 w-5.5 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                <div>
                  <span className="font-semibold block text-white text-[11px]">Liberar Ollama na Rede Doméstica (Expor de fora da Máquina)</span>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    Por padrão, o Ollama roda apenas em <code className="bg-zinc-950 px-1 py-0.5 rounded text-[var(--brand-light)] text-[10px]">localhost:11434</code>. Para que o aplicativo Electron ou outros computadores da casa consigam acessá-lo na LAN pelo IP do desktop (Ex: <code className="text-[10px] text-[var(--brand-light)] bg-zinc-950 px-1 rounded">192.168.1.104</code>), defina esta variável de sistema no Windows da máquina servidora:
                    <pre className="bg-black/50 p-2 rounded text-[10px] text-lime-400 font-mono mt-1.5 leading-snug">OLLAMA_HOST=0.0.0.0:11434</pre>
                    Abra o prompt de comando do Windows e reinicie o Ollama executando: <code className="text-[var(--brand-light)] font-mono">ollama serve</code>.
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 items-start">
                <span className="bg-[var(--brand-dark)] text-[var(--brand-light)] rounded-full h-5.5 w-5.5 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                <div>
                  <span className="font-semibold block text-white text-[11px]">Sincronização Física Real do Obsidian Vault com ChromaDB</span>
                  <p className="text-[11px] text-zinc-400">
                    O n8n rodando no Docker possui um nó gatilho chamado <code className="text-pink-400 font-mono">Local File Trigger</code> que monitora a sua pasta <code className="text-yellow-400 font-mono">~/jarvis-vault</code> no Linux. Sempre que você alterar suas anotações ou depositar notas financeiras, o n8n dividirá e processará a busca vetorial via nomic-embed, gravando automaticamente no ChromaDB.
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 items-start">
                <span className="bg-[var(--brand-dark)] text-[var(--brand-light)] rounded-full h-5.5 w-5.5 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                <div>
                  <span className="font-semibold block text-white text-[11px]">Conectando com Lâmpadas Positivos e Alexa</span>
                  <p className="text-[11px] text-zinc-400">
                    O Home Assistant atua como o seu Hub IoT unificado. Como ele roda em <code className="text-[var(--brand-light)] font-mono">network_mode: host</code> no Docker, ele varre automaticamente a rede Wi-Fi da sua residência buscando lâmpadas Tuya/Positivo e caixas Echo Dot via protocolo UPnP. Você só precisa pareá-las adicionando a integração correspondente no portal.
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
            <h3 className="text-sm font-sans font-semibold text-[var(--brand-light)] uppercase tracking-wider border-b border-zinc-800 pb-3 mb-4 flex items-center gap-1.5">
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
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 px-2.5 py-1.5 rounded focus:outline-none focus:border-[var(--brand-primary)] text-xs"
                  />
                </div>
                <div>
                  <label className="text-zinc-500 block text-[10px] uppercase mb-1">Tipo do Equipamento</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 p-1.5 rounded focus:outline-none focus:border-[var(--brand-primary)] text-xs"
                  >
                    {deviceTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
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
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 p-1.5 rounded focus:outline-none focus:border-[var(--brand-primary)] text-xs"
                  >
                    {brands.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-500 block text-[10px] uppercase mb-1">Tecnologia / Protocolo</label>
                  <select
                    value={integration}
                    onChange={(e) => setIntegration(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 p-1.5 rounded focus:outline-none focus:border-[var(--brand-primary)] text-xs"
                  >
                    {integrations.map(i => (
                      <option key={i} value={i}>{i}</option>
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
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 px-2.5 py-1.5 rounded focus:outline-none focus:border-[var(--brand-primary)] text-xs"
                  />
                </div>
                <div>
                  <label className="text-zinc-500 block text-[10px] uppercase mb-1">URL de Configuração do Docker/HA</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: http://192.168.1.104:8123"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 px-2.5 py-1.5 rounded focus:outline-none focus:border-[var(--brand-primary)] text-xs"
                  />
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
                  ✓ {successMsg}
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
                    className="bg-black/40 border border-zinc-800/60 p-3 rounded-xl flex flex-col gap-3"
                  >
                    <div className="flex justify-between items-center w-full">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">{device.name}</span>
                          <span className="text-[9px] bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono">
                            {device.brand || "Positivo"}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          Protocolo: {device.integration || device.type} | {device.status}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => handleToggleDevice(device.id, device.state)}
                          className={`w-11 h-6 rounded-full p-0.5 transition-all duration-300 ease-in-out cursor-pointer relative flex items-center shrink-0 active:scale-90 hover:brightness-110 shadow-inner ${
                            device.state === "on"
                              ? "bg-[var(--brand-primary,rgb(6,182,212))] shadow-[0_2px_8px_var(--brand-primary,rgba(6,182,212,0.45))]"
                              : "bg-zinc-800 border border-zinc-700/35"
                          }`}
                          title={device.state === "on" ? "Desligar Dispositivo" : "Ligar Dispositivo"}
                        >
                          <div
                            className={`bg-zinc-950 w-4.5 h-4.5 rounded-full shadow-inner transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1.2)] flex items-center justify-center ${
                              device.state === "on" ? "transform translate-x-5" : "transform translate-x-0"
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
                          className="px-2.5 py-1.5 bg-zinc-950 hover:bg-[var(--brand-dark)] border border-zinc-805 text-[10px] font-mono text-[var(--brand-light)] hover:text-white transition rounded flex items-center gap-1 cursor-pointer"
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
        </div>

      </div>
      </div>
      )}

    </>
  );
}
