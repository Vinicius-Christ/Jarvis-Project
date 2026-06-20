# JARVIS Core Suite v5.0 — Sistema de Assistente Pessoal Cloud-Minds e Local-Storage

Este repositório contém o código-fonte, a documentação e os scripts de deploy do **JARVIS** (Just A Rather Very Intelligent System). O ecossistema é projetado primariamente com as execuções pesadas extraídas para computação LPU em nuvem, deixando seu servidor linux / app super leve e instantâneo. A privacidade permanece no fato de seu histórico e vector database estarem guardados no armazenamento local no seu próprio servidor de forma orquestrada. 

O software atua como a interface central do usuário (Aplicativo Web UI App-Like) onde se manipula a IA, além de agir como **Instalador e Configurador Automatizado** de todo o ecossistema e ferramentas satélites necessárias.

---

## 🛠️ Detalhes de Implementação Técnica

O JARVIS é focado em processar sua rotina local através de contêineres otimizados, utilizando a infraestrutura terceirizada e ultrarrápida para computação pesada de linguagem.

### 🦾 Arquitetura Modular

1. **Inteligência em 100% Cloud (Groq LPU)**
   - Transição concluída de IA Local (Ollama) para a infraestrutura LPU via API da Groq (`llama-3.3-70b-versatile`). Respostas super-rápidas em milissegundos sem sobrecarregar sua placa de vídeo.
   - Utiliza também geração rápida de RAG embeddings integrados a pipeline.

2. **Ingestão Inteligente de Conhecimento (RAG)**
   - Utiliza **ChromaDB** rodando em container Docker como banco de dados vetorial.
   - Toda vez que notas são inseridas no Vault pessoal, elas são dividas em vetores localmente para as buscas semânticas mantendo tudo em um ecossistema super acoplado.

3. **Base de Memória Mutável (Obsidian Vault)**
   - Toda a memória de longo prazo do JARVIS é guardada em arquivos Markdown legíveis em formato texto normal em uma pasta `~/jarvis-vault` no Linux.
   - Você pode ler diretamente, auditar o que o assistente aprendeu ou auditar preferências abrindo o App nativo do Obsidian e roteando ao Vault no Linux (Samba Network / SFTP). O backend sincroniza os arquivos automaticamente.

4. **Automação Automática e Scripts de Deploy**
   - Na própria UI do JARVIS está embarcado o roteador visual para baixar seu script bash (`deploy_jarvis.sh`). Execute-o para instalar via comando único o Docker, levantar o App, contêineres e bancos de forma isolada!

---

## 🚀 Instalação e Inicialização Automática

Toda a infraestrutura do JARVIS v5.0 está consolidada para ambas as plataformas Linux e Windows:

### 🐧 Ambiente Linux (Recomendado)
O script bash `deploy_jarvis.sh` automatiza a instalação completa no Linux (Docker, Containers, Node.js API e demais ferramentas).
🔗 **[CLIQUE AQUI PARA ACESSAR O TUTORIAL COMPLETO DE INSTALAÇÃO DO LINUX](./TUTORIAL_COMPLETO_INSTALACAO_N8N.md)**

### 🪟 Ambiente Windows (Experimental / PowerShell)
Para usuários do sistema Windows, disponibilizamos o script automatizado `AutoInstaller.ps1` em PowerShell. Ele configura o ambiente, instala o Obsidian via Winget, gerencia as dependências do Node.js e instala/compila o ecossistema.
Para executar no PowerShell em modo Administrador:
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; .\AutoInstaller.ps1
```

---

## 🎧 Modos de Operação da IA

O JARVIS permite interação por texto e por voz utilizando a Web Speech API:

- **Conversação por Voz**: Clique no ícone de microfone para falar com a IA, e ela responderá prontamente com a fala gerada de forma gratuita e fluída pelo novo motor **Edge TTS** integrado nativamente em português (PT-BR).
- **Terminal de Comando**: Digite comandos ou consultas tradicionais no console unificado no rodapé da página.
- O sistema é leve e acessado unicamente nos navegadores ou encapsulamente em webviews Mobile / Cloudflare.
