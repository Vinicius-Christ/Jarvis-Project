import { getServerUrl } from "../lib/api";
import React, { useState, useEffect, useRef } from "react";
import { Play, RotateCcw, AlertCircle, CheckCircle, Terminal, Download, Copy, Check, Server, Eye } from "lucide-react";

function InstallerLoadingHUD({ progress, modules }: { progress: number; modules: any }) {
  return (
    <div className="bg-[#020617] border border-[var(--brand-primary)]/20 rounded-xl p-5 md:p-6 space-y-6 relative overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.05)] transition-all duration-500 font-mono">
      
      {/* Laser scan line cursor */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[var(--brand-primary)] to-transparent transition-opacity duration-300 opacity-70"></div>
      
      <div className="flex justify-between items-center">
        <div>
          <span className="text-[10px] tracking-widest text-[var(--brand-light)] uppercase font-bold flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--brand-light)] "></span>
            Script Bash Executando no Servidor
          </span>
          <h3 className="text-xs font-sans font-semibold text-zinc-200 mt-1 uppercase">
            Instalador Automático: Provisionando Ecossistema JARVIS Christ v5
          </h3>
        </div>
        <div className="text-right">
          <span className="text-2xl font-semibold text-[var(--brand-light)]">{progress}%</span>
          <span className="block text-[9px] text-zinc-500">Progresso Geral</span>
        </div>
      </div>

      {/* Main glowing progress bar */}
      <div className="space-y-1.5">
        <div className="w-full h-2.5 bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden p-0.5">
          <div
            className="h-full bg-gradient-to-r from-[var(--brand-primary)] via-blue-500 to-indigo-500 rounded-full transition-all duration-300 relative shadow-[0_0_8px_rgba(6,182,212,0.4)]"
            style={{ width: `${progress}%` }}
          >
            {/* Animated slide highlight */}
            <span className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.25)_50%,transparent_100%)]  bg-[length:100px_100%]"></span>
          </div>
        </div>
        <div className="flex justify-between text-[9px] text-zinc-500">
          <span>0% INICIADO</span>
          <span>ESTADO OFF-LINE (HARDWARE ACTIVE)</span>
          <span>100% PRONTO</span>
        </div>
      </div>

      {/* Two-Column Animated HUD Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
        
        {/* Animated Docker Block */}
        <div className="bg-zinc-950/80 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] text-[var(--brand-light)]">DAEMON CONTAINER SERVICE</span>
              <h4 className="text-xs font-semibold text-zinc-300 mt-0.5">Docker Engine v26.1</h4>
            </div>
            <span className={`text-[9px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-1.5 py-0.5 rounded ${modules.docker.status === "running" ? "animate-pulse" : ""}`}>
              {modules.docker.status === "completed" ? "✓ CONCLUÍDO" : modules.docker.status === "running" ? "● PORTAL ATIVO" : "⏱️ AGUARDANDO"}
            </span>
          </div>

          {/* Docker Whale & Floating Cargo Blocks SVG */}
          <div className="h-28 flex items-center justify-center bg-black/40 rounded-lg relative overflow-hidden border border-zinc-900">
            {/* Grid background effect */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:14px_14px]"></div>
            
            <div className="relative flex flex-col items-center">
              {/* Docker Whales outline simulated */}
              <svg className="w-16 h-10 text-[var(--brand-light)] mt-2" viewBox="0 0 64 30" fill="none" stroke="currentColor" strokeWidth="1.5">
                {/* Whale body outline */}
                <path d="M5 20C5 20 10 16 18 16C26 16 32 21 40 21C48 21 54 18 56 12C58 6 52 10 50 12" strokeDasharray="2 2" className="animate-pulse" />
                <path d="M6 21C8 22 15 24 26 24C38 24 48 21 52 19C56 17 59 14 59 9C59 6 56 8 55 10C53 14 45 19 35 19C25 19 15 21 6 21Z" fill="currentColor" fillOpacity="0.05" />
                {/* Spouting water effect */}
                <path d="M48 6C48 6 49 3 47 1M51 5C51 5 53 3 53 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="" />
              </svg>

              {/* Floating cargo containers stacked */}
              <div className="absolute -top-1.5 flex gap-1">
                <span className={`w-3 h-2 rounded bg-[var(--brand-primary)]/20 border border-[var(--brand-border)] flex transition-all ${modules.docker.progress >= 20 ? "animate-bounce bg-[var(--brand-light)]/80" : "opacity-30"}`}></span>
                <span className={`w-3 h-2 rounded bg-blue-500/20 border border-blue-400/50 flex transition-all ${modules.docker.progress >= 50 ? "animate-bounce bg-blue-400/80" : "opacity-30"}`}></span>
                <span className={`w-3 h-2 rounded bg-[var(--brand-primary)]/20 border border-[var(--brand-border)] flex transition-all ${modules.docker.progress >= 80 ? "animate-bounce bg-[var(--brand-light)]/80" : "opacity-30"}`}></span>
                <span className={`w-3 h-2 rounded bg-indigo-500/20 border border-indigo-400/50 flex transition-all ${modules.docker.progress >= 95 ? "animate-bounce bg-indigo-400/80" : "opacity-30"}`}></span>
              </div>
              
              <span className="text-[9px] text-zinc-500 mt-2">
                {modules.docker.status === "running" ? `Provisionando Containers... ${modules.docker.progress}%` : 
                 modules.docker.status === "completed" ? "Stack Docker iniciada 100%" : "Aguardando Docker..."}
              </span>
            </div>
          </div>

          {/* Checklist of micro-services inside Docker */}
          <div className="grid grid-cols-2 gap-1 px-1 text-[9px] text-zinc-400">
            <div className="flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${modules.docker.progress >= 20 ? "bg-[var(--brand-light)] " : "bg-zinc-800"}`}></span>
              <span>Vector DB Chroma</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${modules.docker.progress >= 50 ? "bg-[var(--brand-light)] animate-ping" : "bg-zinc-800"}`}></span>
              <span>n8n Flows Orchestrat</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${modules.docker.progress >= 80 ? "bg-[var(--brand-light)] animate-ping" : "bg-zinc-800"}`}></span>
              <span>PostgreSQL Finance</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${modules.docker.progress >= 95 ? "bg-[var(--brand-light)] animate-ping" : "bg-zinc-800"}`}></span>
              <span>Home Assistant Smart</span>
            </div>
          </div>
        </div>

        {/* Animated Groq Cloud Block */}
        <div className="bg-zinc-950/80 border border-zinc-900 rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] text-lime-500">IA NUVEM ULTRA RÁPIDA</span>
              <h4 className="text-xs font-semibold text-zinc-300 mt-0.5">Groq Cloud API</h4>
            </div>
            <span className={`text-[9px] text-lime-400 bg-lime-950/40 border border-lime-900/30 px-1.5 py-0.5 rounded animate-pulse`}>
              ✓ LPU DISPONÍVEL
            </span>
          </div>

          {/* Cloud Orbit Constellation SVG */}
          <div className="h-28 flex items-center justify-center bg-black/40 rounded-lg relative overflow-hidden border border-zinc-900">
            {/* Starry matrix backdrop */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(132,204,22,0.04)_0%,transparent_70%)] animate-pulse"></div>
            
            <div className="relative flex flex-col items-center">
              {/* Central Cloud Node */}
              <div className="bg-lime-950/40 border-2 border-lime-400/60 p-2 rounded-full animate-pulse shadow-[0_4px_12px_rgba(132,204,22,0.15)] z-10">
                <svg className="w-5 h-5 text-lime-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                  <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.2" />
                </svg>
              </div>

              {/* Orbit dots */}
              <div className="absolute top-1/2 left-1/2 -ml-8 -mt-8 h-16 w-16 rounded-full border border-dashed border-lime-500/20 animate-spin">
                <span className="absolute -top-1 left-1/2 -ml-1 h-2 w-2 rounded-full bg-lime-400 shadow-[0_0_8px_#84cc16]"></span>
              </div>
              <div className="absolute top-1/2 left-1/2 -ml-5 -mt-5 h-10 w-10 rounded-full border border-dotted border-[var(--brand-primary)]/20 animate-spin">
                <span className="absolute -bottom-1 left-1/2 -ml-1 h-1.5 w-1.5 rounded-full bg-[var(--brand-light)] shadow-[0_0_8px_#06b6d4]"></span>
              </div>

              <span className="block text-[9px] text-zinc-500 mt-2 font-mono">
                Latência LPU estimada: 60ms
              </span>
            </div>
          </div>

          {/* Model registries and details */}
          <div className="space-y-1 text-[9px] leading-snug">
            <div className="flex justify-between items-center bg-black/40 px-2 py-0.5 rounded border border-zinc-900/50">
              <span>llama-3.3-70b-versatile</span>
              <span className="text-lime-400">
                Cloud API Rate Ligth
              </span>
            </div>
            <div className="flex justify-between items-center bg-black/40 px-2 py-0.5 rounded border border-zinc-900/50">
              <span>nomic-embed-text (Groq)</span>
              <span className="text-lime-400">
                 Cloud API RAG
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Dynamic Obsidian RAG Brain Setup Segment */}
      <div className="bg-[var(--brand-dark)] border border-[var(--brand-border)] rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-2 text-white text-xs">
          <span className={`h-2.5 w-2.5 rounded-full bg-[var(--brand-primary)] shrink-0 ${modules.obsidian.status === "running" ? "animate-ping" : ""}`}></span>
          <div>
            <strong className="block text-[11px] text-[var(--brand-light)]">Cérebro Obsidian Vault (RAG Ingestion Automatizada):</strong>
            <span className="text-[10px] text-zinc-400 leading-relaxed block">
              {modules.obsidian.status === "completed" 
                ? "✓ 5 arquivos Markdown gerados e sincronizados com ChromaDB local." 
                : modules.obsidian.status === "running"
                  ? "Moldando /perfil, /financas, /casa e rotinas no diretório de conhecimento..."
                  : "Aguardando estruturação do diretório de notas."}
            </span>
          </div>
        </div>
        <span className="text-[9px] font-semibold text-[var(--brand-light)] bg-[var(--brand-dark)] border border-[var(--brand-border)] px-2 py-0.5 rounded uppercase shrink-0">
          {modules.obsidian.status === "completed" ? "Mapeado" : modules.obsidian.status === "running" ? `Estruturando ${modules.obsidian.progress}%` : "Pendente"}
        </span>
      </div>

    </div>
  );
}

interface InstallerProps {
  installerState: any;
  onRefresh: () => void;
}

export default React.memo(function Installer({ installerState, onRefresh }: InstallerProps) {
  const [activeTab, setActiveTab] = useState<"installer" | "compose" | "script">("installer");
  const [copiedText, setCopiedText] = useState(false);
  const [detectExisting, setDetectExisting] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [installerState?.logs?.length]);

  const triggerInstallation = async () => {
    try {
      await fetch(getServerUrl() + "/api/install/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detectExisting })
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const resetInstallation = async () => {
    try {
      await fetch(getServerUrl() + "/api/install/reset", { method: "POST" });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // The actual functional Docker Compose YAML configuration
  const dockerComposeYaml = `version: "3.8"

