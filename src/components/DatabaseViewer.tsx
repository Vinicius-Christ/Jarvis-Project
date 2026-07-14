import React, { useState } from 'react';
import { Database, Folder, Table, FileText, X } from 'lucide-react';
import { fetchAutenticado } from '../lib/api';

interface DatabaseViewerProps {
  systemState: any;
  fetchSystemState: () => void;
}

export default function DatabaseViewer({ systemState, fetchSystemState }: DatabaseViewerProps) {
  const [activeTab, setActiveTab] = useState<"finance" | "agenda" | "obsidian">("obsidian");
  const [newNotePath, setNewNotePath] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotePath || !newNoteContent) return;

    try {
      await fetchAutenticado("/api/update/obsidian", {
        method: "POST",
        body: JSON.stringify({ path: newNotePath, content: newNoteContent }),
      });
      setNewNotePath("");
      setNewNoteContent("");
      fetchSystemState();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNote = async (path: string) => {
    try {
      await fetchAutenticado("/api/delete/obsidian", {
        method: "POST",
        body: JSON.stringify({ path }),
      });
      fetchSystemState();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center glass-panel p-4 rounded-2xl">
        <div className="flex flex-col">
          <h3 className="text-[var(--brand-light)] font-mono text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
            <Database className="h-4 w-4" /> Visualizador do Banco de Dados & RAG
          </h3>
          <span className="text-zinc-500 font-mono text-[10px] mt-1">Acesso direto e emulador do Banco de Dados e Obsidian Vault.</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar com tabelas */}
        <div className="md:col-span-1 holographic-card p-4 space-y-2 flex flex-col">
          <button
            onClick={() => setActiveTab("obsidian")}
            className={`flex items-center gap-2 p-3 w-full rounded-xl transition-all font-mono text-xs text-left ${activeTab === "obsidian" ? "bg-[var(--brand-primary)] text-white" : "text-zinc-400 hover:bg-zinc-800"}`}
          >
            <Folder className="h-4 w-4" /> Obsidian (Vault)
          </button>
          <button
            onClick={() => setActiveTab("finance")}
            className={`flex items-center gap-2 p-3 w-full rounded-xl transition-all font-mono text-xs text-left ${activeTab === "finance" ? "bg-[var(--brand-primary)] text-white" : "text-zinc-400 hover:bg-zinc-800"}`}
          >
            <Table className="h-4 w-4" /> DB: Finance
          </button>
          <button
            onClick={() => setActiveTab("agenda")}
            className={`flex items-center gap-2 p-3 w-full rounded-xl transition-all font-mono text-xs text-left ${activeTab === "agenda" ? "bg-[var(--brand-primary)] text-white" : "text-zinc-400 hover:bg-zinc-800"}`}
          >
            <Table className="h-4 w-4" /> DB: Agenda
          </button>
        </div>

        {/* Visualizador Principal */}
        <div className="md:col-span-3 holographic-card p-5 min-h-[500px]">
          {activeTab === "obsidian" && (
            <div className="space-y-4">
              <h4 className="text-[11px] text-[var(--brand-light)] font-mono uppercase tracking-widest border-b border-zinc-800 pb-2">Memória de Longo Prazo (RAG / .md)</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h5 className="text-[10px] text-zinc-500 font-mono uppercase">Arquivos no Vault</h5>
                  <div className="bg-zinc-950 border border-zinc-900 rounded-lg max-h-[300px] overflow-y-auto divide-y divide-zinc-900">
                    {systemState?.obsidianNotes?.length > 0 ? systemState.obsidianNotes.map((note: any, i: number) => (
                      <div key={i} className="p-3 text-xs text-zinc-300 font-mono flex flex-col gap-2 group">
                        <div className="flex justify-between items-start">
                          <span className="text-[var(--brand-light)] font-bold">{note.path}</span>
                          <button onClick={() => handleDeleteNote(note.path)} className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
                        </div>
                        <pre className="text-[10px] text-zinc-500 bg-black p-2 rounded whitespace-pre-wrap">{note.content.substring(0, 150)}{note.content.length > 150 ? "..." : ""}</pre>
                      </div>
                    )) : <p className="p-3 text-[10px] text-zinc-600">Nenhum arquivo encontrado.</p>}
                  </div>
                </div>

                <form onSubmit={handleCreateNote} className="bg-zinc-950 border border-zinc-900 p-4 rounded-lg space-y-3">
                  <h5 className="text-[10px] text-[var(--brand-primary)] font-mono uppercase">Adicionar Contexto (Nova Nota)</h5>
                  <input
                    type="text"
                    placeholder="Ex: /sobre-mim/gostos.md"
                    required
                    value={newNotePath}
                    onChange={e => setNewNotePath(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded p-2 text-xs text-white"
                  />
                  <textarea
                    placeholder="Conteúdo em markdown..."
                    required
                    rows={6}
                    value={newNoteContent}
                    onChange={e => setNewNoteContent(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded p-2 text-xs text-white font-mono"
                  ></textarea>
                  <button type="submit" className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-light)] text-white text-xs font-mono py-2 rounded transition-all">Salvar no Obsidian</button>
                </form>
              </div>
            </div>
          )}

          {activeTab === "finance" && (
            <div className="space-y-4">
              <h4 className="text-[11px] text-[var(--brand-light)] font-mono uppercase tracking-widest border-b border-zinc-800 pb-2">Registros de Finanças (Raw DB)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[10px] border-collapse">
                  <thead className="bg-zinc-900">
                    <tr><th className="p-2 text-zinc-400">ID</th><th className="p-2 text-zinc-400">DESCRIÇÃO</th><th className="p-2 text-zinc-400">VALOR</th><th className="p-2 text-zinc-400">TIPO</th><th className="p-2 text-zinc-400">CATEGORIA</th><th className="p-2 text-zinc-400">DATA</th></tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {systemState?.finances?.map((item: any) => (
                      <tr key={item.id} className="text-zinc-300">
                        <td className="p-2 text-zinc-500">{item.id}</td>
                        <td className="p-2">{item.description}</td>
                        <td className="p-2 text-[var(--brand-light)]">R$ {parseFloat(item.value).toFixed(2)}</td>
                        <td className="p-2">{item.type}</td>
                        <td className="p-2">{item.category}</td>
                        <td className="p-2">{new Date(item.date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "agenda" && (
            <div className="space-y-4">
              <h4 className="text-[11px] text-[var(--brand-light)] font-mono uppercase tracking-widest border-b border-zinc-800 pb-2">Registros de Agenda (Raw DB)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[10px] border-collapse">
                  <thead className="bg-zinc-900">
                    <tr><th className="p-2 text-zinc-400">ID</th><th className="p-2 text-zinc-400">TÍTULO</th><th className="p-2 text-zinc-400">DATA E HORA</th><th className="p-2 text-zinc-400">CATEGORIA</th></tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {systemState?.agenda?.map((item: any) => (
                      <tr key={item.id} className="text-zinc-300">
                        <td className="p-2 text-zinc-500">{item.id}</td>
                        <td className="p-2">{item.title}</td>
                        <td className="p-2 text-[var(--brand-primary)]">{new Date(item.datetime).toLocaleString()}</td>
                        <td className="p-2">{item.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
