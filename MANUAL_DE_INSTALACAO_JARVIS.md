# 🧠 Manual Definitivo de Instalação do JARVIS System Suite v5.0

Bem-vindo ao Jarvis! Este sistema foi projetado para atuar como o **cérebro central** da sua vida, automação de aplicativos, finanças, casa inteligente e integração com Inteligência Artificial.

Para garantir performance e não pesar no seu PC Gamer/de Trabalho, o sistema possui uma arquitetura dividida:
* **O Servidor (O Cérebro):** Fica ligado o tempo todo escondido, cuidando do banco de dados, Docker, e a Inteligência Artificial.
* **O PC Pessoal / Desktop (Os Braços):** É o aplicativo `.exe` na sua máquina física, super leve, que obedece ordens para abrir programas (Spotify, Chrome) a partir do microfone.
* **O Celular (O Controle Remoto):** Usado da rua para dar ordens ao servidor que enviará as ordens de volta para casa ou fará buscas e registros na sua agenda.

## 🔑 Passo 0: O Coração do Sistema (Chaves e Tokens)

Antes de rodar as instalações, você precisa de "Chaves Mágicas" (Tokens) para dar permissão de fala, audição e automação para o seu Jarvis. O sistema vai puxar essas chaves de um arquivo chamado `.env`.
Quando você baixar o projeto, verá um arquivo chamado `.env.example`. **Renomeie-o para `.env`**.

Abra esse arquivo no Bloco de Notas ou VSCode. Você verá algumas variáveis para preencher. Veja como obter cada uma delas para que todo o ecossistema funcione:

### 1. A Inteligência (`GROQ_API_KEY`)
O cérebro do LLM (Llama 3) processa áudios e textos ultrarrápido na nuvem da Groq sem derreter seu PC.
*   **Onde pegar:** Entre em `https://console.groq.com/keys`, crie uma conta gratuita e clique em "Create API Key".
*   **Como preencher:** `GROQ_API_KEY="sk_SuaChaveGiganteAqui"`

### 2. Controle de Casa e Lâmpadas (`HOME_ASSISTANT_IP` & `HOME_ASSISTANT_TOKEN`)
Para a IA desligar a TV ou arrumar a luz quando você falar "Modo Cinema".
*   **Onde pegar:** Você já deve ter um Hub do Home Assistant na sua casa (Ex: rodando num Raspberry local). Acesse a interface do seu Home Assistant -> Clique no seu Perfil lá embaixo no canto esquerdo -> Vá até o fim da página em **Long-Lived Access Tokens**. Crie um novo com o nome "Jarvis".
*   **Como preencher:**
    `HOME_ASSISTANT_IP="192.168.0.XX" (coloque o IP real do seu Home Assistant)`
    `HOME_ASSISTANT_TOKEN="SuaChaveGiganteAqui"`

### 3. Login pelo Google Externo (`GOOGLE_CLIENT_ID`)
Se for acessar pelo celular usando o Cloudflare no Passo 4, esta chave impede que estranhos usem seu Jarvis na internet.
*   **Onde pegar:** Acesse o *Google Cloud Console* (`console.cloud.google.com`). Crie um Projeto -> Tela de Permissão OAuth -> Credenciais -> Criar "ID do Cliente Web". Cole as origens permitidas (Seu localhost e seu link do cloudflare). Ele lhe dará um código.
*   **Como preencher:** `GOOGLE_CLIENT_ID="SeuCodigo_googleusercontent.com"`

### 4. Notificações do Servidor no Celular (`TELEGRAM_TOKEN`)
Se quiser ver o n8n ou o servidor enviando prints e relatórios.
*   **Onde pegar:** Abra o Telegram -> Busque pelo usuário oficial `@BotFather` -> Digite `/newbot` -> Siga os passos e ele te dará o "HTTP API Token".
*   **Como preencher:** `TELEGRAM_TOKEN="seu_token_aqui"`

*(Nota: Caminhos de banco de dados do Obsidian já vêm preenchidos de fábrica. Deixe o resto das variáveis como vieram!)*

---

## 🛠️ Passo 1: Configurando o Servidor (A Central)

Você deverá fazer isso na máquina ou notebook encostado que vai ficar ligado sendo o seu Servidor (ou até mesmo na nuvem se contratar uma VPS).

1. Abra a pasta deste repositório onde você baixou os códigos.
2. Clique com o botão direito no arquivo chamado `AutoInstaller.ps1` e selecione **"Executar com o PowerShell"**.
    *(Nota: Se o Windows barrar, abra o PowerShell como Administrador, puxe a pasta com o comando `cd "caminho_da_pasta"` e digite `.\AutoInstaller.ps1`)*.
3. Vai aparecer uma tela hacker pedindo para você escolher o tipo de instalação. **Digite `1` (SERVIDOR CENTRAL)** e aperte Enter.
4. Vá tomar um café! ☕ O instalador fará tudo por você:
    - Instalando o Node.js.
    - Instalando e Ativando as máquinas do seu Banco de Dados (Docker).
    - Criando os seus bancos e conectando fios.
