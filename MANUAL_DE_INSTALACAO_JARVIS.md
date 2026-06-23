# 🧠 Manual Definitivo de Instalação do JARVIS System Suite v5.0

Bem-vindo ao Jarvis! Este sistema foi projetado para atuar como o **cérebro central** da sua vida, automação de aplicativos, finanças, casa inteligente e integração com Inteligência Artificial.

Para garantir performance e não pesar no seu PC Gamer/de Trabalho, o sistema possui uma arquitetura dividida:
* **O Servidor (O Cérebro):** Fica ligado o tempo todo escondido, cuidando do banco de dados, Docker, e a Inteligência Artificial.
* **O PC Pessoal / Desktop (Os Braços):** É o aplicativo `.exe` na sua máquina física, super leve, que obedece ordens para abrir programas (Spotify, Chrome) a partir do microfone.
* **O Celular (O Controle Remoto):** Usado da rua para dar ordens ao servidor que enviará as ordens de volta para casa ou fará buscas e registros na sua agenda.

## 🔑 Passo 0: O Coração do Sistema (Chaves e Tokens)

Antes de rodar as instalações ou para ativar 100% dos poderes do Jarvis, você precisa das "Chaves Mágicas" (Tokens). Algumas chaves vão direto no código (para o cérebro rodar), e outras podem ser coladas lindamente na Interface Gráfica do seu Jarvis depois de instalado.

### 💻 Chaves Preenchidas no Código Fonte (Arquivo `.env`)
Quando você baixar o projeto da pasta, verá um arquivo chamado `.env.example`. **Renomeie-o para `.env`** e abra no Bloco de Notas ou VSCode. Preencha lá dentro:

1. **A Inteligência (`GROQ_API_KEY`)**
   * **Para que serve:** O cérebro do Llama 3 processa áudios e raciocínios e responde. Sem isso, o Jarvis é um robô cego e mudo.
   * **Onde gerar:** Crie uma conta no `console.groq.com/keys` e clique em "Create API Key".
   * **Onde colar:** No arquivo `.env`, na linha `GROQ_API_KEY="sk_SuaChaveGiganteAqui"`.

2. **O IP do Controle de Casa (`HOME_ASSISTANT_IP`)**
   * **Para que serve:** Permite encontrar a sua automação residencial local.
   * **Onde gerar:** Olhe nas configurações de rede da sua casa onde seu Home Assistant/RaspberryPi roda.
   * **Onde colar:** No arquivo `.env`, na linha `HOME_ASSISTANT_IP="192.168.0.XX"`.

*(Caminhos de banco de dados e do Obsidian já vêm preenchidos de fábrica. Deixe o resto das variáveis de infraestrutura intocadas!)*

---

### 🖥️ Chaves Preenchidas dentro da Interface Automática do JARVIS
As chaves abaixo não precisam de arquivo e podem ser preenchidas a qualquer momento depois do sistema já rodando!
Para encontrar elas:
1. Abra o seu **painel principal do Jarvis** pelo navegador ou app.
2. Na barra do menu, clique no símbolo de **Engrenagem** `⚙️ Configurações do Sistema`.
3. No painel que abrir, procure o menu lateral e clique exatamente na aba **`🔐 Senhas & Tokens`**.

Lá dentro haverão campos específicos para preencher com tranquilidade:

1. **Home Assistant Token (Long-Lived Access Token)**
   * **Para que serve:** Autoriza a IA a desligar a sua TV ou apagar a lâmpada via rede.
   * **Onde gerar:** Na interface da sua casa (Home Assistant), clique no seu Perfil (canto inferio esquerdo) > desça até "Long-Lived Access Tokens". Crie um chamado "Jarvis".
   * **Onde colar:** No campo brilhante *Home Assistant Token* da UI do Jarvis.

2. **Google OAuth Client ID**
   * **Para que serve:** Coloca uma tela de Login e blindagem extra para estranhos não acessarem seu IP Cloudflare.
   * **Onde gerar:** Acesse o `console.cloud.google.com`. Vá em Credenciais -> Criar "ID do Cliente Web". Configure autorizando o URL do seu Cloudflare e copie o seu ID.
   * **Onde colar:** No campo *Google OAuth Client ID* da UI do Jarvis.

3. **Notificações por Telegram (`TELEGRAM_TOKEN`)**
   * **Para que serve:** Faz seu JARVIS se comunicar pelo Telegram (relatórios, prints da sua tela).
   * **Onde gerar:** Abra o app seu celular do Telegram -> Busque pela conta certinha `@BotFather` -> Digite `/newbot` -> De o nome -> Copie o Token Gigante "HTTP API".
   * **Onde colar:** No campo *Telegram Bot Token* da UI do Jarvis.

4. **GitHub Auth Token**
   * **Para que serve:** Essencial para o Auto-Updater checar código-fonte do Sistema Operacional JARVIS e injetar atualizações automáticas via rede.
   * **Onde gerar:** Entre na conta do Github -> Settings -> Developer Settings -> Personal access tokens.
   * **Onde colar:** No campo *GitHub Auth Token* da UI.

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
