# 📚 Manual do Administrador Soberano: Configuração do JARVIS Core Suite v5.0
### Arquitetura Descentralizada: Servidor Automático (Linux Mint) & Cliente Estrito de Voz (Windows)

Este manual definitivo foi desenvolvido sob medida para o seu cenário: um **Notebook Servidor** com uma instalação limpa do **Linux Mint (do zero, sem nada instalado)** e um **PC Pessoal (Windows)** de uso geral que atuará puramente como o cliente de voz e visor do JARVIS.

> 🚫 **REGRA DE OURO DE DEPRECIAÇÃO DE RECURSOS:** O Docker, banco de dados PostgreSQL, Redis, n8n, ChromaDB e o pesado motor de Inteligência Artificial (Ollama) **ficarão única e exclusivamente no seu notebook Linux Mint (Servidor)**. Seu computador pessoal Windows ficará totalmente livre desse peso, hospedando apenas o aplicativo visual leve do JARVIS, evitando qualquer degradação de performance nos seus jogos ou programas de trabalho!

---

## 🏗️ VISÃO GERAL DA ARQUITETURA DE REDE

```
  [ PC PESSOAL WINDOWS (CLIENTE) ]            [ NOTEBOOK LINUX MINT (SERVIDOR) ]
   - Roda unicamente o App JARVIS (.exe)       - Executa a API principal em Node (porta 3000)
   - Escuta o Microfone local ("Hey Jarvis")   - Roda os containers Docker em background:
   - Peso na CPU/GPU: Praticamente 0%          - Postgres, n8n, ChromaDB, Redis, Home Assistant
   - Não possui Docker nem bancos instalados    - Executa o Ollama de IA nativo (porta 11434)
                     |                                         |
                     +--------------- < Wi-Fi / LAN > ---------+
```

---

## 🛠️ FASE 1: INSTALAÇÃO TOTAL E AUTOMÁTICA DO SERVIDOR (LINUX MINT DO ZERO)

Ligue o seu notebook com o **Linux Mint recém-instalado** e conecte-o na rede Wi-Fi ou conecte o cabo de rede.

### Passo 1: Instalar o Git, Baixar e Extrair o Código do JARVIS
O Linux Mint novo não vem com ferramentas de download ou Git instaladas. Vamos prepará-las.

1. Abra o **Terminal** do Linux Mint (`Ctrl + Alt + T`).
2. Instale o Git e utilitários de descompactação digitando:
   ```bash
   sudo apt update
   sudo apt install -y git wget unzip
   ```

3. **Como Baixar o seu Repositório Privado:**
> ⚠️ **POR QUE DEU ERRO 404 COM WGET?** Como o seu repositório `Jarvis-Project-` é **Privado**, o GitHub impede qualquer download via terminal (`wget` ou clone simples) sem autenticação prévia de segurança, respondendo com um erro `404 Not Found`.

Escolha um dos dois métodos abaixo para baixar o código com sucesso no seu notebook Linux Mint:

