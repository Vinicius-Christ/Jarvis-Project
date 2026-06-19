import { getServerUrl } from "../lib/api";
import React, { useState } from "react";
import { Github, RefreshCw, GitCommit, CheckCircle2, AlertTriangle, Loader2, Save, Terminal, Play, ArrowUpRight } from "lucide-react";

interface SystemUpdaterProps {
  updateState: any;
  onRefresh: () => void;
}

export default React.memo(function SystemUpdater({ updateState, onRefresh }: SystemUpdaterProps) {
  const [repoInput, setRepoInput] = useState(updateState?.githubRepo || "Vinicius-Christ/Jarvis-Project-");
  const [tokenInput, setTokenInput] = useState(updateState?.githubToken || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [updateTriggered, setUpdateTriggered] = useState(false);

  React.useEffect(() => {
    if (updateState?.githubRepo) {
      setRepoInput(updateState.githubRepo);
    }
    if (updateState?.githubToken !== undefined) {
      setTokenInput(updateState.githubToken);
    }
  }, [updateState?.githubRepo, updateState?.githubToken]);

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(getServerUrl() + "/api/system/update/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubRepo: repoInput, githubToken: tokenInput }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const triggerCheck = async () => {
    setIsChecking(true);
    try {
      await fetch(getServerUrl() + "/api/system/update/check");
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsChecking(false);
    }
  };

  const executeUpdate = async () => {
    setUpdateTriggered(true);
    try {
      await fetch(getServerUrl() + "/api/system/update/run", { method: "POST" });
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusBadge = () => {
    switch (updateState?.status) {
      case "checking":
        return (
          <span className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-bold rounded-full flex items-center gap-1.5 transition-opacity duration-300 text-[10px]">
            <Loader2 className="h-3 w-3 animate-spin" /> VERIFICANDO REPOSITÓRIO
          </span>
        );
      case "available":
        return (
          <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold rounded-full flex items-center gap-1.5 text-[10px]">
            <ArrowUpRight className="h-3 w-3 " /> ATUALIZAÇÃO DISPONÍVEL
          </span>
        );
      case "updating":
        return (
          <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold rounded-full flex items-center gap-1.5  text-[10px]">
            <Loader2 className="h-3 w-3 animate-spin" /> SINCRONIZANDO CÓDIGO
          </span>
        );
      case "completed":
        return (
          <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold rounded-full flex items-center gap-1.5 text-[10px]">
            <CheckCircle2 className="h-3 w-3" /> ATUALIZAÇÃO CONCLUÍDA
          </span>
        );
      case "up-to-date":
        return (
          <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold rounded-full flex items-center gap-1.5 text-[10px]">
            <CheckCircle2 className="h-3 w-3" /> SISTEMA ATUALIZADO
          </span>
        );
      case "error":
        return (
          <span className="px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-500 font-bold rounded-full flex items-center gap-1.5 text-[10px]">
            <AlertTriangle className="h-3 w-3" /> FALHA NA LEITURA
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-zinc-800 border border-zinc-750 text-zinc-400 font-bold rounded-full text-[10px]">
            AGUARDANDO AÇÃO
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Card 1: Branch/Repo Configurations */}
        <div className="holographic-card p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Github className="h-5 w-5 text-zinc-400" />
              <h3 className="font-bold text-white uppercase text-[11px] tracking-wider">Repositório Remoto (Git)</h3>
            </div>
            <p className="text-zinc-500 text-[10px] leading-relaxed mb-4">
              Informe a URL do repositório no GitHub para buscar e sincronizar o código-fonte executável física e offline.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] text-zinc-400 font-mono block mb-1">Caminho da Stack (usuário/repo)</label>
                <input
                  type="text"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  placeholder="usuario/nome-repo"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500/50 rounded-lg p-2.5 text-xs text-white font-mono placeholder-zinc-700 outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] text-zinc-400 font-mono block mb-1">Token de Acesso GitHub (Opcional - p/ Repos Privados)</label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500/50 rounded-lg p-2.5 text-xs text-white font-mono placeholder-zinc-700 outline-none"
                />
              </div>
            </div>
          </div>
          <button
            onClick={saveConfig}
            disabled={isSaving}
            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-bold rounded-lg border border-zinc-750 transition flex items-center justify-center gap-2 cursor-pointer text-[11px]"
          >
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Salvar Endereço Git
          </button>
        </div>

        {/* Card 2: Sync Stats Checker */}
        <div className="xl:col-span-2 bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-zinc-800/50 pb-3">
              <div className="flex items-center gap-2">
                <GitCommit className="h-5 w-5 text-[var(--brand-light)]" />
                <h3 className="font-bold text-white uppercase text-[11px] tracking-wider">Estado da Sincronia</h3>
              </div>
              {getStatusBadge()}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-1">
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900">
                <span className="text-[9px] text-zinc-500 uppercase block">Commit Local</span>
                <span className="text-sm font-bold text-white font-mono block mt-0.5">{updateState?.localCommit || "unknown"}</span>
              </div>
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900">
                <span className="text-[9px] text-zinc-500 uppercase block">Commit Remoto</span>
                <span className="text-sm font-bold text-cyan-400 font-mono block mt-0.5">{updateState?.remoteCommit || "unknown"}</span>
              </div>
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900">
                <span className="text-[9px] text-zinc-500 uppercase block">Versão Local</span>
                <span className="text-sm font-bold text-white block mt-0.5">v{updateState?.localVersion || "5.0.0"}</span>
              </div>
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900">
                <span className="text-[9px] text-zinc-500 uppercase block">Branch</span>
                <span className="text-sm font-bold text-zinc-400 block mt-0.5">main</span>
              </div>
            </div>

            {updateState?.remoteMessage && (
              <div className="mt-4 p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                <span className="text-[9px] text-zinc-500 uppercase block mb-1">Última alteração identificada no Git</span>
                <span className="text-zinc-300 italic text-[11px]">"{updateState.remoteMessage}"</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={triggerCheck}
              disabled={isChecking || updateState?.status === "updating"}
              className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-bold rounded-lg border border-zinc-750 transition flex items-center justify-center gap-2 cursor-pointer text-[11px]"
            >
              <RefreshCw className={`h-3 w-3 ${isChecking ? "animate-spin" : ""}`} />
              Buscar no Repositório
            </button>
            <button
              onClick={executeUpdate}
              disabled={updateState?.status !== "available" && updateState?.status !== "error"}
              className={`flex-1 py-2.5 font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer text-[11px]
                ${updateState?.status === "available" 
                  ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_4px_12px_rgba(6,182,212,0.3)]" 
                  : "bg-zinc-950 border border-zinc-800 text-zinc-600 cursor-not-allowed"
                }
              `}
            >
              <Play className="h-3 w-3" />
              Sincronizar Agora
            </button>
          </div>
        </div>
      </div>

      {/* Card 3: Terminal Logs for updates */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-zinc-900/60 border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-cyan-400 animate-pulse" />
            <h4 className="font-bold text-white uppercase text-[10px] tracking-wider font-mono">Terminal Master — Atualizador</h4>
          </div>
          {updateState?.status === "updating" && (
            <div className="flex items-center gap-2 text-[10px] text-cyan-400 font-bold">
              <span>PROGRESSO: {updateState?.progress}%</span>
              <div className="w-24 h-1.5 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${updateState?.progress}%` }}></div>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 bg-zinc-950 font-mono text-[10px] text-zinc-400 h-64 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {updateState?.logs && updateState.logs.length > 0 ? (
            updateState.logs.map((log: string, idx: number) => {
              let textStyles = "text-zinc-400";
              if (log.startsWith("[ERRO]")) textStyles = "text-red-500 font-bold";
              else if (log.startsWith("[SUCCESS]")) textStyles = "text-emerald-400 font-bold";
              else if (log.startsWith("[GIT]") || log.startsWith("[NPM]") || log.startsWith("[BUILD]")) textStyles = "text-cyan-400";
              else if (log.startsWith("[REBOOT]")) textStyles = "text-yellow-400 font-bold animate-pulse";
              return (
                <div key={idx} className={`${textStyles} leading-relaxed`}>
                  <span className="text-zinc-605 mr-2">C:\JARVIS\UPDATER {">"}</span>
                  {log}
                </div>
              );
            })
          ) : (
            <div className="text-zinc-600 italic">Nenhum log de compilação ou sincronia registrado em buffer. Clique em "Buscar no Repositório" para checar por commits e atualizações físicas.</div>
          )}
        </div>
      </div>
    </div>
  );
});
