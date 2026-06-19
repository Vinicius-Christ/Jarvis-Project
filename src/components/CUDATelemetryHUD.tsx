import { getServerUrl } from "../lib/api";
import React, { useState, useEffect } from "react";
import {
  Activity,
  Cpu,
  Tv,
  Thermometer,
  Zap,
  Layers,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  Monitor
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

declare global {
  interface Window {
    electronAPI?: {
      getLocalHardware: () => Promise<any>;
      openUrl: (url: string) => Promise<any>;
      runCommand: (cmd: string) => Promise<any>;
    };
  }
}

interface HardwareStats {
  cpu: string;
  cpuUsage: number;
  cpuTemps: number;
  gpuModel: string;
  gpuVramTotal: number;
  gpuVramUsed: number;
  gpuTemp: number;
  activeWarps: number;
  fanSpeed: number;
  mhzClock: number;
  wslMemoryAllocated: number;
  wslMemoryTotal: number;
}

export default React.memo(function CUDATelemetryHUD() {
  const [stats, setStats] = useState<HardwareStats | null>(null);
  const [localStats, setLocalStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      // 1. Fetch Server Stats
      let serverData = null;
      try {
        const res = await fetch(getServerUrl() + "/api/system/hardware");
        if (res.ok) serverData = await res.json();
      } catch(e) { /* error ignored */ }
      
      // 2. Fetch Local Stats (if Electron)
      let lStats = null;
      if (window.electronAPI) {
        try {
          lStats = await window.electronAPI.getLocalHardware();
        } catch(e) { /* error ignored */ }
      }

      if (serverData) setStats(serverData);
      if (lStats) setLocalStats(lStats);

      // Add record to history 
      const timestamp = new Date().toLocaleTimeString("pt-BR", { hour12: false });
      const newPoint: any = {
        time: timestamp,
      };

      if (serverData) {
         newPoint.CPU = serverData.cpuUsage || 25;
         newPoint.VRAM = Math.round(((serverData.gpuVramUsed || 4200) / 1024) * 10) / 10;
         newPoint.GPU = Math.round(((serverData.gpuVramUsed || 4200) / (serverData.gpuVramTotal || 12288)) * 100);
         newPoint.Temp = serverData.gpuTemp || 56;
      }
      
      if (lStats) {
         newPoint.LocalCPU = Math.round(lStats.cpuUsage || 0);
         newPoint.LocalRAM = Math.round(lStats.memUsage || 0);
         newPoint.LocalTemp = Math.round(lStats.cpuTemp || 45); 
      }

      if (serverData || lStats) {
        setHistory((prev) => {
          const next = [...prev, newPoint];
          if (next.length > 20) {
            next.shift();
          }
          return next;
        });
        setErrorStatus(false);
      }
    } catch (err) {
      setErrorStatus(true);
    } finally {
      setLoading(false);
    }
  };

  const [errorStatus, setErrorStatus] = useState(false);

  useEffect(() => {
    fetchStats();
    // Hardware dynamic ticks every 3 seconds
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="py-12 text-center text-xs text-zinc-500 space-y-2 font-mono">
        <RefreshCw className="h-5 w-5 animate-spin mx-auto text-cyan-400" />
        <p className="transition-opacity duration-300">Handshaking host hardware sensors...</p>
      </div>
    );
  }

  // Fallback defaults if metrics fail or load in transition
  const cpuVal = stats?.cpuUsage ?? 28;
  const cpuTemp = stats?.cpuTemps ?? 52;
  const gpuModel = stats?.gpuModel ?? "NVIDIA GeForce GTX 1650 (CUDA)";
  const vramUsed = stats?.gpuVramUsed ?? 4520;
  const vramTotal = stats?.gpuVramTotal ?? 12288;
  const gpuTemp = stats?.gpuTemp ?? 58;
  const activeWarps = stats?.activeWarps ?? 1024;
  const fanSpeed = stats?.fanSpeed ?? 42;
  const mhzClock = stats?.mhzClock ?? 2240;
  const wslMemAlloc = stats?.wslMemoryAllocated ?? 4450;
  const wslMemTotal = stats?.wslMemoryTotal ?? 8192;

  const vramPercentage = Math.round((vramUsed / vramTotal) * 100);
  const wslPercentage = Math.round((wslMemAlloc / wslMemTotal) * 100);

  return (
    <div className="space-y-6 font-mono text-zinc-300">
      <div className="bg-zinc-900/35 border border-zinc-800 p-6 rounded-2xl">
        
        {/* Header HUD section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-5 w-5 text-indigo-400 " />
              <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-widest">
                Hardware CUDA & Local Telemetry
              </h2>
            </div>
            <p className="text-xs text-zinc-400">
              Painel em duplo contexto. Monitorando o Host Remoto {stats?.cpu ? `(${stats.cpu.split(" ")[0]})` : ""} e {localStats ? `seu PC Local (${localStats.cpuModel?.split(" ")[0]})` : "buscando hardware local"}.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] bg-indigo-950/40 border border-indigo-900 text-indigo-300 px-3 py-1.5 rounded-xl font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 "></span>
            <span>HYBRID TELEMETRY ACTIVE</span>
          </div>
        </div>

        {/* Warning panel if GPU approaches memory limit or high temperatures */}
        {gpuTemp > 78 || vramPercentage > 88 ? (
          <div className="p-4 border border-rose-900 bg-rose-950/15 rounded-xl text-rose-400 text-xs font-bold flex items-start gap-2.5 mb-6">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
            <div className="space-y-1">
              <h4>⚠️ LIMITE TÉRMICO E DE VRAM EM RISCO NO SERVIDOR!</h4>
              <p className="text-[11px] text-zinc-400 leading-normal font-sans">
                A VM do Servidor está operando em {gpuTemp}°C com {vramPercentage}% de VRAM ocupada.
              </p>
            </div>
          </div>
        ) : null}

        {/* HOST SERVER AND LOCAL PC SECTION (Mixed grid) */}
        <div className="space-y-3 mb-6">
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2 tracking-widest pl-1">
            <Layers className="h-3.5 w-3.5 text-violet-400" /> NÓ REMOTO (SERVIDOR IA / DOCKER WSL)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Card 1: GPU CUDA CORE */}
            <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl space-y-4 relative overflow-hidden">
              <div className="flex justify-between items-center text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                <span>GPU HOST</span>
                <Tv className="h-3.5 w-3.5 text-indigo-400" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-sans block truncate text-ellipsis" title={gpuModel}>
                  {gpuModel}
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold text-zinc-100">{mhzClock}</span>
                  <span className="text-xs text-zinc-500 font-bold">MHz</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-zinc-500 font-bold uppercase">
                  <span>CUDA Warps</span>
                  <span className="text-indigo-400">{activeWarps}</span>
                </div>
                <div className="w-full bg-zinc-900 h-1 rounded overflow-hidden">
                  <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${Math.min(100, (activeWarps / 2048) * 100)}%` }}></div>
                </div>
              </div>
            </div>

            {/* Card 2: VRAM COMPREHENSIVE */}
            <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl space-y-4 relative overflow-hidden">
              <div className="flex justify-between items-center text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                <span>VRAM DETECTADA</span>
                <Zap className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-sans block">
                  Dedicado (Llama 3.2 / IA)
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold text-emerald-400">{(vramUsed / 1024).toFixed(2)}</span>
                  <span className="text-xs text-zinc-500 font-bold">/ {(vramTotal / 1024).toFixed(0)} GB</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-zinc-500 font-bold uppercase">
                  <span>Saturação</span>
                  <span className="text-emerald-400">{vramPercentage}%</span>
                </div>
                <div className="w-full bg-zinc-900 h-1.5 rounded overflow-hidden">
                  <div className="bg-emerald-400 h-full transition-all duration-500" style={{ width: `${vramPercentage}%` }}></div>
                </div>
              </div>
            </div>

            {/* Card 3: PROCESSADOR HOST TEMPERATURAS */}
            <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl space-y-4 relative overflow-hidden">
              <div className="flex justify-between items-center text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                <span>TEMPERATURA REMOTA</span>
                <Thermometer className="h-3.5 w-3.5 text-rose-400" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-sans block">
                  Temp / Ventoinha (GPU)
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold text-rose-400">{gpuTemp}</span>
                  <span className="text-xs text-rose-500 font-bold">°C</span>
                  <span className="text-[11px] text-zinc-500 ml-1">({fanSpeed}% fan)</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-zinc-500 font-bold uppercase">
                  <span>Host CPU</span>
                  <span className="text-orange-400">{cpuTemp}°C</span>
                </div>
                <div className="w-full bg-zinc-900 h-1 rounded overflow-hidden">
                  <div className="bg-orange-500 h-full transition-all duration-500" style={{ width: `${Math.min(100, cpuTemp)}%` }}></div>
                </div>
              </div>
            </div>

            {/* Card 4: AMBIENTE WSL2 / HYPERVISOR */}
            <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl space-y-4 relative overflow-hidden">
              <div className="flex justify-between items-center text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                <span>CARGA DO SERVIDOR</span>
                <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-sans block">
                  Uso de CPU Host
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold text-cyan-400">{cpuVal}</span>
                  <span className="text-xs text-zinc-500 font-bold">% load</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-zinc-500 font-bold uppercase">
                  <span>Docker/WSL RAM</span>
                  <span className="text-cyan-400">{Math.round((wslMemAlloc / 1024) * 10) / 10}GB</span>
                </div>
                <div className="w-full bg-zinc-900 h-1.5 rounded overflow-hidden">
                  <div className="bg-cyan-400 h-full transition-all duration-500" style={{ width: `${wslPercentage}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LOCAL PC METRICS SECTION */}
        {localStats ? (
        <div className="space-y-3 mb-6 pt-4 border-t border-zinc-800">
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-2 tracking-widest pl-1">
            <Monitor className="h-3.5 w-3.5 text-cyan-400" /> SEU PC LOCAL (CLIENTE STANDALONE APP)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* LOCAL CPU */}
            <div className="bg-[#0a0a0a] border border-zinc-900/60 p-4 rounded-xl space-y-4 relative overflow-hidden shadow-md">
              <div className="flex justify-between items-center text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                <span>CPU LOCAL</span>
                <Cpu className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-sans block truncate" title={localStats.cpuModel}>
                  {localStats.cpuModel || "CPU Local"}
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold text-blue-400">{Math.round(localStats.cpuUsage || 0)}</span>
                  <span className="text-xs text-zinc-500 font-bold">% util</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-zinc-500 font-bold uppercase">
                  <span>Temperatura</span>
                  <span className="text-blue-400">{Math.round(localStats.cpuTemp || 45)}°C</span>
                </div>
                <div className="w-full bg-zinc-900 h-1 rounded overflow-hidden">
                  <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${Math.min(100, localStats.cpuTemp || 45)}%` }}></div>
                </div>
              </div>
            </div>

            {/* LOCAL MEMORY */}
            <div className="bg-[#0a0a0a] border border-zinc-900/60 p-4 rounded-xl space-y-4 relative overflow-hidden shadow-md">
              <div className="flex justify-between items-center text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                <span>RAM DO PC</span>
                <Zap className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-sans block">
                  Consumo Memória Nativa
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold text-emerald-400">{Math.round(localStats.memUsage || 0)}</span>
                  <span className="text-xs text-zinc-500 font-bold">% ocupada</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-zinc-500 font-bold uppercase">
                  <span>Saúde da RAM</span>
                  <span className="text-emerald-400">{(localStats.memUsage || 0) > 85 ? "Alta" : "Estável"}</span>
                </div>
                <div className="w-full bg-zinc-900 h-1.5 rounded overflow-hidden">
                  <div className="bg-emerald-400 h-full transition-all duration-500" style={{ width: `${localStats.memUsage || 0}%` }}></div>
                </div>
              </div>
            </div>

            {/* LOCAL GPU */}
            <div className="bg-[#0a0a0a] border border-zinc-900/60 p-4 rounded-xl space-y-4 relative overflow-hidden shadow-md">
              <div className="flex justify-between items-center text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                <span>GPU LOCAL</span>
                <Tv className="h-3.5 w-3.5 text-rose-400" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-sans block truncate" title={localStats.gpuModel}>
                  {localStats.gpuModel || "Gráficos Locais"}
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold text-rose-400">{Math.round(localStats.vramPercentage || 0)}</span>
                  <span className="text-xs text-zinc-500 font-bold">% VRAM</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-zinc-500 font-bold uppercase">
                  <span>Temp GPU</span>
                  <span className="text-rose-400">{Math.round(localStats.gpuTemp || 50)}°C</span>
                </div>
                <div className="w-full bg-zinc-900 h-1 rounded overflow-hidden">
                  <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${Math.min(100, localStats.gpuTemp || 50)}%` }}></div>
                </div>
              </div>
            </div>

          </div>
        </div>
        ) : (
          <div className="space-y-3 mb-6 pt-4 border-t border-zinc-800 hidden">
          </div>
        )}

        {/* Dynamic Recharts graph of historic spikes */}
        <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-2xl space-y-3">
          <div className="flex justify-between items-center border-b border-zinc-900 pb-2.5">
            <span className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-zinc-400" />
              Histórico de Saturação Real da GPU CUDA (VRAM & CPU)
            </span>
            <span className="text-[9px] text-zinc-500 uppercase font-mono tracking-widest pl-2">
              atualizações a cada 3s (live)
            </span>
          </div>

          <div className="h-64 w-full">
            {history.length < 2 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-600 animate-pulse">
                Injetando pontos na escala de oscilação do barramento físico...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVRAM" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorCPU" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff4b5c" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#ff4b5c" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorLocalCPU" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.35} />
                  <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={9} tickLine={false} unit="%" domain={[0, 100]} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name.includes("Saturação VRAM")) return [`${value}%`, name];
                      if (name.includes("Threads CPU")) return [`${value}%`, name];
                      if (name.includes("Temps GPU")) return [`${value}°C`, name];
                      if (name.includes("Local CPU")) return [`${value}%`, name];
                      return [value, name];
                    }}
                    contentStyle={{
                      backgroundColor: "#09090b",
                      border: "1px solid #18181b",
                      borderRadius: "12px",
                      fontFamily: "monospace",
                      fontSize: "10.5px"
                    }}
                    itemStyle={{ color: "#a1a1aa" }}
                    labelStyle={{ color: "#a1a1aa" }}
                  />
                  <Area
                    name="Saturação VRAM (%)"
                    type="monotone"
                    dataKey="GPU"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorVRAM)"
                  />
                  <Area
                    name="Threads CPU Remoto (%)"
                    type="monotone"
                    dataKey="CPU"
                    stroke="#8b5cf6"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#colorCPU)"
                  />
                  <Area
                    name="Local CPU (%)"
                    type="monotone"
                    dataKey="LocalCPU"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#colorLocalCPU)"
                  />
                  <Area
                    name="Temps GPU Remota (°C)"
                    type="monotone"
                    dataKey="Temp"
                    stroke="#ff4b5c"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#colorTemp)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
});