#### ⚡ MÉTODO 1 (Mais Fácil - Recomendado): Baixar o ZIP usando o Navegador do Linux Mint
Como você está com o Linux Mint rodando na sua frente, a forma mais rápida de evitar criar chaves no terminal é baixar do site diretamente:
1. Abra o navegador **Firefox** (recheado por padrão no Linux Mint).
2. Acesse o site do [GitHub](https://github.com) e faça o login com sua conta: `vini091422`
3. Entre na página do seu repositório: `https://github.com/Vinicius-Christ/Jarvis-Project-`
4. Clique no botão verde **`<> Code`** e clique em **`Download ZIP`**.
5. O arquivo ZIP será baixado diretamente para a sua pasta de downloads (`~/Downloads`).
6. Volte ao seu Terminal (`Ctrl + Alt + T`) e extraia o pacote do código:
   ```bash
   cd ~/Downloads
   unzip Jarvis-Project--main.zip || unzip Jarvis-Project-.zip
   
   # Entre na pasta extraída do código:
   cd Jarvis-Project--main || cd Jarvis-Project-
   ```

#### 🔑 MÉTODO 2: Clonar via Terminal utilizando um Personal Access Token (PAT)
Se você preferir clonar via terminal usando o Git:
1. Acesse o GitHub pelo navegador e vá nas configurações do perfil: **Settings > Developer Settings > Personal Access Tokens > Tokens (classic)**.
2. Crie um novo Token de acesso, dê as permissões de **`repo`** (controle total de repositórios privados) e salve-o em algum lugar seguro. Ele começará com `ghp_...`.
3. No terminal do Linux Mint, digite o clone:
   ```bash
   cd ~/Downloads
   git clone https://github.com/Vinicius-Christ/Jarvis-Project-.git
   cd Jarvis-Project-
   ```
4. Quando perguntar **`Username`**, digite seu usuário do GitHub: `vini091422`
5. Quando perguntar **`Password`**, **NÃO DIGITE SUA SENHA COMUM**. Clique com o botão direito do mouse no terminal e **cole o Token de Segurança (`ghp_...`)** que você gerou, e aperte `Enter`. O clone será descarregado perfeitamente!

### Passo 2: Rodar o Script de Instalação Um-Clique (`AutoInstaller.sh`)
Criamos um script atualizado e super inteligente que faz **TODOS** os passos descritos de uma única vez para você no Linux Mint:
* Instala o Docker Engine oficial e o Docker-Compose.
* Configura as dependências do Node.js de produção v20 e as compila.
* Detecta placas NVIDIA dedicadas e vincula o NVIDIA Container Toolkit (para super aceleração gráfica IA).
* Instala o Ollama nativo de forma global no Linux Mint e o configura (`systemd`) para aceitar conexões remotas do seu PC Windows (`OLLAMA_HOST=0.0.0.0:11434`).
* Sincroniza e faz o download automático dos modelos `llama3.2` (8B) e `nomic-embed-text` (embeddings) na sua máquina.
* Cria os repositórios estruturados do seu "Cérebro" Obsidian Vault (`jarvis-vault`).
* **Sobe de forma totalmente automática as ferramentas de background** (PostgreSQL, Redis, ChromaDB, n8n, Home Assistant) usando imagens prontas oficiais da nuvem, sem necessitar de build local lento ou falhas de compilação!

> 💡 **MELHORIA CRÍTICA APLICADA DE SUCESSO:** Removemos o contêiner `jarvis_api` do arquivo `docker-compose.yml`. Como o seu servidor Node roda e responde de forma nativa e super rápida diretamente no seu sistema operacional Linux Mint (via `npm run start`), não há necessidade de duplicá-lo dentro de um container Docker (o que anteriormente causava o erro de `Dockerfile.backend não encontrado`). Além disso, o instalador agora executa sob o soquete seguro de root e corrige de forma recursiva a autoria de todas as pastas geradas para o seu usuário (via `chown`), prevenindo totalmente o erro de `permission denied` que ocorria na conexão com o Docker.

Apenas execute estes dois comandos no terminal do Linux Mint:
```bash
sudo chmod +x AutoInstaller.sh
sudo ./AutoInstaller.sh
```

---

## 🛠️ RESOLVENDO ERROS COMUNS DE OPERAÇÃO

### 1. Mensagem de "Permission Denied" no docker.sock para o seu Usuário
Se após rodar o instalador você tentar digitar manualmente comandos do docker sem `sudo` no terminal do Linux e vir mensagens de permissão negada, isso acontece porque o sistema operacional Linux Mint necessita recarregar a sua sessão de usuário para que a sua adição ao grupo `docker` (feita no script) tenha efeito completo.
* **Solução Instantânea (sem reiniciar):** No terminal do Linux, apenas digite o comando abaixo para aplicar as permissões na hora:
  ```bash
  newgrp docker
  ```
* Alternativamente, você pode apenas fechar o terminal e abrir outro, ou finalizar a sessão e fazer o login novamente no Linux Mint.

### 2. Tela Inicial Travada no status "SISTEMA HIBERNADO"
Se ao abrir o Painel Web ou Electron você for recebido com a tela de sistema hibernado, significa apenas que os contêineres Docker do seu servidor ainda não foram estartados pelo banco de dados local ou que estão em repouso.
* Basta clicar no botão **"⚡ LIGAR JARVIS"** no centro da tela. 
* O servidor Node chamará o docker instantaneamente no plano de fundo e acordará todos os contêineres e bases necessárias na hora!

### 3. "Site Não Seguro" e Microfone Bloqueado no Chrome (Acessando de outro PC)
Como o JARVIS roda localmente sob protocolo HTTP pelo IP (ex: `http://192.168.1.15:3000`), navegadores de outros dispositivos na mesma rede consideram o site "Não Seguro" e bloqueiam automaticamente permissões de Microfone e Câmera por segurança. O App Executável do Windows (`.exe`) corrige isso nativamente, mas se quiser usar pelo Google Chrome no Windows ou celular, faça este pequeno ajuste:

1. No Google Chrome (ou Brave), abra uma nova guia e acesse:
   `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Na caixa de texto em destaque, digite o endereço IPsítio da Web do seu JARVIS no formato completo:
   `http://192.168.1.15:3000` (substitua pelo IP correto do seu Mint).
3. Ao lado direito, mude a caixa de **"Disabled"** para **"Enabled"**.
4. Um botão azul **"Relaunch" / "Reiniciar"** aparecerá na parte inferior da tela. Clique nele.
5. Acesse seu JARVIS novamente pelo navegador. O Chrome agora tratará a rede local como segura, liberando instantaneamente o acesso ao microfone e câmera!

### 4. Cloudflare Tunnels (A melhor forma de ter um Domínio)
Se você quer entrar no site completo do JARVIS (para ver a Dashboard, relatórios e Obsidian) fora de casa, a forma mais moderna e segura não é abrir portas no seu roteador (o que seria perigoso). A melhor prática no mercado hoje é usar o Cloudflare Tunnels:

1. Você compra um domínio (ex: *vinicius.com.br*).
2. Instala um pequeno agente (arquivo) no seu Linux Mint (configurado na plataforma Zero Trust da Cloudflare).
3. O Cloudflare cria um "Túnel" criptografado seguro que mapeia o seu domínio público direto para a porta local `3000` do seu Linux.
4. Você acessará `https://jarvis.vinicius.com.br` (ou o subdomínio que preferir) e o sistema abrirá lindamente, já com cadeado verde (SSL/HTTPS automático). 

> **Dica:** Isso também resolve definitivamente o problema de permissão de microfone mencionado acima sem mexer em *flags*, porque o uso de HTTPS já é tratado como um site 100% seguro pelo Google Chrome e Apple Safari!

---

## 🔋 PAUSANDO O SERVIDOR PARA VIAGEM OU ESTUDO (HIBERNAÇÃO INTELIGENTE DE RAM & CPU)

Se você precisar desconectar o notebook de servidor para estudar fora de casa, usar na faculdade ou viajar, você não precisa se preocupar com as ventoinhas rodando ou consumo excessivo de bateria:

1. Na tela secundária ou no cabeçalho do JARVIS, clique no botão **"Pausar JARVIS"** (ou mude a chave de ativação para desativado).
2. **Como isso funciona de forma super otimizada?** 
   O backend do JARVIS agora envia um comando `docker compose stop` para todos os contêineres pesados de banco e automação (Postgres, Redis, ChromaDB, n8n e Home Assistant).
3. **Por que isso é melhor do que pausar?** 
   O modo pausa convencional mantinha as instâncias alocadas na memória RAM do seu notebook. Usando o `stop` na hibernação inteligente, **nós descarregamos toda a memória RAM e zeramos o uso de CPU** dos containers!
4. Isso **poupa totalmente a bateria do seu notebook** e desliga as ventoinhas barulhentas para que você possa assistir às aulas na faculdade, ler PDFs ou codar localmente no Linux Mint no maior silêncio e autonomia física de bateria!
5. Se você desligar o notebook, os dados permanecerão 100% seguros nas pastas persistidas do Docker.
6. Ao conectá-lo de volta e iniciar o Jarvis (`npm run start`), basta clicar em **"⚡ LIGAR JARVIS"** nas telas do painel. O sistema executa o `docker compose up -d` inteligente que recupera, cria e estarta tudo novamente em menos de 5 segundos de forma limpa!

---

## 💻 FASE 2: GERAÇÃO E INSTALAÇÃO NO SEU PC PESSOAL WINDOWS (CLIENTE)

Lembre-se: **Não instale Docker ou Postgres no Windows!** Faremos apenas o empacotamento do App do Windows para que você tenha um `.exe` instalável limpo e leve.

### Passo 1: Instalar Node-base e Git no Windows
Utilizaremos estas ferramentas rápidas apenas uma vez para preparar e gerar nosso instalador final.
1. Baixe e instale o Git para Windows em [git-scm.com](https://git-scm.com).
2. Baixe e instale o Node.JS (Versão LTS Recomendada) para Windows em [nodejs.org](https://nodejs.org).

### Passo 2: Clonar e Compilar o `.exe` no Windows
1. Abra o **PowerShell** no Windows e vá para um local limpo:
   ```powershell
   cd D:\
   git clone https://github.com/seu-usuario/jarvis-system-suite.git
   cd jarvis-system-suite
   ```
2. Instale as dependências:
   ```powershell
   npm install
   ```
3. **Gere o instalador autocompilado do Windows:**
   ```powershell
   npm run dist
   ```
4. Procure a pasta chamada `release` criada no projeto do Windows. Lá dentro estará o arquivo executável pronto para instalação:
   `JARVIS-Suite-Setup.exe` ou similar.
5. Execute o instalador no seu PC principal. **Ao abrir pela primeira vez, feche o aplicativo.**

### Passo 3: Roteamento Inteligente (Apontando para o Linux Mint)
Nativamente, o App instalável procura o Jarvis em `localhost`. Para desviá-lo para ler o seu servidor Linux Mint:

1. No Windows, clique com o **Botão Direito** no ícone do atalho do JARVIS Core Suite na Área de Trabalho e clique em **"Abrir Local do Arquivo"**.
2. Você será levado à pasta invisível real onde o programa está instalado (como `C:\Users\SEU_NOME\AppData\Local\Programs\jarvis-system-suite`).
3. Crie um arquivo de texto comum do bloco de notas nesta pasta com o nome literal:
   `jarvis-target.txt`
4. Abra o arquivo no bloco de notas e escreva dentro dele o endereço HTTP do seu notebook Linux Mint. Exemplo:
   ```text
   http://192.168.1.15:3000
   ```
5. Salve o arquivo e feche o editor.

Abra o App JARVIS Suite na área de trabalho! O aplicativo Electron abrirá de forma nativa e, no plano de fundo, buscará todas as APIs, bancos, conexões n8n e chats direto do seu cérebro Linux Mint, enquanto seu Windows se mantém 100% livre!

---

## 🧠 FASE 3: IMPORTAÇÃO DOS FLUXOS NO N8N DO SERVIDOR

Com os containers de background ligados, digite no navegador do seu Windows o endereço IP do n8n do seu notebook Linux Mint:
`http://192.168.1.15:5678` 

Siga as orientações para criar sua conta local no n8n. **Sim, apenas os 3 fluxos abaixo são necessários** para que o JARVIS rode de forma autônoma e completa no ecossistema (Chatbot, Memória e Telegram).

Para importar qualquer um deles no n8n:
1. No n8n, crie um fluxo em branco clicando em **"Add workflow"**.
2. No canto superior direito, clique nos três pontinhos e selecione **"Import from JSON"**.
3. Desative as opções (se tiver) e apenas cole o código JSON copiado.

### 🤖 Fluxo 1: Automatizador de Respostas de I.A. (Chatbot Local Webhook)
Este fluxo escuta webhooks externos do seu frontend JARVIS e responde utilizando a inteligência Llama 3.2 no seu próprio notebook.

```json
{
  "name": "JARVIS Local Chatbot Engine",
  "nodes": [
    {
      "parameters": {
        "path": "jarvis-chat",
        "options": {}
      },
      "id": "e0aaddab-e125-4c01-b541-b8efd88a10b4",
      "name": "Webhook Escuta",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [380, 240]
    },
    {
      "parameters": {
        "model": "llama3.2",
        "prompt": "={{ $json.body.message }}",
        "options": {
          "temperature": 0.7
        }
      },
      "id": "bb02996d-3af1-460d-a7ca-eed2f4dfb5db",
      "name": "Ollama Local Model",
      "type": "@n8n/n8n-nodes-langchain.lmOllama",
      "typeVersion": 1,
      "position": [620, 240],
      "credentials": {
        "ollamaApi": {
          "id": "1",
          "name": "Ollama Servidor Interno"
        }
      }
    },
    {
      "parameters": {
        "options": {}
      },
      "id": "cc03cbbe-b33c-41ad-a0bd-37206456f91f",
      "name": "Retornar Resposta",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [860, 240]
    }
  ],
  "connections": {
    "Webhook Escuta": {
      "main": [
        [
          {
            "node": "Ollama Local Model",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Ollama Local Model": {
      "main": [
        [
          {
            "node": "Retornar Resposta",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": true
}
```

### 🗃️ Fluxo 2: Ingestão Automática do Obsidian Vault (ChromaDB)
Monitora silenciosamente todas as alterações que você ou o JARVIS fizerem nos arquivos `.md` e PDFs dentro da pasta `jarvis-vault`. Ele roda 100% autônomo no background do Linux Mint. Quando ele detecta um salvamento, quebra a anotação e grava o vetor matematicamente no banco (nomic-embed) para a Memória da IA!

```json
{
  "name": "JARVIS Memory Sync Pipeline",
  "nodes": [
    {
      "parameters": {
        "triggerOn": "changes",
        "path": "/data/vault",
        "events": [
          "add",
          "change"
        ],
        "options": {}
      },
      "id": "e0de64c0-4275-48fa-865f-4ce5ea26a8d7",
      "name": "Local File Trigger",
      "type": "n8n-nodes-base.localFileTrigger",
      "typeVersion": 1,
      "position": [200, 300]
    },
    {
      "parameters": {
        "operation": "upsert",
        "collection": "jarvis_vault",
        "text": "={{ $json.content }}",
        "metadata": {
          "filename": "={{ $json.filename }}"
        }
      },
      "id": "9cb962aa-8ea8-4e11-be8a-ff195d2bc50e",
      "name": "Chroma Vector Store",
      "type": "n8n-nodes-base.chromadb",
      "typeVersion": 1,
      "position": [480, 300],
      "credentials": {
        "chromaApi": {
          "id": "2",
          "name": "ChromaDB Servidor Interno"
        }
      }
    }
  ],
  "connections": {
    "Local File Trigger": {
      "main": [
        [
          {
            "node": "Chroma Vector Store",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": true
}
```

> **🧠 Como gerenciar e escrever notas agora que o Vault mudou para o Servidor Linux?**
>
> Você tem duas abordagens perfeitas para isso sem precisar instalar n8n no seu Windows:
> 
> **Abordagem 1 (Via Explorador de Arquivos/Samba - Recomendada):** 
> 1. No seu Linux Mint, clique com o botão direito na pasta física `jarvis-vault` e vá em **Sharing Options (Opções de Compartilhamento)**.
> 2. Assinale a caixa "Share this folder" (Permitir acesso de rede ou convidados).
> 3. No seu PC Pessoal Windows, abra o **Explorador de Arquivos**, vá em **Rede**, encontre seu Servidor Linux, e mapeie a pasta `jarvis-vault` como um simples HD de Rede (Ex: Disco `Z:\`).
> 4. Abra o **Obsidian no seu Windows** e selecione "Open Folder as Vault", escolhendo o disco `Z:\`.
> 5. A magia está feita! Ao digitar no seu Windows, os arquivos `.md` são salvos no Linux Mint, e o n8n do Linux captura isso em tempo real, jogando para a mente da IA, processando com o hardware pesado da placa de vídeo do servidor sem custar nada da sua máquina pessoal!
>
> **Abordagem 2 (Totalmente Nuvem pelo Web UI):**
> Em qualquer aba do App `JARVIS Windows` ou do seu navegador `192.168.1.15:3000`, use a aba lateral "Jarvis Vault". Ela envia requisições dinâmicas à API que grava os arquivos direto na pasta no Linux.

### 📱 Fluxo 3: Interface no Telegram (Bot Auxiliar)
Permite que você mande mensagens para o seu JARVIS de fora de casa pelo celular de forma gratuita! (O JARVIS passará a responder pelo Telegram).

```json
{
  "name": "JARVIS Telegram Interface",
  "nodes": [
    {
      "parameters": {
        "updates": ["message"]
      },
      "id": "telegram-trigger",
      "name": "Telegram Trigger",
      "type": "n8n-nodes-base.telegramTrigger",
      "typeVersion": 1,
      "position": [200, 240],
      "webhookId": "jarvis-telegram-bot",
      "credentials": {
        "telegramApi": {
          "id": "3",
          "name": "Telegram Bot API"
        }
      }
    },
    {
      "parameters": {
        "model": "llama3.2",
        "prompt": "={{ $json.message.text }}",
        "options": {}
      },
      "id": "ollama-telegram",
      "name": "Ollama Responder",
      "type": "@n8n/n8n-nodes-langchain.lmOllama",
      "typeVersion": 1,
      "position": [460, 240],
      "credentials": {
        "ollamaApi": {
          "id": "1",
          "name": "Ollama Servidor Interno"
        }
      }
    },
    {
      "parameters": {
        "chatId": "={{ $('Telegram Trigger').item.json.message.chat.id }}",
        "text": "={{ $json.response }}",
        "additionalFields": {}
      },
      "id": "telegram-send",
      "name": "Telegram (Enviar Resposta)",
      "type": "n8n-nodes-base.telegram",
      "typeVersion": 1,
      "position": [700, 240],
      "credentials": {
        "telegramApi": {
          "id": "3",
          "name": "Telegram Bot API"
        }
      }
    }
  ],
  "connections": {
    "Telegram Trigger": {
      "main": [
        [
          {
            "node": "Ollama Responder",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Ollama Responder": {
      "main": [
        [
          {
            "node": "Telegram (Enviar Resposta)",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": true
}
```

---

## 🔑 FASE 4: CONFIGURAÇÃO DE TOKENS E SEGURANÇA (O QUE É NECESSÁRIO?)

No App do Windows ou pela própria interface Web do Jarvis em `http://192.168.1.15:3000`, navegue até o menu de **Configurações e IoT -> Gerenciador de Tokens**. O sistema usa isso para se autenticar nos serviços. 

**Os tokens estritamente OBRIGATÓRIOS para a comunicação base funcionar são:**

1. **Credenciais da Web UI (WEB_USERNAME e WEB_PASSWORD):**
   * **Por quê?** Sem isso, a API bloqueia acessos de rede e você tomará erro `403 Forbidden` ao acessar do seu Windows ou do seu celular.
   * **O que colocar:** Crie um login seu (ex: `vinicius`) e uma senha. Quando você abrir o JARVIS e for navegar com o Windows, conecte com essas credenciais, que atestarão a segurança na sua rede local!

2. **Personal Access Token do GitHub (GITHUB_TOKEN):**
   * **Por quê?** Necessário para que o Agente do Jarvis seja capaz de ler e commitar arquivos na base privada ou monitorar as "Atividades Recentes". Você gerou este Token no início deste tutorial (o famoso `ghp_...`).
   * **O que colocar:** Cole a sua chave `ghp_...` aqui.

**Tokens Opcionais e para que servem:**
* **TELEGRAM_BOT_TOKEN:** Necessário APENAS se você ativou o "Fluxo 3" (O bot de celular). Obtido com o `@BotFather` no aplicativo do Telegram.
* **HOME_ASSISTANT_TOKEN:** Necessário APENAS se você for conectar painéis ou tomadas inteligentes da sua casa ao cérebro do Jarvis.
* **OPENAI_API_KEY / GROQ_API_KEY:** Necessários APENAS caso você queira substituir temporariamente sua Placa de Vídeo por uma API externa na nuvem super rápida. Mas como o seu ecossistema roda local no `llama3.2` no Ollama, você pode deixá-las em branco por padrão.

---

## 🖥️ FASE BÔNUS (OPCIONAL): INTERFACES GRÁFICAS NO LINUX MINT

Se você quiser ver o "cérebro" evoluindo diretamente no seu servidor Linux e gerenciar contêineres ou conversar com a IA sem depender do seu computador Windows, você pode usar interfaces gráficas (GUIs) nativas disponíveis para o Linux:

### 1. Obsidian (Interface Nativa para o Vault)
Em vez de ler os arquivos de texto `usuario.md` cruamente, você pode instalar o aplicativo oficial do Obsidian no Linux.
1. Abra o **Software Manager (Gerenciador de Aplicativos)** do Linux Mint.
2. Pesquise por **Obsidian** e clique em Instalar (versão Flatpak recomendada).
3. Ao abrir o programa pela primeira vez, escolha **"Open folder as vault"** (Abrir pasta como cofre).
4. Selecione a pasta física `jarvis-vault` localizada na "Home" do seu Linux (ou onde a mapeamos `- ~/jarvis-vault`). Toda a interface gráfica rica com grafos ligando o ecossistema será mostrada de forma idêntica ao Windows!

### 2. Docker e Serviços Internos (Via Próprio JARVIS)
Esqueça a instalação de gerenciadores externos como Portainer ou Docker Desktop! O JARVIS já possui uma interface unificada nativa na sua própria Web UI para visualizar toda a infraestrutura:
1. Abra o navegador e acesse a central do JARVIS no seu Linux: `http://localhost:3000`
2. No menu lateral da Dashboard, vá até a aba **Engines & Containers (Docker)** ou em Configurações.
3. Você verá todos os seus contêineres (`n8n`, `chromadb`, `postgres`, `redis`) com seus status, consumo de memória (RAM/VRAM) e botões para ligar/desligar de forma integrada!

### 3. Ollama (Via Próprio JARVIS)
Não há necessidade de instalar o Open-WebUI ou outro app de terceiros para conversar com o Ollama ou ver os modelos. O JARVIS foi projetado para ser o seu único painel de comunicação:
1. Na própria Web UI do JARVIS `http://localhost:3000`, clique sobre o ícone do microfone ou no painel de Chat.
2. A inteligência artificial já roda de forma transparente com o modelo que você fez o pull no Ollama. Toda a conversa e contexto já estão unificados ali de forma nativa e belíssima, conectada aos seus arquivos! Se precisar gerenciar ou ver o Ollama e os consumos, basta usar a aba de **Painel de Sistemas** na própria central.

---

## 🏆 RECAPITULANDO O USO OPERACIONAL DIÁRIO

1. **Iniciando o sistema:** Ao ligar o notebook Linux Mint, basta rodar `npm run start` na pasta do suite para levantar o backend.
2. **Abra o App no Windows:** Dê dois cliques no ícone do **JARVIS** no Windows. Ele automaticamente lerá o destino do seu arquivo `jarvis-target.txt` e fará a ponte transparente de dados, com microfone e recursos 100% integrados usando seu usuário recém cadastrado de rede.
3. **Mochila e Viagens (Pausa Segura):** Sempre que for levar o notebook para a rua, faculdade ou viagens, clique em **"Pausar JARVIS"** na central ou desligue o notebook normalmente. Os dados estão salvos nas pastas locais e o consumo de energia da RAM e CPU será reduzido a zero para garantir sua autonomia!

**Sua suíte de controle pessoal descentralizada está 100% configurada e automatizada no Linux e no Windows!** 🚀