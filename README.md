# JARVIS Core Suite v5.0 — Sistema de Assistente Pessoal Local-First e Privado

Este repositório contém o código-fonte, a documentação e os scripts de deploy do **JARVIS** (Just A Rather Very Intelligent System). O ecossistema é projetado sob a filosofia *Local-First* (comunicação direta e irrestrita em rede local), trazendo privacidade absoluta (zero APIs terceirizadas na versão de produção), custo recorrente zero e performance de alto nível acelerada por **NVIDIA CUDA**.

O software atua como a interface central do usuário (app de desktop) onde se manipula a IA local, além de funcionar como o **Instalador e Configurador Automatizado** de todo o ecossistema e ferramentas satélites necessárias.

---

## 🛠️ Detalhes de Implementação Técnica

O JARVIS é focado em processar todas as regras em hardware de VRAM dedicada em seu Notebook Servidor (idealmente com uma placa GTX 1650 de 4GB e 16GB de RAM).

### 🦾 Arquitetura Modular

1. **Camada de IA Local (Ollama)**
   - Roda o modelo de NLP para LLM, ocupando o processamento do servidor dedicado.
   - Utiliza outro modelo ultraleve (**nomic-embed-text**) para converter textos em vetores matemáticos para a pesquisa semântica local.
   - O Ollama roda nativamente no sistema Linux Mint. Todo o gerenciamento de modelos e a interface de Chat ("Estilo ChatGPT") é centralizada nativamente na própria Web UI do JARVIS!

2. **Ingestão Inteligente de Conhecimento (RAG)**
   - Utiliza **ChromaDB** rodando em container Docker como banco de dados vetorial.
   - Toda vez que notas são inseridas ou alteradas, um nó disparador de arquivos locais no n8n processa a documentação física, divide em pedaços (*chunks*), transforma em vetores usando o nomic-embed e grava no ChromaDB de forma invisível.

3. **Base de Memória Mutável (Obsidian Vault)**
   - Toda a memória de longo prazo do JARVIS é guardada em arquivos Markdown legíveis em formato texto normal em uma pasta `~/jarvis-vault` no Linux.
   - Você pode ler diretamente, modificar o que o assistente aprendeu ou auditar preferências abrindo o App nativo do Obsidian no Linux (ou usando a UI do JARVIS). O backend sincroniza os arquivos em disco automaticamente para que os triggers do n8n detectem mudanças.

4. **Automação Residencial e Controle do PC Master**
   - O servidor Linux orquestra tudo, mas o executável App Electron **roda no seu PC Windows pessoal** e possui comunicação bidirecional com o Linux. O Electron app atrelado a um arquivo `jarvis-target.txt` faz a ponte de microfone, executa tarefas e possibilita o controle remoto de forma imersiva.

---

## 🚀 Instalação e Inicialização Automática

Toda a infraestrutura do JARVIS v5.0 (Instalador Nativo do Windows via Powershell, Containers Docker, Modelos do Ollama e Integrações n8n) está consolidada em um único e definitivo guia passo-a-passo.

🔗 **[CLIQUE AQUI PARA ACESSAR O TUTORIAL COMPLETO DE INSTALAÇÃO](./TUTORIAL_COMPLETO_INSTALACAO_N8N.md)**

Siga o arquivo acima e em alguns minutos você terá seu próprio ecossistema de Inteligência Artificial privado rodando nativamente no seu Windows.

---

## 🎧 Modos de Operação da IA

O JARVIS permite interação por texto e por voz utilizando a Web Speech API:

- **Conversação por Voz**: Clique no ícone de microfone para falar com a IA, e ela responderá em áudio usando TTS (Text-to-Speech).
- **Terminal de Comando**: Digite comandos ou consultas tradicionais no console unificado no rodapé da página.

*Para colocar o desktop em modo silencioso e levar para a faculdade, clique em "Hibernar JARVIS" na barra do sistema — o comando de pause amortizará todos os containers.*