5. Ao final ele dirá que os Contêineres iniciaram através do Docker. **Seu servidor já está vivo e operante na sua rede local!**

---

## 💻 Passo 2: Configurando seu Computador Pessoal

Agora vá para a máquina onde você efetivamente trabalha e usa no dia a dia. Você repetirá o processo de forma super leve:

1. Baixe o código nesta máquina, e novamente mande "Executar com o PowerShell" no arquivo `AutoInstaller.ps1`.
2. Agora, perceba: na tela de escolha, você vai **digitar `2` (CLIENTE PESSOAL/DESKTOP)** e apertar Enter.
3. Aqui **não** será baixado bancos de dados pesados limitando sua máquina. O script apenas empacotará a "Interface Gráfica" pra você.
4. Quando acabar, espie a sua **Área de Trabalho**. Voilá! Haverá um atalho lindinho chamado **JARVIS Desktop**. (E de brinde, ele foi inserido na inicialização do seu PC, o Jarvis vai ligar sozinho quando você ligar a máquina e logar sua conta Windows).
5. **Dê um duplo-clique no atalho da sua área de trabalho!**

### Sincronizando o PC com o Servidor
Na primeira vez que seu aplicativo abrir, se ele não identificar seu Servidor pelo Wifi através do modo "Descoberta Automática Mágica", aparecerá uma tela vermelha escrita **Erro ao Conectar**.
Isso é normal! Haverá uma barra em branco nela. Basta você olhar qual o número (IP) do seu computador-servidor e digitar lá (Ex: `http://192.168.1.15:3000`). Ele salvará isso. Pronto. Os dois computadores estão unidos e casados e o aplicativo da interface futurista vai aparecer pra você.

---

## 📱 Passo 3: Como acessar o JARVIS da Rua pelo celular (Configuração Zero)

Você já pode dar instruções por áudio do seu celular lá da rua para abrir o Spotify no seu PC que ficou em casa, mas qual é o link pra você abrir no navegador 4G/5G?

1. Sente-se fisicamente lá na máquina do seu Servidor Central.
2. Localize e abra o aplicativo chamado **Docker Desktop** (Ele foi instalado na fase 1 sozinho).
3. Dentro do Docker, observe a lista lateral com "Contêineres/Apps". Existirá um contêiner chamado `cloudflare-tunnel`.
4. Dê um clique duplo nele para ler a Aba **"Logs"** (são letras brancas num fundo preto).
5. Desça tudo até o final, lá você vai ler nitidamente algo como:
   👉 `Your quick Tunnel has been created! Visit it at (it may take some time to be reachable): https://raposa-alecrim.trycloudflare.com`
6. Pegue esse link `.trycloudflare.com`, jogue ou mande pelo seu WhatsApp do celular, adicione aos Favoritos e coloque ele na Tela Inicial do aparelho! Ali passa todo HTTPS e você tem segurança gratuita universal instantânea.

---

## 🌐 Passo 4 (Para Experts): Colocando um Link Fixo de Nuvem Permanente

Aquele link `trycloudflare` serve perfeitamente aos propósitos diários. *O único defeito?* Se a energia do seu apartamento cair e o servidor reiniciar bruscamente com o Docker, talvez o link aleatório mude, e você tenha que ir lá no Docker ver qual é o novo no log.

Para amarrar num link oficial fixo que NUNCA MUDE (ex: `https://meu-jarvis-pessoal.com`), sem custo, siga isso:

1. Visite o site: **https://dash.cloudflare.com/sign-up** e crie uma conta gratuita.
2. Na aba colateral da Cloudflare, busque o botão **"Zero Trust"**. Pode entrar nele, os limites grátis cobrem um bilhão de robos caseiros.
3. No painel novo, clique nas maletas laterais chamada **Networks**, e depois na aba secundária **Tunnels**.
4. Crie seu Tunnel, dê o nome de *JarvisTunnel*.
5. Ele vai exibir uma instrução de texto enorme cheia de códigos sob o título "Install and run a connector". **Você só precisa disso aqui:** Encontre uma palavra gigante escondida parecida com isso: `eyJhIjoiOTE0M...` (Isso é o seu **TOKEN**). Copie isso!
6. Agora vá no seu Servidor que criamos, abra no seu Bloco de Notas ou VSCode o arquivo **`docker-compose.yml`**.
7. Encontre o container que nomeamos `cloudflare-tunnel`. Atualmente o comando lá é:
   `command: tunnel --url http://host.docker.internal:3000`
8. Apague a linha desse comando e substitua por:
   **`command: tunnel --no-autoupdate run --token COLOQUE-AQUI-SEU-TOKEN-GIGANTE`**
9. Salve o arquivo! Na mesma pasta do código com o Powershell, rode `docker compose up -d` e ele lerá a mudança.
10. O seu Tunnel no painel do site Cloudflare vai ficar Verde (Online). A partir daí você só clica na aba `Public Hostname`, escolhe um domínio bonito, direciona para `http://host.docker.internal:3000` na malha local, e seu link Fixo será para sempre `meu-jarvis.com` da rua, em ambiente Militar!
