import { getServerUrl } from "../lib/api";
import React, { useState, useEffect, useRef } from "react";
import { Terminal, RefreshCw, Layers, ShieldCheck, Play, Pause, XCircle, RotateCw, Server, Activity, FileText } from "lucide-react";
import jsPDF from "jspdf";

export default React.memo(function LogsDocker() {
  const [selectedContainer, setSelectedContainer] = useState<string>("all");
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  
  const [containerStatuses, setContainerStatuses] = useState<Record<string, string>>({
    chromadb: "running",
    n8n: "running",
    homeassistant: "running",
    postgres: "running",
    redis: "running"
  });

  const terminalRef = useRef<HTMLDivElement>(null);

  const containerOptions = [
    { id: "all", label: "Todos os Containers", color: "border-[var(--brand-primary)]/40 text-[var(--brand-light)]" },
    { id: "chromadb", label: "ChromaDB (Vector DB)", color: "border-blue-500/40 text-blue-400" },
    { id: "n8n", label: "n8n (Orquestrador)", color: "border-pink-500/40 text-pink-400" },
    { id: "homeassistant", label: "Home Assistant (Core)", color: "border-teal-500/40 text-teal-400" },
    { id: "postgres", label: "PostgreSQL (Finance/Agenda)", color: "border-[var(--brand-primary)]/40 text-[var(--brand-light)]" },
    { id: "redis", label: "Redis (Mensageria Voz)", color: "border-red-500/40 text-red-500" }
  ];

  const containersList = [
    { id: "chromadb", name: "ChromaDB", desc: "Base de dados vetorizados de aprendizados.", port: "8000" },
    { id: "n8n", name: "n8n Workflows", desc: "Orquestrador de gatilhos do Telegram e automações.", port: "5678" },
    { id: "homeassistant", name: "Home Assistant", desc: "Ponte local de IoT e sensores locais.", port: "8123" },
    { id: "postgres", name: "PostgreSQL", desc: "Banco estruturado principal do financeiro.", port: "5432" },
    { id: "redis", name: "Redis Core", desc: "Buffer em memória para mensageria assíncrona.", port: "6379" }
  ];

  const [agentStatuses, setAgentStatuses] = useState<Record<string, string>>({
    agent_coder: "running",
    agent_obsidian: "paused"
  });

  const workerNodesList = [
    { id: "agent_coder", name: "Agente SSH (Coder)", desc: "Worker rodando Llama 3.2 isolado focado em comandos SSH no host.", limit: "3.5GB VRAM" },
    { id: "agent_obsidian", name: "Agente Leitor (Vault)", desc: "Worker lendo arquivos .md do Obsidian via integração n8n.", limit: "1.5GB VRAM" },
    { id: "agent_research", name: "Agente Deep Research", desc: "Varredura DuckDuckGo via CLI.", limit: "2.5GB VRAM" }
  ];

  const fetchContainerStatuses = async () => {
    try {
      const res = await fetch(getServerUrl() + "/api/system/health");
      if (res.ok) {
        const data = await res.json();
        if (data.containers) {
          setContainerStatuses(data.containers);
        }
      }
    } catch (e) { /* ignore */ }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(getServerUrl() + `/api/docker/logs?container=${selectedContainer}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Erro ao carregar logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    let interval: NodeJS.Timeout | null = null;
    if (isLive) {
      interval = setInterval(() => {
        fetchLogs();
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedContainer, isLive]);

  useEffect(() => {
    fetchContainerStatuses();
    const timer = setInterval(fetchContainerStatuses, 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs.length]);

  const handleContainerAction = async (containerId: string, action: string) => {
    // Optimistic UI updates
    let nextState = "running";
    if (action === "stop") nextState = "exited";
    else if (action === "pause") nextState = "paused";
    else if (action === "unpause" || action === "start" || action === "restart") nextState = "running";

    setContainerStatuses(prev => ({ ...prev, [containerId]: nextState }));
    setActionMessage(`[DOCKER] Enviando comando '${action}' para o container: jarvis_${containerId}...`);
    
    try {
      const res = await fetch(getServerUrl() + "/api/docker/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ container: containerId, action })
      });
      if (res.ok) {
        const rData = await res.json();
        if (rData.newState) {
          setContainerStatuses(prev => ({ ...prev, [containerId]: rData.newState }));
        }
      }
    } catch (err) {
      console.error(err);
    }
    
    setTimeout(() => {
      setActionMessage(null);
      fetchLogs();
    }, 2000);
  };

  const triggerAction = async (action: string) => {
    if (action === "Pause Services (Hibernar)") {
      try {
        await fetch(getServerUrl() + "/api/system/toggle", { method: "POST" });
        window.location.reload();
      } catch (err) {
        console.error(err);
      }
      return;
    }
    
    setActionMessage(`[SISTEMA] Comando '${action}' disparado para o container '${selectedContainer}'...`);
    
    if (action === "Restart Container") {
      fetch(getServerUrl() + "/api/docker/restart", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ containerName: selectedContainer })
      });
    }

    setTimeout(() => {
      setActionMessage(null);
      fetchLogs(); // refresh logs
    }, 2500);
  };

  const handleExportPDF = () => {
    try {
      const pdf = new jsPDF("p", "pt", "a4");
      pdf.setFont("courier", "normal");
      pdf.setFontSize(8);
      
      const title = `Relatório de Diagnóstico Docker - ${selectedContainer}`;
      pdf.text(title, 20, 30);
      
      let y = 50;
      const margin = 20;
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      if (logs.length === 0) {
        pdf.text("Nenhum log encontrado para este container.", margin, y);
      } else {
        logs.forEach((log) => {
          const splitLines = pdf.splitTextToSize(log, pdf.internal.pageSize.getWidth() - margin * 2);
          splitLines.forEach((line: string) => {
            if (y > pageHeight - margin) {
              pdf.addPage();
              y = margin;
            }
            pdf.text(line, margin, y);
            y += 10;
          });
        });
      }
      
      pdf.save(`diagnostico_jarvis_${selectedContainer}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF", err);
    }
  };

  return (
    <div className="bg-[#030712]/90 border border-zinc-900 rounded-2xl p-5 md:p-6 space-y-6">
      
      {/* Tab Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h2 className="text-xl font-sans font-semibold text-white tracking-tight flex items-center gap-2">
            <Layers className="h-5 w-5 text-[var(--brand-light)] transition-opacity duration-300" />
            Central de Controle Docker Compose (HUD do Engenheiro)
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Monitore a integridade e gerencie de forma individual ou coletiva cada instância satélite do ecossistema JARVIS local.
          </p>
        </div>
        
        {/* Toggle live streaming */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer bg-[var(--brand-dark)] border border-[var(--brand-primary)]/50 text-[var(--brand-light)] hover:bg-[var(--brand-primary)] hover:text-black font-bold"
            title="Exportar Logs para PDF"
          >
            <FileText className="h-3 w-3" />
            Salvar log em PDF
          </button>
          
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer font-medium ${
              isLive 
                ? "bg-emerald-950/40 border border-emerald-500/40 text-emerald-400" 
                : "bg-zinc-900 border border-zinc-800 text-zinc-500"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isLive ? "bg-emerald-500 " : "bg-zinc-700"}`}></span>
            {isLive ? "[AUTO] Streaming Ativo" : "[PAUSADO] Logs Estáticos"}
          </button>

          <button
            onClick={fetchLogs}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
            title="Recarregar"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[var(--brand-light)]" : ""}`} />
          </button>
        </div>
      </div>

      {/* NEW: DOCKED CONTAINERS ORCHESTRATION CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {containersList.map((c) => {
          const status = containerStatuses[c.id] || "running";
          return (
            <div key={c.id} className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between space-y-3 relative overflow-hidden group">
              {/* Colored subtle indicator background */}
              <span className={`absolute -right-8 -bottom-8 w-16 h-16 rounded-full blur-xl opacity-5 transition-all duration-500`}
                style={{
                  backgroundColor: status === "running" ? "#10b981" : status === "paused" ? "#f59e0b" : "#f43f5e"
                }}
              />

              <div>
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-mono font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
                    <Server className="h-4 w-4 text-[var(--brand-light)] shrink-0" />
                    {c.name}
                  </h4>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold tracking-tight border ${
                    status === "running"
                      ? "bg-emerald-950/30 border-emerald-500/20 text-emerald-400"
                      : status === "paused"
                      ? "bg-amber-950/30 border-amber-500/20 text-amber-500"
                      : "bg-red-950/30 border-red-500/20 text-red-500 "
                  }`}>
                    {status}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 lines-clamp-2 font-sans leading-normal h-8">
                  {c.desc}
                </p>
                <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1 mt-2.5">
                  <span>Porta Ingress:</span>
                  <strong className="text-[var(--brand-light)]">{c.port}</strong>
                </div>
              </div>

              {/* Controls Row */}
              <div className="flex gap-1 pt-2.5 border-t border-zinc-900 z-10">
                {status !== "running" ? (
                  <button
                    onClick={() => handleContainerAction(c.id, status === "paused" ? "unpause" : "start")}
                    className="flex-1 py-1 rounded bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 text-[10px] font-mono font-bold flex items-center justify-center gap-1 cursor-pointer transition"
                  >
                    <Play className="h-3 w-3" /> Iniciar
                  </button>
                ) : (
                  <button
                    onClick={() => handleContainerAction(c.id, "pause")}
                    className="flex-1 py-1 rounded bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/30 hover:border-amber-500/50 text-amber-400 text-[10px] font-mono font-bold flex items-center justify-center gap-1 cursor-pointer transition"
                  >
                    <Pause className="h-3 w-3" /> Pausar
                  </button>
                )}
                {status === "running" && (
                  <button
                    onClick={() => handleContainerAction(c.id, "stop")}
                    className="px-2.5 py-1 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 hover:border-red-500/50 text-red-400 text-[10px] font-mono font-bold flex items-center justify-center cursor-pointer transition"
                    title="Parar container"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => handleContainerAction(c.id, "restart")}
                  className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[10px] font-mono font-bold flex items-center justify-center cursor-pointer transition"
                  title="Reiniciar container"
                >
                  <RotateCw className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-zinc-900/60 my-2" />

      {/* NEW: GESTOR DE AGENTES ESPECIALIZADOS (WORKER NODES) */}
      <div>
        <h3 className="text-xs text-[var(--brand-light)] font-mono font-bold flex items-center gap-2 mb-3 tracking-wider">
          <Layers className="h-3.5 w-3.5 text-[var(--brand-light)]" />
          GESTOR DE AGENTES ESPECIALIZADOS (WORKER NODES) VRAM-AWARE
        </h3>
        <p className="text-[11px] text-zinc-500 mb-4 font-sans">
          Aloque "instâncias cegas" de LLMs locais para tarefas independentes restritas aos limites físicos da sua Placa de Vídeo. Use para leitura isolada do Obsidian ou acesso contínuo SSH.
          O <b>Smart Offload</b> desaloca modelos inativos da memória após 5 minutos.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workerNodesList.map((agent) => {
            const status = agentStatuses[agent.id] || "paused";
            return (
              <div key={agent.id} className="bg-zinc-950 border border-[var(--brand-primary)]/20 rounded-xl p-4 flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-[var(--brand-primary)]/50 transition-colors">
                <div className="flex justify-between items-start">
                  <h4 className="text-[11px] font-mono font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
                    {agent.name}
                  </h4>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full uppercase font-bold tracking-tight border ${
                    status === "running"
                      ? "bg-emerald-950/30 border-emerald-500/20 text-emerald-400 animate-pulse"
                      : "bg-zinc-900 border-zinc-700 text-zinc-500"
                  }`}>
                    {status === "running" ? "Executando" : "Hibernado"}
                  </span>
                </div>
                
                <p className="text-[10px] text-zinc-400 font-sans leading-relaxed flex-1">
                  {agent.desc}
                </p>

                <div className="flex items-center justify-between text-[9px] font-mono border-t border-zinc-900/50 pt-2 pb-1 text-zinc-500 mt-auto">
                   <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)]"></span>
                      VRAM Lock
                   </div>
                   <span className="text-[var(--brand-light)] font-bold">{agent.limit}</span>
                </div>

                <div className="grid grid-cols-2 gap-1 pt-2 border-t border-zinc-900">
                  {status !== "running" ? (
                    <button
                      onClick={() => setAgentStatuses(prev => ({ ...prev, [agent.id]: "running" }))}
                      className="col-span-2 py-1.5 rounded-md bg-[var(--brand-primary)]/10 hover:bg-[var(--brand-primary)]/20 border border-[var(--brand-primary)]/30 text-[var(--brand-light)] text-[10px] font-mono font-bold flex items-center justify-center gap-1 cursor-pointer transition"
                    >
                      <Play className="h-3 w-3" /> Instanciar Agent
                    </button>
                  ) : (
                    <button
                      onClick={() => setAgentStatuses(prev => ({ ...prev, [agent.id]: "paused" }))}
                      className="col-span-2 py-1.5 rounded-md bg-zinc-900 hover:bg-red-950/30 border border-zinc-800 text-red-400 text-[10px] font-mono font-bold flex items-center justify-center gap-1 cursor-pointer transition"
                    >
                      <Pause className="h-3 w-3" /> Liberar VRAM
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-zinc-900/60 my-2" />

      {/* Terminal View Header */}
      <div className="pt-2">
        <h3 className="text-xs text-zinc-400 font-mono flex items-center gap-2 mb-3">
          <Terminal className="h-3.5 w-3.5 text-[var(--brand-light)]" />
          SAÍDA DE LOGS CONSOLIDADOS (SHELL OUTPUT)
        </h3>
        {/* Selector pills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {containerOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedContainer(opt.id)}
              className={`px-3 py-1.5 text-[11px] font-mono rounded-lg border transition-all cursor-pointer ${
                selectedContainer === opt.id
                  ? `bg-[var(--brand-primary)]/10 ${opt.color} font-bold shadow-[0_2px_8px_rgba(6,182,212,0.05)]`
                  : "bg-zinc-950/40 border-zinc-800 hover:border-zinc-700 text-zinc-450 hover:text-zinc-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        
        <div className="relative">
          <div className="bg-black border border-zinc-800 rounded-xl overflow-hidden flex flex-col shadow-2xl relative">
            {/* Header of Terminal */}
            <div className="flex justify-between items-center bg-zinc-950 px-4 py-2 border-b border-zinc-800">
              <span className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-[var(--brand-light)]" />
                docker logs -f --tail=100 {selectedContainer === "all" ? "suite_jarvis_containers" : `jarvis_${selectedContainer}`}
              </span>
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-zinc-800"></span>
                <span className="w-2 h-2 rounded-full bg-zinc-800"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
            </div>

            {/* Logs scroll wrapper */}
            <div
              ref={terminalRef}
              className="p-5 font-mono text-xs leading-relaxed text-zinc-300 bg-black overflow-y-auto h-72 space-y-1 select-text scrollbar-thin scrollbar-thumb-zinc-800"
            >
              {actionMessage && (
                <div className="text-yellow-400 font-semibold bg-yellow-950/30 p-2 border border-yellow-900/40 rounded mb-3 animate-pulse text-[11px]">
                  {actionMessage}
                </div>
              )}

              {logs.length === 0 ? (
                <div className="text-zinc-600 italic h-full flex flex-col items-center justify-center space-y-2 py-10">
                  <span>[INFO] Aguardando sinal do daemon do Docker compose local...</span>
                  <span className="text-[10px]">A contagem de threads reiniciará em breve.</span>
                </div>
              ) : (
                logs.map((log, idx) => {
                  let colorClass = "text-zinc-300";
                  
                  // Colorize logs based on context/container prefixes
                  if (log.includes("[CHROMADB]")) colorClass = "text-blue-400 font-semibold";
                  else if (log.includes("[N8N]")) colorClass = "text-pink-400 font-semibold";
                  else if (log.includes("[HOMEASSISTANT]")) colorClass = "text-teal-400 font-semibold";
                  else if (log.includes("[POSTGRES]")) colorClass = "text-[var(--brand-light)] font-semibold";
                  else if (log.includes("[REDIS]")) colorClass = "text-red-400 font-semibold";

                  // Highlight inner words for extra technical detail
                  if (log.includes("SUCCESS") || log.includes("SUCCESSFULLY") || log.includes("Concluído") || log.includes("synced!")) {
                    return (
                      <div key={idx} className={`${colorClass} hover:bg-zinc-950/60 py-0.5 rounded px-1 transition-colors whitespace-pre-wrap`}>
                        {log} <span className="text-emerald-400 font-bold">✓ DONE</span>
                      </div>
                    );
                  }

                  if (log.toLowerCase().includes("error") || log.toLowerCase().includes("warning") || log.toLowerCase().includes("failed") || log.toLowerCase().includes("err!")) {
                    let contextSuggestion = "";
                    
                    if (log.toLowerCase().includes("port is already allocated")) {
                      contextSuggestion = "💡 DICA: Uma porta rede já está em uso por outro programa. Tente reiniciar seu Computador ou parar processos antigos conflitantes.";
                    } else if (log.toLowerCase().includes("cannot connect to the docker daemon")) {
                      contextSuggestion = "💡 DICA: O Motor Docker local não está rodando. Abra o seu aplicativo Docker Desktop e aguarde ele iniciar.";
                    } else if (log.toLowerCase().includes("database is locked")) {
                      contextSuggestion = "💡 DICA: A base SQL está ocupada gravando operações. Aguarde ou reinicie o serviço.";
                    } else if (log.toLowerCase().includes("econnrefused") || log.toLowerCase().includes("connection refused")) {
                      contextSuggestion = "💡 DICA: Falha de conexão. Um contêiner que deveria estar online falhou e não pode ser acessado. Tente recarregá-lo.";
                    }

                    return (
                      <div key={idx} className="text-rose-400 bg-rose-950/20 py-1.5 rounded px-2 animate-pulse border-l-2 border-rose-600 whitespace-pre-wrap my-1 font-mono">
                        <div className="font-bold flex items-center gap-1 text-[11px] mb-1">
                          <XCircle className="h-3.5 w-3.5" /> [ALERTA DE FALHA]
                        </div>
                        <div className="text-[10px] break-all mb-1">{log}</div>
                        {contextSuggestion && (
                          <div className="text-yellow-400 font-sans font-medium text-[11px] bg-yellow-950/30 p-2 rounded-md mt-2 border border-yellow-900/50">
                            {contextSuggestion}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={idx} className={`${colorClass} hover:bg-zinc-950/60 py-0.5 rounded px-1 transition-colors whitespace-pre-wrap`}>
                      {log}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Floating Controls inside Terminal */}
          <div className="absolute top-12 right-4 flex gap-1.5 z-10 pb-2">
            <button
              onClick={() => triggerAction("Restart Container")}
              className="px-2.5 py-1 text-[10px] font-mono bg-zinc-900 hover:bg-[var(--brand-dark)] border border-zinc-800 hover:border-[var(--brand-primary)]/50 text-[var(--brand-light)] rounded transition cursor-pointer"
            >
              Restart Global
            </button>
            <button
              onClick={() => triggerAction("Pause Services (Hibernar)")}
              className="px-2.5 py-1 text-[10px] font-mono bg-zinc-900 hover:bg-red-950 border border-zinc-800 hover:border-red-500/50 text-red-400 rounded transition cursor-pointer"
            >
              Hibernate Space
            </button>
          </div>
        </div>
      </div>

      {/* Help metadata context */}
      <div className="bg-zinc-950/80 border border-zinc-900 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-2.5 text-xs text-zinc-400">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>Monitorando subnet interna do docker do desktop na rede pessoal Windows WSL2 host bridge.</span>
        </div>
        <span className="text-[10px] font-mono text-zinc-500">
          Docker Subnet: 172.18.0.0/16
        </span>
      </div>

    </div>
  );
});