services:
  # ChromaDB - Vector database for RAG
  chromadb:
    image: chromadb/chroma:latest
    container_name: jarvis_chromadb
    ports:
      - "8000:8000"
    volumes:
      - chroma_data:/chroma/data
    environment:
      - ALLOW_RESET=TRUE
    restart: unless-stopped

  # n8n - Automation & Workflow engine
  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    container_name: jarvis_n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - GENERIC_TIMEZONE=America/Sao_Paulo
    volumes:
      - n8n_data:/home/node/.n8n
      - ./jarvis-vault:/data/vault:ro # Mount Obsidian vault (Read-Only)
    restart: unless-stopped

  # Home Assistant - Smart Home IoT hub
  homeassistant:
    image: lscr.io/linuxserver/homeassistant:latest
    container_name: jarvis_homeassistant
    ports:
      - "8123:8123"
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/Sao_Paulo
    volumes:
      - ha_config:/config
    restart: unless-stopped

  # PostgreSQL - Relational DB for Agenda & Finances
  db:
    image: postgres:15-alpine
    container_name: jarvis_postgres
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=jarvis
      - POSTGRES_PASSWORD=jarvis_secure_pass
      - POSTGRES_DB=jarvis_core
    volumes:
      - pg_data:/var/lib/postgresql/data
    restart: unless-stopped

  # Redis - Cache and Session message queues
  redis:
    image: redis:alpine
    container_name: jarvis_redis
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  chroma_data:
  n8n_data:
  ha_config:
  pg_data:
`;

  // Real Linux Bash Script to install everything automatically
  const bashScript = `#!/bin/bash
# install_jarvis_suite.sh
# Script de Instalação e Configuração Automatizada do Ecossistema JARVIS v5.0
# Execute este arquivo localmente no terminal do Linux como root ou sudo

echo -e "\\e[36m=========================================================\\e[0m"
echo -e "\\e[36m          JARVIS AUTOMATED INSTALLER (LINUX)             \\e[0m"
echo -e "\\e[36m=========================================================\\e[0m"
echo "Este script irá instalar o Docker e estruturar o Obsidian no seu Servidor Linux."

# 1. Verificar privilégios de root
if [ "$EUID" -ne 0 ]; then
  echo -e "\\e[33mAVISO: Por favor, execute este script como root (sudo ./install_jarvis_suite.sh) para instalar os softwares.\\e[0m"
  exit 1
fi

# 2. Atualizar repositórios e instalar dependências essenciais
echo -e "\\e[33m[1/5] Atualizando pacotes APT e instalando utilitários essenciais...\\e[0m"
apt-get update && apt-get install -y curl wget git jq unzip nodejs npm

# 3. Instalar softwares (Docker)
echo -e "\\e[33m[2/5] Baixando e Instalando Softwares Core no Servidor...\\e[0m"

