import { getServerUrl } from "../lib/api";
import React, { useState } from "react";
import {
  Shield,
  Trash2,
  Terminal,
  Cpu,
  RefreshCw,
  HardDrive,
  Database,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Play
} from "lucide-react";

interface ActionConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}

export default function SSHDiagnostics() {
  const [logs, setLogs] = useState<string[]>([
    "PS C:\\Users\\Admin> _",
    "[POWERSHELL] Aguardando acionamento tático...",
    "Sistemas operacionais de automação ativos sobre Windows local host."
  ]);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [terminalSearch, setTerminalSearch] = useState("");

  const diagnosticActions: ActionConfig[] = [
    {
      id: "clean_cache",
      name: "Limpar Cache de RAM",
      description: "Libera caches inativos de processos em espera no Windows.",
      icon: Cpu,
      color: "border-cyan-800 text-cyan-400 bg-cyan-950/20 hover:border-cyan-500"
    },
    {
      id: "docker_prune",
      name: "Prunar Docker (Prune)",
      description: "Remove containers ociosos, volumes anônimos e builds no SSD.",
      icon: HardDrive,
      color: "border-emerald-800 text-emerald-400 bg-emerald-950/20 hover:border-emerald-500"
    },
    {
      id: "purge_vram",
      name: "Esvaziar VRAM da GPU",
      description: "Executa pytorch empty_cache e expurga caches CUDA inativos.",
      icon: Terminal,
      color: "border-rose-800 text-rose-400 bg-rose-950/20 hover:border-rose-500"
    },
    {
      id: "postgres_backup",
      name: "Backup do PostgreSQL",
      description: "Roda pg_dump local exportando dados estruturados de finanças/agenda.",
      icon: Database,
      color: "border-amber-800 text-amber-400 bg-amber-950/20 hover:border-amber-500"
    }
  ];

  const handleExecuteAction = async (actionId: string) => {
    setRunningAction(actionId);
    // Initial feedback
    const baseAction = diagnosticActions.find(a => a.id === actionId);
    setLogs(prev => [
      ...prev.filter(l => !l.includes("_")),
      `\nvinicius@RyzenDesktop:~$ trigger_maintenance --mode=${actionId}`,
      `[SSH] [${new Date().toLocaleTimeString()}] Inicializando rota segura de comunicação SSH...`,
      `[SSH] [PROCESSO] Efetuando handshake estruturado com a VM...`
    ]);

    try {
      const res = await fetch(getServerUrl() + "/api/maintenance/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionId })
      });
      if (res.ok) {
        const data = await res.json();
        // Simulate real-time staggered printing of logs
        let currentLogsIndex = 0;
        const interval = setInterval(() => {
          if (currentLogsIndex < data.logs.length) {
            setLogs(prev => [...prev, data.logs[currentLogsIndex]]);
            currentLogsIndex++;
          } else {
            setLogs(prev => [...prev, "vinicius@RyzenDesktop:~$ _"]);
            clearInterval(interval);
            setRunningAction(null);
          }
        }, 180);
      } else {
        throw new Error("VM Host retornou erro de permissão ou infraestrutura.");
      }
    } catch (err: any) {
      setLogs(prev => [
        ...prev,
        `[ERRO] [${new Date().toLocaleTimeString()}] Falha na rotina: ${err.message}`,
        "vinicius@RyzenDesktop:~$ _"
      ]);
      setRunningAction(null);
    }
  };

  const handleCustomCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalSearch.trim()) return;

    const cmd = terminalSearch.trim();
    setLogs(prev => [
      ...prev.filter(l => !l.includes("_")),
      `vinicius@RyzenDesktop:~$ ${cmd}`,
      `[INFO] '${cmd}' recebido. Para segurança extrema do senhor, comandos arbitrários são filtrados pela diretiva de sandbox offline. Utilize os atalhos de um clique autorizados.`
    ]);

    setTerminalSearch("");
    setTimeout(() => {
      setLogs(prev => [...prev, "vinicius@RyzenDesktop:~$ _"]);
    }, 400);
  };

  return (
    <div className="space-y-6 font-mono text-zinc-300">
      <div className="bg-zinc-900/35 border border-zinc-800 p-6 rounded-2xl">
        <div className="border-b border-zinc-800 pb-4 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-emerald-400 transition-opacity duration-300" />
            <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">
              Console de Diagnósticos Rápidos (WSL SSH)
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Hub de segurança e comandos de manutenção frequentes de 1-clique executados diretamente na VM por trás dos bastidores.
          </p>
        </div>

        {/* Diagnostic triggers grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {diagnosticActions.map((action) => {
            const IconComponent = action.icon;
            const isRunningThis = runningAction === action.id;

            return (
              <div
                key={action.id}
                className={`p-4 border rounded-xl flex flex-col justify-between space-y-3 transition-all ${
                  action.color
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-zinc-950/60 rounded-lg">
                    <IconComponent className="h-5 w-5 shrink-0" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold font-sans text-zinc-100">{action.name}</h3>
                    <p className="text-[10.5px] text-zinc-400 font-sans tracking-wide leading-relaxed mt-1">
                      {action.description}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => handleExecuteAction(action.id)}
                    disabled={runningAction !== null}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider cursor-pointer font-mono uppercase flex items-center gap-1.5 transition-all outline-none ${
                      runningAction !== null
                        ? "bg-zinc-900 border border-zinc-800 text-zinc-650 cursor-not-allowed"
                        : "bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-500 hover:text-zinc-100 active:scale-95"
                    }`}
                  >
                    {isRunningThis ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin text-emerald-400" />
                        <span>Manutenção...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 text-emerald-400" />
                        <span>Disparar SSH</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Simulated-Real dynamic green shell terminal mock */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.06)]">
          {/* Native-like bar */}
          <div className="bg-zinc-900 px-4 py-2 flex items-center justify-between border-b border-zinc-950 text-[10px] text-zinc-500">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
              <span className="font-mono text-zinc-400 font-bold ml-2">SSH Client (WSL2-Session)</span>
            </div>
            <span>PORT 22</span>
          </div>

          {/* Console layout */}
          <div className="p-4 bg-zinc-950 min-h-[220px] max-h-[350px] overflow-y-auto font-mono text-[11px] text-zinc-300 space-y-1.5 scrollbar-thin select-text">
            {logs.map((log, index) => {
              if (log.startsWith("vinicius@RyzenDesktop:~$")) {
                return (
                  <div key={index} className="text-cyan-400 font-semibold pt-1">
                    {log}
                  </div>
                );
              }
              if (log.includes("[SUCCESS]")) {
                return (
                  <div key={index} className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
                    {log}
                  </div>
                );
              }
              if (log.includes("[ERRO]")) {
                return (
                  <div key={index} className="text-rose-500 font-bold flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3 text-rose-500 shrink-0" />
                    {log}
                  </div>
                );
              }
              if (log.includes("[STATS]")) {
                return (
                  <div key={index} className="text-lime-400 font-semibold pl-4">
                    {log}
                  </div>
                );
              }
              return (
                <div key={index} className="text-zinc-400 leading-relaxed pl-4">
                  {log}
                </div>
              );
            })}
          </div>

          {/* Terminal input simulation */}
          <form
            onSubmit={handleCustomCommandSubmit}
            className="border-t border-zinc-900 bg-zinc-950/40 p-2 flex items-center font-mono"
          >
            <span className="text-cyan-400 text-[11px] font-semibold px-2 shrink-0 select-none">
              vinicius@RyzenDesktop:~$
            </span>
            <input
              type="text"
              value={terminalSearch}
              onChange={(e) => setTerminalSearch(e.target.value)}
              disabled={runningAction !== null}
              placeholder="Digite comandos de engenharia (ex: df -h)..."
              className="flex-1 bg-transparent text-[11px] border-none outline-none text-zinc-100 disabled:opacity-40"
            />
          </form>
        </div>
      </div>
    </div>
  );
}
