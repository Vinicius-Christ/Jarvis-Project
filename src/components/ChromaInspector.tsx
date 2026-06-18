import { getServerUrl } from "../lib/api";
import React, { useState, useEffect } from "react";
import {
  Brain,
  Search,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Sparkles,
  Filter,
  Layers,
  Database,
  ArrowRight,
  Info
} from "lucide-react";

interface Memory {
  id: string;
  text: string;
  category: string;
  timestamp: string;
  tokens: number;
  embeddingUrl: string;
}

export default function ChromaInspector() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  // State for adding new memory
  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState("Preferência");
  const [isAdding, setIsAdding] = useState(false);

  // State for editing memory
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const categories = ["Preferência", "Pessoal", "Infraestrutura", "Hardware", "Instrução", "Geral"];

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const res = await fetch(getServerUrl() + "/api/chroma/memories");
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
        setError("");
      } else {
        throw new Error("Erro ao obter memórias do banco vetorial.");
      }
    } catch (err: any) {
      setError(err.message || "Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    try {
      const res = await fetch(getServerUrl() + "/api/chroma/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newText, category: newCategory })
      });
      if (res.ok) {
        setNewText("");
        setIsAdding(false);
        fetchMemories();
      } else {
        alert("Erro ao salvar bloco vetorial.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateMemory = async (id: string) => {
    if (!editText.trim()) return;
    try {
      const res = await fetch(getServerUrl() + `/api/chroma/memories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editText, category: editCategory })
      });
      if (res.ok) {
        setEditingId(null);
        fetchMemories();
      } else {
        alert("Erro ao atualizar bloco.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!window.confirm("Confirmar exclusão desta memória vetorial? O modelo local perderá esse contexto imediatamente.")) {
      return;
    }
    try {
      const res = await fetch(getServerUrl() + `/api/chroma/memories/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchMemories();
      } else {
        alert("Erro ao excluir bloco.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (memory: Memory) => {
    setEditingId(memory.id);
    setEditText(memory.text);
    setEditCategory(memory.category);
  };

  // Filter memories
  const filteredMemories = memories.filter((m) => {
    const matchesSearch = m.text.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || m.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 font-mono text-zinc-300">
      <div className="bg-zinc-900/35 border border-zinc-800 p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-5 w-5 text-cyan-400 transition-opacity duration-300" />
              <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest">
                Inspetor de Memória Vetorial (ChromaDB)
              </h2>
            </div>
            <p className="text-xs text-zinc-400">
              Gerencie os blocos semânticos de contexto persistidos no cérebro vetorial do JARVIS para calibrar a inferência local.
            </p>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2 bg-cyan-950/40 border border-cyan-800 hover:border-cyan-400 hover:bg-cyan-900/40 text-cyan-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-[0_2px_8px_rgba(6,182,212,0.15)] active:scale-95"
          >
            {isAdding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {isAdding ? "Cancelar Entrada" : "Aprender Novo Fato"}
          </button>
        </div>

        {/* Learn Fact form expansion */}
        {isAdding && (
          <form
            onSubmit={handleAddMemory}
            className="bg-zinc-950/80 border border-cyan-900/50 p-4 rounded-xl mb-6 space-y-4 animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Registrar Bloco de Memória Manual
              </span>
              <span className="text-[10px] text-zinc-500">FORMATO TEXTO {`->`} VETORES COSSENO</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">
                  Conteúdo do Aprendizado (Fato Limpo e Direto)
                </label>
                <input
                  type="text"
                  required
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Ex: Vinícius prefere dormir ouvindo ruído branco gerado em 440Hz."
                  className="w-full bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg text-xs text-zinc-200 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">
                  Categoria Semântica
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg text-xs text-zinc-200 outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-[0_4px_12px_rgba(6,182,212,0.3)]"
              >
                <Database className="h-3.5 w-3.5" />
                Injetar Vetores Semânticos
              </button>
            </div>
          </form>
        )}

        {/* Searching and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar memórias indexadas no ChromaDB..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950/60 border border-zinc-800 p-2.5 pl-10 rounded-xl text-xs text-zinc-200 outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-zinc-950/60 border border-zinc-800 p-2.5 rounded-xl text-xs text-zinc-500 outline-none focus:border-cyan-500 cursor-pointer text-zinc-300"
            >
              <option value="all">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Memory Blocks Cards */}
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-500 space-y-2">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="">Sincronizando com os clusters locais do ChromaDB...</p>
          </div>
        ) : error ? (
          <div className="p-4 border border-rose-900 bg-rose-950/10 text-rose-400 rounded-xl text-xs font-bold">
            ⚠️ {error}
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-zinc-800 rounded-2xl text-xs text-zinc-500">
            Nenhum fragmento de memória vetorial correspondente foi indexado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMemories.map((m) => {
              const isEditing = editingId === m.id;
              return (
                <div
                  key={m.id}
                  className={`border rounded-2xl p-4 transition-all relative overflow-hidden flex flex-col justify-between ${
                    isEditing
                      ? "bg-zinc-950 border-cyan-700 shadow-[0_4px_12px_rgba(6,182,212,0.1)]"
                      : "bg-zinc-950/40 border-zinc-900 hover:border-zinc-800"
                  }`}
                >
                  {/* Holographic grid scan line for sci-fi look */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cyan-500/5 to-transparent pointer-events-none rounded-bl-full"></div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold bg-cyan-950/50 border border-cyan-900/60 text-cyan-300 px-2 py-0.5 rounded-full uppercase tracking-widest">
                        {isEditing ? (
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="bg-zinc-900 text-cyan-300 outline-none cursor-pointer border-none text-[10px]"
                          >
                            {categories.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        ) : (
                          m.category
                        )}
                      </span>

                      <span className="text-[9px] text-zinc-500">
                        {new Date(m.timestamp).toLocaleDateString("pt-BR")} às {new Date(m.timestamp).toLocaleTimeString("pt-BR", { hour12: false })}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-200 leading-relaxed font-sans pr-2">
                      {isEditing ? (
                        <textarea
                          rows={2}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-xs text-zinc-200 outline-none focus:border-cyan-500"
                        />
                      ) : (
                        `"${m.text}"`
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-zinc-900/50 mt-4 pt-3 text-[10px] text-zinc-500 font-mono">
                    <div className="flex items-center gap-1">
                      <span className="text-lime-500">●</span>
                      <span>{m.tokens} Tokens</span>
                      <span className="mx-1">•</span>
                      <span>{m.id}</span>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleUpdateMemory(m.id)}
                            className="p-1 px-2.5 bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-800 text-emerald-400 hover:text-emerald-300 rounded transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                          >
                            <Save className="h-3 w-3" />
                            <span>Gravar</span>
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-300 rounded transition-all cursor-pointer active:scale-95"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(m)}
                            className="p-1.5 bg-zinc-900 hover:bg-cyan-950/30 border border-zinc-800 hover:border-cyan-900 text-zinc-400 hover:text-cyan-400 rounded-lg transition-all cursor-pointer active:scale-95"
                            title="Editar"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteMemory(m.id)}
                            className="p-1.5 bg-zinc-900 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900 text-zinc-400 hover:text-red-400 rounded-lg transition-all cursor-pointer active:scale-95"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-zinc-900/10 border border-zinc-900 p-4.5 rounded-2xl flex items-start gap-3">
        <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-zinc-400 leading-relaxed font-sans space-y-1">
          <h4 className="font-mono font-bold text-zinc-300 uppercase tracking-wider text-[10px]">
            Como funciona a Calibração de Memória Local?
          </h4>
          <p>
            No modelo do JARVIS, as memórias do ChromaDB operam em um pipeline de **Retrieval-Augmented Generation (RAG)** de curtíssima latência. Durante qualquer orquestração ou pergunta ordinária do senhor, o sistema intercepta os dados e preenche os blocos de prompt da GPU local com os fatos que mostram maior similaridade de cosseno com sua frase atual.
          </p>
        </div>
      </div>
    </div>
  );
}