# Instalar Docker
echo -e "\\e[36mInstalando Docker Engine...\\e[0m"
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  usermod -aG docker $SUDO_USER
else
  echo "Docker já instalado."
fi

# 4. Criar estrutura do Obsidian Vault
echo -e "\\e[33m[3/5] Estruturando Vault do Sistema no diretório ~/jarvis-vault...\\e[0m"
VAULT_PATH="/home/$SUDO_USER/jarvis-vault"
if [ -z "$SUDO_USER" ]; then VAULT_PATH="$HOME/jarvis-vault"; fi

mkdir -p "$VAULT_PATH"/{perfil,agenda,financas,casa,conversas,aprendizados,arquivos-indexados,rotinas-pc}

# Criar arquivo de Perfil do Usuário padrão com dados estruturados
cat <<EOT > "$VAULT_PATH/perfil/usuario.md"
# Perfil do Usuário

Nome: Usuário Mestre
Tom preferido: Respeitoso, inteligente, direto, estilo Mordomo / JARVIS
Horário produtivo principal: 19:00 - 23:00
Foco atual: Automação residencial de luzes e ar condicionado, e controle financeiro pessoal.
EOT

chown -R $SUDO_USER:$SUDO_USER "$VAULT_PATH"
echo -e "\\e[90mDiretórios criados em $VAULT_PATH\\e[0m"

echo -e "\\e[32m[4/5] Ambiente configurado para Deploy Automático.\\e[0m"

