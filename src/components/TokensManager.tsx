import { getServerUrl } from "../lib/api";
import React, { useState, useEffect } from "react";
import { KeyRound, CheckCircle, Save, Variable, ShieldCheck } from "lucide-react";

export default function TokensManager() {
  const [tokens, setTokens] = useState({
    githubToken: "",
    haToken: "",
    telegramToken: "",
    elevenlabsToken: "",
    openaiToken: "",
    webUsername: "",
    webPassword: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(getServerUrl() + "/api/config/tokens")
      .then(r => r.json())
      .then(data => {
        if (data.tokens) {
          setTokens(data.tokens);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTokens(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    try {
      const res = await fetch(getServerUrl() + "/api/config/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tokens)
      });
      if (res.ok) {
        setSuccessMsg("Tokens atualizados e sincronizados com sucesso! .env reconstruído.");
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#030712]/90 border border-zinc-900 rounded-2xl p-5 md:p-8 transition-opacity duration-300 flex items-center justify-center min-h-[400px]">
        <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest">Carregando Tokens...</span>
      </div>
    );
  }

  return (
    <div className="bg-[#030712]/90 border border-zinc-900 rounded-2xl p-5 md:p-8 space-y-6 max-h-[calc(100vh-140px)] overflow-y-auto">
      <div className="flex justify-between items-start border-b border-zinc-800 pb-5">
        <div>
          <h2 className="text-xl font-sans font-bold text-white tracking-tight flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-amber-500" />
            Central de Tokens & Auth
          </h2>
          <p className="text-zinc-400 mt-1.5 text-xs font-mono leading-relaxed max-w-2xl">
            Gerencie as senhas e chaves de APIs utilizadas globalmente pelos plugins, N8N, atuadores residenciais e mecanismos de atualização open-source do JARVIS. Suas informações são escritas diretamente no <code>.env</code> local e criptografadas na base interna (db.json).
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-950/40 border border-emerald-900/50 p-4 rounded-xl flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
          <p className="text-emerald-400 text-xs font-mono font-bold tracking-wide">{successMsg}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Sessão: Infraestrutura Node */}
        <div className="space-y-4">
          <h3 className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest flex items-center gap-1.5 border-b border-zinc-805 pb-2">
            <ShieldCheck className="h-3.5 w-3.5" /> Core Infraestrutura Local & Web
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-l-4 border-l-rose-500">
              <div className="md:col-span-2">
                <label className="block text-[11px] uppercase font-bold text-rose-400 font-mono mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /> Autenticação Web Externa (Basic Auth)
                </label>
                <p className="text-[10px] text-zinc-500 mb-1 leading-relaxed">Pede usuário e senha sempre que acessar a interface web remotamente (Cybersegurança). Deixe em branco se for usar apenas na própria rede interna segura.</p>
              </div>
              <div>
                <input
                  type="text"
                  name="webUsername"
                  autoComplete="new-password"
                  value={tokens?.webUsername || ""}
                  onChange={handleChange}
                  placeholder="Nome de Usuário"
                  className="w-full bg-black/60 border border-zinc-800 text-rose-300 font-mono text-xs px-3 py-2 rounded focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
              <div>
                <input
                  type="password"
                  name="webPassword"
                  autoComplete="new-password"
                  value={tokens?.webPassword || ""}
                  onChange={handleChange}
                  placeholder="Senha Mestra"
                  className="w-full bg-black/60 border border-zinc-800 text-rose-300 font-mono text-xs px-3 py-2 rounded focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
            </div>



            <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl">
              <label className="block text-[11px] uppercase font-bold text-zinc-300 font-mono mb-1.5">GitHub Auth Token</label>
              <p className="text-[10px] text-zinc-500 mb-3 leading-relaxed">Obrigatório para o módulo Auto-Updater puxar as últimas versões ou consultar o Model Context Protocol e fazer leitura do código-fonte de seus repos.</p>
              <input
                type="password"
                name="githubToken"
                value={tokens.githubToken}
                onChange={handleChange}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-black/60 border border-zinc-800 text-emerald-400 font-mono text-xs px-3 py-2 rounded focus:outline-none focus:border-amber-500 transition-colors transition-all duration-300 hover:border-zinc-600 focus:shadow-[0_4px_12px_var(--brand-glow)]"
              />
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl">
              <label className="block text-[11px] uppercase font-bold text-zinc-300 font-mono mb-1.5">Home Assistant Token</label>
              <p className="text-[10px] text-zinc-500 mb-3 leading-relaxed">Obrigatório para a comunicação via Websocket/Webhooks e IoT. Localizado no Perfil de Usuário {'>'} Tickets de Longa Duração (Long-Lived Tokens) na interface do seu Home Assistant local.</p>
              <input
                type="password"
                name="haToken"
                value={tokens.haToken}
                onChange={handleChange}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full bg-black/60 border border-zinc-800 text-emerald-400 font-mono text-xs px-3 py-2 rounded focus:outline-none focus:border-amber-500 transition-colors transition-all duration-300 hover:border-zinc-600 focus:shadow-[0_0_15px_var(--brand-glow)]"
              />
            </div>

          </div>
        </div>

        {/* Sessão: Integração N8N */}
        <div className="space-y-4">
          <h3 className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest flex items-center gap-1.5 border-b border-zinc-805 pb-2">
            <Variable className="h-3.5 w-3.5" /> Variáveis de Ambiente (.env) / N8N
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl">
              <label className="block text-[11px] uppercase font-bold text-cyan-400 font-mono mb-1.5">Telegram Bot Token</label>
              <p className="text-[10px] text-zinc-500 mb-3 leading-relaxed">Ativa a interface via Telegram com as workflows do N8N incluídas no JARVIS. Criado e fornecido pelo @BotFather.</p>
              <input
                type="password"
                name="telegramToken"
                value={tokens.telegramToken}
                onChange={handleChange}
                placeholder="123456789:ABCDefGHI_jkl12..."
                className="w-full bg-black/60 border border-zinc-800 text-emerald-400 font-mono text-xs px-3 py-2 rounded focus:outline-none focus:border-cyan-500 transition-all duration-300 hover:border-zinc-600 focus:shadow-[0_0_15px_var(--brand-glow)]"
              />
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl">
              <label className="block text-[11px] uppercase font-bold text-rose-400 font-mono mb-1.5">ElevenLabs API Key (Opcional - Vozes Naturais)</label>
              <p className="text-[10px] text-zinc-500 mb-3 leading-relaxed">Deixa as respostas e leituras de notificações do sistema e da assistente em PT-BR extremamente realistas. A voz sintética do Windows será o fallback.</p>
              <input
                type="password"
                name="elevenlabsToken"
                value={tokens.elevenlabsToken}
                onChange={handleChange}
                placeholder="sk_xxxxxxxxxxxxxxxxxxxx..."
                className="w-full bg-black/60 border border-zinc-800 text-emerald-400 font-mono text-xs px-3 py-2 rounded focus:outline-none focus:border-rose-500 transition-all duration-300 hover:border-zinc-600 focus:shadow-[0_0_15px_rgba(244,63,94,0.3)]"
              />
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl lg:col-span-2">
              <label className="block text-[11px] uppercase font-bold text-emerald-400 font-mono mb-1.5">OpenAI API Key (Opcional - Alternativa Voz TTS)</label>
              <p className="text-[10px] text-zinc-500 mb-3 leading-relaxed">Opcionalmente, pode-se utilizar a infraestrutura TTS da OpenAI em vez da sintética do Windows (se o ElevenLabs não estiver configurado).</p>
              <input
                type="password"
                name="openaiToken"
                value={tokens.openaiToken}
                onChange={handleChange}
                placeholder="sk-xxxxxxxxxxxxxxxxxxxx..."
                className="w-full bg-black/60 border border-zinc-800 text-emerald-400 font-mono text-xs px-3 py-2 rounded focus:outline-none focus:border-emerald-500 transition-all duration-300 hover:border-zinc-600 focus:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              />
            </div>

          </div>
        </div>

        <div className="flex justify-end border-t border-zinc-800 pt-5">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2  border-2 border-amber-600/30 text-amber-400 font-bold font-mono text-xs uppercase tracking-widest rounded hover:bg-amber-600 hover:text-black transition-all shadow-[0_0_15px_rgba(217,119,6,0.15)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Registrando Senhas..." : "Salvar Configurações Globais"}
          </button>
        </div>
      </form>
    </div>
  );
}
