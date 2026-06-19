import { getServerUrl } from "../lib/api";
import React, { useState, useEffect } from "react";
import { Server, Folder, Github, Database, Play, CheckCircle, Info, Radio, Terminal } from "lucide-react";

export default function MCPSettings() {
  const [servers, setServers] = useState([
    { id: "fs", name: "Sistema de Arquivos Local", desc: "Permite que a IA leia arquivos .md, .txt, pdfs ou projetos do seu disco local de forma padronizada.", active: true },
    { id: "github", name: "Integração GitHub Host", desc: "Permite que a IA liste seus repositórios, abra PRs e revise código usando suas credenciais locais.", active: false },
    { id: "db", name: "Acesso PostgreSQL Nativo", desc: "Fornece metadados do schema e permite que a IA crie queries seguras atreladas ao banco em execução no Docker.", active: false },
  ]);

  useEffect(() => {
    fetch(getServerUrl() + "/api/db")
      .then(r => r.json())
      .then(data => {
        if (data.mcpServers && Array.isArray(data.mcpServers)) {
          setServers(data.mcpServers);
        }
      })
      .catch(() => {});
  }, []);

  const toggleServer = async (id: string) => {
    setServers(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
    try {
      const res = await fetch(getServerUrl() + "/api/mcp/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.mcpServers) {
          setServers(data.mcpServers);
        }
      }
    } catch (e) {
      console.error("Failed to toggle MCP server", e);
    }
  };

  const activeFS = servers.find(s => s.id === "fs" && s.active);
  const activeDB = servers.find(s => s.id === "db" && s.active);

  return (
    <div className="bg-[#030712]/90 border border-zinc-900 rounded-2xl p-5 md:p-8 space-y-6">
      <div className="flex justify-between items-start border-b border-zinc-800 pb-5">
        <div>
          <h2 className="text-xl font-sans font-semibold text-white tracking-tight flex items-center gap-2">
            <Server className="h-5 w-5 text-[var(--brand-light)]" />
            Servidores MCP (Model Context Protocol) 
          </h2>
          <p className="text-xs text-zinc-400 mt-2 max-w-2xl leading-relaxed">
            Em vez de construir centenas de ferramentas isoladas, ative Servidores MCP Locais. Eles padronizam como a LLM (Llama 3.3) se conecta a programas, bases de dados e arquivos locais sem necessidade de gambiarras. 
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {servers.map(server => (
           <div key={server.id} className={`border rounded-xl p-5 transition-all ${server.active ? 'border-[var(--brand-primary)] bg-[var(--brand-glow)]' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'}`}>
             <div className="flex justify-between items-start mb-4">
               <div className={`p-2 rounded-lg ${server.active ? 'bg-[var(--brand-primary)]' : 'bg-zinc-900'}`}>
                 {server.id === "fs" && <Folder className={`h-5 w-5 ${server.active ? 'text-white' : 'text-zinc-500'}`} />}
                 {server.id === "github" && <Github className={`h-5 w-5 ${server.active ? 'text-white' : 'text-zinc-500'}`} />}
                 {server.id === "db" && <Database className={`h-5 w-5 ${server.active ? 'text-white' : 'text-zinc-500'}`} />}
               </div>
               <button 
                 onClick={() => toggleServer(server.id)}
                 className={`px-3 py-1 text-[10px] font-mono rounded font-bold uppercase transition ${server.active ? 'bg-zinc-900 text-red-400 hover:bg-zinc-800' : 'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-light)]'}`}
               >
                 {server.active ? "DESATIVAR" : "INICIAR MCP"}
               </button>
             </div>
             
             <h3 className={`font-bold text-sm mb-1 ${server.active ? 'text-white' : 'text-zinc-300'}`}>{server.name}</h3>
             <p className="text-xs font-sans text-zinc-500 leading-relaxed mb-4">{server.desc}</p>
             
             {server.active && (
               <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/20 px-2 py-1.5 rounded flex items-center justify-between border border-emerald-900/30">
                 <span className="flex items-center gap-1.5">
                   <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full transition-opacity duration-300 blur-sm"></span>
                   Socket Ativo (Stdio)
                 </span>
                 <CheckCircle className="h-3 w-3" />
               </div>
             )}
           </div>
        ))}
      </div>

      {/* Telemetry MCP Hub Console */}
      <div className="bg-black/40 border border-zinc-900 rounded-xl p-5 font-mono text-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
          <span className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1.5">
            <Terminal className="h-3.5 w-3.5 text-[var(--brand-light,rgb(6,182,212))]" />
            Console de Telemetria do Protocolo MCP Local
          </span>
          <span className="text-[9px] text-zinc-500 uppercase">Status: Canal de Escuta Ativo</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="text-zinc-500 text-[10px] block">ENDPOINT RPC / SCHEMA DE CONTEXTO</span>
            <div className="bg-zinc-950 p-3 rounded border border-zinc-900/60 flex items-center justify-between">
              <span className="text-[var(--brand-light,rgb(6,182,212))] font-bold">POST /api/mcp</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-805 text-zinc-400">JSON-RPC 2.0</span>
            </div>
            <p className="text-[10px] text-zinc-500 leading-normal">
              Seu Llama 3.3 local consulta dinamicamente esta rota para solicitar execuções de ferramentas no host doméstico.
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-zinc-500 text-[10px] block">FERRAMENTAS DECLARADAS PELOS DRIVERS</span>
            <div className="space-y-1.5">
              {activeFS ? (
                <div className="bg-zinc-950 p-2 rounded border border-zinc-900/50 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 font-bold">fs::search_notes, read_note, write_note</span>
                  <span className="text-[9px] px-1 bg-emerald-950 text-emerald-400 rounded">PRONTO</span>
                </div>
              ) : (
                <div className="bg-zinc-950 p-2 rounded border border-zinc-900/50 flex items-center justify-between text-[11px] text-zinc-600 opacity-45">
                  <span>fs::search_notes, read_note, write_note</span>
                  <span className="text-[9px] px-1 bg-zinc-900 rounded text-zinc-500">DESATIVADO</span>
                </div>
              )}

              {activeDB ? (
                <div className="bg-zinc-950 p-2 rounded border border-zinc-900/50 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 font-bold">db::get_finances</span>
                  <span className="text-[9px] px-1 bg-emerald-950 text-emerald-400 rounded">PRONTO</span>
                </div>
              ) : (
                <div className="bg-zinc-950 p-2 rounded border border-zinc-900/50 flex items-center justify-between text-[11px] text-zinc-600 opacity-45">
                  <span>db::get_finances</span>
                  <span className="text-[9px] px-1 bg-zinc-900 rounded text-zinc-500">DESATIVADO</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