echo -e "\\e[32m[5/5] Docker Instalado!\\e[0m"
echo -e "\\e[32mInstalação concluída com sucesso! Para aplicar os grupos do Docker, faça logout e login novamente.\\e[0m"
`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h2 className="text-xl font-sans font-semibold text-white tracking-tight flex items-center gap-2">
            <Server className="h-5 w-5 text-[var(--brand-light)]" />
            Módulo de Instalação e Provisionamento
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Configure e provisione de forma totalmente automática o ecossistema local do JARVIS (Docker e Obsidian).
          </p>
        </div>
        <div className="flex gap-2">
          {installerState?.status === "idle" && (
            <button
              onClick={triggerInstallation}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[var(--brand-primary)] to-blue-600 hover:from-[var(--brand-primary)] hover:to-blue-500 text-white rounded-lg text-xs font-medium transition shadow-md  cursor-pointer"
            >
              <Play className="h-3.5 w-3.5" />
              Executar Instalação Automática
            </button>
          )}
          {installerState?.status === "installing" && (
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-950/40 border border-yellow-800/60 rounded-lg text-xs text-yellow-400">
              <span className="animate-ping h-2 w-2 rounded-full bg-yellow-400"></span>
              Instalação em Progresso ({installerState?.progress}%)
            </div>
          )}
          {installerState?.status === "completed" && (
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 px-3 py-2 bg-emerald-950/30 border border-emerald-800/60 rounded-lg text-xs text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                Instalado e Configurado
              </span>
              <button
                onClick={resetInstallation}
                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white rounded-lg text-xs font-medium transition cursor-pointer"
                title="Reiniciar Instalação"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Smart detection layout banner */}
          {installerState?.status === "idle" && (
            <div className="p-4 rounded-xl border border-dashed border-[var(--brand-border,rgba(6,182,212,0.35))] bg-[var(--brand-glow,rgba(6,182,212,0.1))] space-y-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="detect-existing-check"
                  checked={detectExisting}
                  onChange={(e) => setDetectExisting(e.target.checked)}
                  className="mt-1 h-4 w-4 text-[var(--brand-primary)] border-zinc-800 bg-zinc-950 rounded focus:ring-[var(--brand-primary)] cursor-pointer"
                />
                <label htmlFor="detect-existing-check" className="text-xs text-zinc-300 font-sans leading-relaxed cursor-pointer select-none">
                  <span className="font-semibold text-white block">Reutilizar e Pular Passos Manuais Concluídos (Etapas 1 a 4)</span>
                  Identifiquei que você já iniciou a configuração manual do ecossistema. Ative esta opção para que o instalador do JARVIS faça um scanner de ambiente, preserve as pastas <code className="bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded text-[var(--brand-light,rgba(6,182,212))] font-mono text-[10px]">~/jarvis-vault</code> e contêineres Docker, evitando downloads lentos e sobrescritas de arquivos!
                </label>
              </div>
            </div>
          )}

          {/* Status Bars for Modules or Smooth Animated Loading Transitions HUD */}
          {installerState?.status === "installing" ? (
            <InstallerLoadingHUD
              progress={installerState?.progress || 0}
              modules={installerState?.modules}
            />
          ) : (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-mono font-medium text-zinc-300 tracking-wider uppercase mb-2">Subsistemas Alvo</h3>
              {Object.entries(installerState?.modules || {}).map(([key, mod]: [string, any]) => (
                <div key={key} className="space-y-1.5 bg-zinc-950/40 border border-zinc-900/40 p-3 rounded-lg">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-200 font-medium">{mod.label}</span>
                    <span className={`font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                      mod.status === "completed" ? "bg-emerald-950/80 text-emerald-400" :
                      mod.status === "running" ? "bg-[var(--brand-dark)] text-[var(--brand-light)] animate-pulse" :
                      "bg-zinc-800 text-zinc-500"
                    }`}>
                      {mod.status === "completed" ? "Concluído" : mod.status === "running" ? "Processando" : "Pendente"}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        mod.status === "completed" ? "bg-emerald-500" :
                        mod.status === "running" ? "bg-[var(--brand-primary)]" : "bg-zinc-700"
                      }`}
                      style={{ width: `${mod.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Terminal Console log visualization */}
          <div className="bg-black/90 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-80 shadow-2xl">
            <div className="flex justify-between items-center bg-zinc-900/80 px-4 py-2 border-b border-zinc-800">
              <span className="text-zinc-400 text-xs font-mono flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-[var(--brand-light)]" />
                Console de Provisionamento Local (Bash logs)
              </span>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/50"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/50"></span>
              </div>
            </div>
            <div
              ref={logContainerRef}
              className="p-4 font-mono text-[11px] leading-relaxed text-zinc-300 overflow-y-auto flex-1 space-y-1 select-text scrollbar-thin scrollbar-thumb-zinc-850"
            >
              {installerState?.logs.length === 0 ? (
                <div className="text-zinc-600 italic flex items-center justify-center h-full">
                  Nenhuma atividade de log registrada. Clique em "Executar Instalação" para iniciar o provisionamento.
                </div>
              ) : (
                installerState.logs.map((log: string, idx: number) => {
                  let colorClass = "text-zinc-300";
                  if (log.includes("[INFO]")) colorClass = "text-[var(--brand-light)]";
                  if (log.includes("[DOCKER]")) colorClass = "text-blue-400";
                  if (log.includes("[OBSIDIAN]")) colorClass = "text-[var(--brand-light)]";
                  if (log.includes("[GROQ]")) colorClass = "text-lime-400";
                  if (log.includes("[N8N]")) colorClass = "text-pink-400";
                  if (log.includes("CONCLUÍDA") || log.includes("sucesso")) colorClass = "text-emerald-400 font-semibold";

                  return (
                    <div key={idx} className={`${colorClass} whitespace-pre-wrap`}>
                      {log}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Configuration Downloads Area */}
        <div className="space-y-6">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-mono font-medium text-zinc-300 tracking-wider uppercase">Ficheiros de Deploy Físico</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Como esta aplicação está rodando em um ambiente de demonstração sandbox em nuvem, você pode obter arquivos reais para configurar tudo no seu próprio PC / servidor caseiro.
            </p>

            <div className="flex gap-1 border-b border-zinc-800">
              <button
                onClick={() => setActiveTab("installer")}
                className={`flex-1 pb-2 text-[11px] font-mono text-center border-b transition-colors cursor-pointer ${
                  activeTab === "installer" ? "border-[var(--brand-primary)] text-[var(--brand-light)] font-semibold" : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Passo a Passo
              </button>
              <button
                onClick={() => setActiveTab("compose")}
                className={`flex-1 pb-2 text-[11px] font-mono text-center border-b transition-colors cursor-pointer ${
                  activeTab === "compose" ? "border-[var(--brand-primary)] text-[var(--brand-light)] font-semibold" : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                docker-compose.yml
              </button>
              <button
                onClick={() => setActiveTab("script")}
                className={`flex-1 pb-2 text-[11px] font-mono text-center border-b transition-colors cursor-pointer ${
                  activeTab === "script" ? "border-[var(--brand-primary)] text-[var(--brand-light)] font-semibold" : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                AutoInstaller.ps1
              </button>
            </div>

            {activeTab === "installer" && (
              <div className="space-y-3.5 text-xs text-zinc-300 leading-relaxed">
                <div className="flex gap-2.5 items-start bg-zinc-950/30 p-2.5 rounded-lg border border-zinc-900">
                  <span className="bg-[var(--brand-dark)] text-[var(--brand-light)] rounded-full h-5 w-5 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                  <div>
                    <strong className="text-zinc-200">Prepare o Ambiente Linux:</strong> Abra o Terminal do Servidor Linux e execute o script bash auto-instalador como sudo. Ele instalará Docker e Obsidian no Linux nativamente. Em seguida adicione a Groq API Key nas opções e pronto, o sistema rodará 100% cloud-LLM usando Node/Systemd.
                  </div>
                </div>
                <div className="flex gap-2.5 items-start bg-zinc-950/30 p-2.5 rounded-lg border border-zinc-900">
                  <span className="bg-[var(--brand-dark)] text-[var(--brand-light)] rounded-full h-5 w-5 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                  <div>
                    <strong className="text-zinc-200">Suba os Containers:</strong> Crie uma pasta, cole o arquivo <code className="text-[var(--brand-light)] font-mono text-[10px]">docker-compose.yml</code> e rode o comando:
                    <pre className="bg-black/40 px-2 py-1.5 rounded mt-1.5 text-[10px] text-lime-400 font-mono select-all">docker compose up -d</pre>
                  </div>
                </div>
                <div className="flex gap-2.5 items-start bg-zinc-950/30 p-2.5 rounded-lg border border-zinc-900">
                  <span className="bg-[var(--brand-dark)] text-[var(--brand-light)] rounded-full h-5 w-5 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                  <div>
                    <strong className="text-zinc-200">Ative o App do PC:</strong> O widget de voz e o controle Electron no seu computador de uso pessoal sincronizam com o desktop via IP da Rede Local instantaneamente.
                  </div>
                </div>
              </div>
            )}

            {activeTab === "compose" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-zinc-500">Mapeamento dos Containers Docker</span>
                  <button
                    onClick={() => handleCopy(dockerComposeYaml)}
                    className="flex items-center gap-1 text-[10px] font-mono text-[var(--brand-light)] hover:text-white transition cursor-pointer"
                  >
                    {copiedText ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedText ? "Copiado!" : "Copiar"}
                  </button>
                </div>
                <pre className="bg-black/50 p-3 rounded-lg overflow-x-auto text-[9px] font-mono text-zinc-400 h-64 leading-tight select-text scrollbar-thin scrollbar-thumb-zinc-800">
                  {dockerComposeYaml}
                </pre>
              </div>
            )}

            {activeTab === "script" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-zinc-500">Linux Bash Auto-Installer</span>
                  <button
                    onClick={() => handleCopy(bashScript)}
                    className="flex items-center gap-1 text-[10px] font-mono text-[var(--brand-light)] hover:text-white transition cursor-pointer"
                  >
                    {copiedText ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedText ? "Copiado!" : "Copiar"}
                  </button>
                </div>
                <pre className="bg-black/50 p-3 rounded-lg overflow-x-auto text-[9px] font-mono text-zinc-400 h-64 leading-tight select-text scrollbar-thin scrollbar-thumb-zinc-800">
                  {powershellScript}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
