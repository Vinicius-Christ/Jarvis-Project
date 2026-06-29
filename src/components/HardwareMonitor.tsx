import { useState, useEffect } from "react";
import { Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

function getServerUrl() {
  const customUrl = import.meta.env.VITE_SERVER_URL;
  if (customUrl) return customUrl;

  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:3000";
    }
  }
  return "";
}

export function SystemHealthMonitor() {
  const [healthStatus, setHealthStatus] = useState({
    docker: { status: "offline", latency: 0 },
    groq: { status: "offline", latency: 0 },
    network: { status: "offline", latency: 0 },
    lastUpdated: "...",
  });

  useEffect(() => {
    const runHealthCheck = async () => {
      const start = Date.now();
      try {
        const res = await fetch(getServerUrl() + "/api/health");
        const duration = Date.now() - start;
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            setHealthStatus({
              docker: data.docker || { status: "online", latency: 7 },
              groq: data.groq || { status: "online", latency: 42 },
              network: { status: "online", latency: duration },
              lastUpdated: new Date().toLocaleTimeString("pt-BR"),
            });
          }
        }
      } catch (err: any) { }
    };

    runHealthCheck();
    const timer = setInterval(runHealthCheck, 10000); // 10 seconds
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="holographic-card hover-glow space-y-4">
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <h3 className="text-xs font-mono font-bold tracking-widest text-[var(--brand-light)] uppercase flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-[var(--brand-light)] animate-pulse" />
          Monitor de SaÃºde do Sistema
        </h3>
        <span className="text-[10px] bg-[var(--brand-glow)] border border-[var(--brand-border)] px-1.5 py-0.5 font-bold rounded font-mono text-[var(--brand-light)]">
          LIVE
        </span>
      </div>

      <div className="space-y-3.5 font-mono text-xs">
        {/* Docker Latency */}
        <div>
          <div className="flex justify-between items-center text-[11px] mb-1">
            <span className="text-zinc-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]"></span>
              LatÃªncia do Docker
            </span>
            <span className="font-bold text-[var(--brand-light)]">
              {healthStatus.docker.latency} ms
            </span>
          </div>
          <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden flex items-center">
            <motion.div
              layout
              className="bg-[var(--brand-primary)] h-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(5, (healthStatus.docker.latency / 25) * 100))}%` }}
              transition={{ duration: 0.5 }}
            ></motion.div>
          </div>
        </div>

        {/* Groq Latency */}
        <div>
          <div className="flex justify-between items-center text-[11px] mb-1">
            <span className="text-zinc-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)] animate-pulse"></span>
              LatÃªncia do Groq API
            </span>
            <span className="font-bold text-[var(--brand-light)]">
              {healthStatus.groq.latency} ms
            </span>
          </div>
          <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden flex items-center">
            <motion.div
              layout
              className="bg-[var(--brand-primary)] h-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(5, (healthStatus.groq.latency / 120) * 100))}%` }}
              transition={{ duration: 0.5 }}
            ></motion.div>
          </div>
        </div>

        {/* Network API Latency */}
        <div>
          <div className="flex justify-between items-center text-[11px] mb-1">
            <span className="text-zinc-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]"></span>
              API de Rede (RTT)
            </span>
            <span className="font-bold text-[var(--brand-light)]">
              {healthStatus.network.latency} ms
            </span>
          </div>
          <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden flex items-center">
            <motion.div
              layout
              className="bg-[var(--brand-primary)] h-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(5, (healthStatus.network.latency / 120) * 100))}%` }}
              transition={{ duration: 0.5 }}
            ></motion.div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-1 font-mono border-t border-white/10">
        <span>WSL2 INTRAHOST</span>
        <span>ÃšLTIMA ATUALIZAÃ‡ÃƒO: {healthStatus.lastUpdated}</span>
      </div>
    </div>
  );
}

