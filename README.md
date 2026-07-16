# JARVIS Core Suite v6.0 — Inteligência Omnidirecional (Node + Python + Tauri)

Este repositório contém a arquitetura universal e modular do Jarvis. Com a nova fundação `v6.0`, nosso ecossistema opera de forma ultra-performática, com telemetria ativa e execução em background.

---

### 🧩 Arquitetura Modular
1. **Frontend / Desktop (Tauri.rs)**: Reconstruído sobre bibliotecas **Rust**. A API do Tauri provê uma **Overlay Glassmorphism** translúcida no Windows/Linux pareada aos *Global Shortcuts* (Pressione `Ctrl+Espaço` a qualquer momento para invocar).
2. **Backend Core (Node.js)**: API `server.ts` executada com Prisma roteando WebSockets, manipulações do DOM e ponte primária para orquestração da LLM Groq (RAG).
3. **Engine Analítica e Daemon (Python)**: Servidor Python local desacoplado (`jarvis_engine/main.py`) agindo na esteira do banco SQLite executando em background 24/7. Responde pelos agendamentos em `APScheduler` (ex. Learning Loop, Health Ping) e varreduras autônomas por contexto (*Deep Research* atestando logs em `.evals`). 

---

### 🚀 Instalação (Autoinstallers Universais)
Abra o repositório no terminal e execute o utilitário nativo providenciado para instalar de forma 100% autônoma as requisições Python (VirtualEnv), NodeJS e compiladores.
- **Windows**: `.\install.ps1`
- **Linux/Mac**: `./install.sh`

> **Nota**: Após a instalação não é necessário iniciar manualmente o daemon se não quiser. 
Para auditar a saúde de sua máquina local e credenciais (ex: Validar latência Cloud-Minds e conexões LPU da GROQ), apenas execute a ferramenta de diagnóstico rápido integrada:
**`python jarvis_engine/main.py --mode doctor`**