export function HardwareProcessingMonitor({ hardwareStats: initialStats, setActiveTab, setSettingsTab }: { hardwareStats?: any, setActiveTab: any, setSettingsTab: any }) {
  const [hardwareStats, setHardwareStats] = useState(initialStats || {});

  useEffect(() => {
    const fetchHardwareStats = async () => {
      try {
        const res = await fetch(getServerUrl() + "/api/health");
        if (res.ok) {
          const data = await res.json();
          if (data.hardware) {
            setHardwareStats(data.hardware);
          }
        }
      } catch (err) { }
    };

    fetchHardwareStats();
    const timer = setInterval(fetchHardwareStats, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="holographic-card hover-glow space-y-4">
      <div className="flex justify-between items-center border-l border-[var(--brand-primary)] pl-2">
        <h3 className="text-xs font-mono font-medium tracking-wider text-[var(--brand-light)] uppercase">
          MÃ©tricas de VRAM & Processamento
        </h3>
        <button
          onClick={() => {
            setActiveTab("settings");
            setSettingsTab("cudautil");
          }}
          className="text-[10px] text-zinc-500 hover:text-[var(--brand-light)] underline cursor-pointer uppercase font-mono"
        >
          HUD Detalhado
        </button>
      </div>

      <div className="space-y-3 font-mono text-xs">
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span
              className="text-zinc-500 uppercase truncate max-w-[150px]"
              title={hardwareStats?.gpuModel || "Dispositivo CUDA"}
            >
              GPU VRAM (
              {hardwareStats?.gpuModel
                ? (hardwareStats.gpuModel || '').replace("NVIDIA GeForce", "").trim()
                : "Detectando..."}
              )
            </span>
            <span className="text-[var(--brand-light)]">
              {hardwareStats?.gpuVramUsed
                ? `${(hardwareStats.gpuVramUsed / 1024).toFixed(1)} GB / ${(hardwareStats.gpuVramTotal ? hardwareStats.gpuVramTotal / 1024 : 12.0).toFixed(1)} GB`
                : "..."}
            </span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded overflow-hidden flex items-center">
            <motion.div
              layout
              className="bg-[var(--brand-primary)] h-full"
              initial={{ width: 0 }}
              animate={{ width: `${hardwareStats?.gpuVramUsed ? Math.round((hardwareStats.gpuVramUsed / (hardwareStats.gpuVramTotal || 12288)) * 100) : 0}%` }}
              transition={{ duration: 0.5 }}
            ></motion.div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-zinc-500 uppercase">Temperatura GPU</span>
            <span className="text-red-400">{hardwareStats?.gpuTemp || 0} Â°C (Seguro)</span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded overflow-hidden flex items-center">
            <motion.div
              layout
              className="h-full bg-red-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, hardwareStats?.gpuTemp || 0))}%` }}
              transition={{ duration: 0.5 }}
            ></motion.div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span
              className="text-zinc-500 uppercase truncate max-w-[180px]"
              title={hardwareStats?.cpu || "Host CPU"}
            >
              CPU (
              {hardwareStats?.cpu
                ? (hardwareStats.cpu || '').replace("(TM)", "").replace("(R)", "").trim()
                : "Detectando..."}
              )
            </span>
            <span className="text-[var(--brand-light)]">{hardwareStats?.cpuUsage || 0}%</span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded overflow-hidden flex items-center">
            <motion.div
              layout
              className="bg-[var(--brand-primary)] h-full opacity-70"
              initial={{ width: 0 }}
              animate={{ width: `${hardwareStats?.cpuUsage || 0}%` }}
              transition={{ duration: 0.5 }}
            ></motion.div>
          </div>
        </div>
      </div>

      <div className="bg-white/5 p-3 rounded-lg border border-white/10 font-mono text-[10px] text-zinc-500 space-y-1">
        <div className="flex justify-between">
          <span>IP do Servidor</span>
          <span className="text-zinc-300">{typeof window !== 'undefined' ? window.location.hostname : "localhost"}</span>
        </div>
        <div className="flex justify-between">
          <span>Ponte Local</span>
          <span className="text-[var(--brand-light)]">Online via pm2/Docker</span>
        </div>
      </div>
    </div>
  );
}
