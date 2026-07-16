# 🧠 Manual Definitivo de Instalação do JARVIS System Suite v6.0

O sistema possui uma **Arquitetura Dividida Híbrida**. Para não derreter e fritar a memória do seu Computador de Trabalho ou Notebook Gamer pesando bancos de Inteligência Artificial, temos papéis explícitos:

* **O Servidor Central (O Cérebro):** Uma máquina em casa ligada contínuamente que roda silenciosa, processando bancos SQLite do Prisma, o motor Python Auto-Optimizador e orquestrando o tráfego da API LLM.
* **O Desktop / PC Pessoal (Os Braços Visíveis):** Apenas uma interface visual transparente e elegante (Overlay Flutuante), com um peso absurdo de mínimo de RAM baseada em Rust (Tauri Application), que apenas conversa com o Cérebro.
* **O Web Celular Remoto:** (Opcional, veja Passo 3)

## 🔑 Passo 0: O Mínimo Necessário
Antes de rodar qualquer código mágico, insira na raiz a Alma do sistema baixando da Groq Cloud:
1. Renomeie o arquivo `.env.example` para `.env`.
2. Consagre a variável `GROQ_API_KEY=sk_Insira_Aqui_A_Sua_Chave` com um token ativo tirado do dashboard console.groq.com.

---

## 🛠️ Passo 1: Construindo A Base Operacional (Instaladores)

### Fase A - A Máquina "Servidor"
Acesse ou logue fisicamente a máquina que vai abrigar o núcleo fixo (pode ser o mesmo PC caso não tenha duas máquinas).
Abra o arquivo de instalador respectivo para ela:
- Lado Windows: `.\install.ps1`
- Lado Linux/Mac: `./install.sh`

Na janela de menu que popará no prompt de comando: **Selecione `[1] MODO SERVIDOR`**!
Vá tomar um café! O instalador isolará as DLLs Python Num Sandbox (`.venv`), compilará totalmente os Bancos SQLite, criará uma pasta física imutável no seu disco `C:\jarvis-vault` (memória base do Obsidian) estruturando 100% da parte pesada.

Para dar luz e deixar a Inteligência acordada em background para o Evals Analítico atuar e rodar as tarefas pendentes, dê dois cliques ou rode permanentemente no terminal dele: 
`python jarvis_engine/main.py --mode daemon` (No Windows, lembre de ter rodado `.\.venv\Scripts\Activate.ps1` primeiro).

---

### Fase B - O PC Gamer/Desktop Visual
No computador da sua área de trabalho diária de uso, abra a pasta dos códigos e rode O MESMO arquivo.
Porém, no Menu Incial, **Selecione `[2] MODO CLIENTE PESSOAL (DESKTOP)`**.

Assim, bancos pesados não sujarão o seu Windows de trabalho principal. O sistema atestará sua arquitetura Rust e NPM (Frontend) puros.
- Para Iniciar a Máscara da UI Flutuante, rode: `npm run tauri dev`. Aparecerá a janela limpa.
> **🚨 Atenção da Integração:** Na sua interface visual (Seja por navegador `localhost:3000` via build ou janela Tauri), vá nas engrenagens (Configurações do Sistema). Existirá opções pro IP. Coloque o Endereço IP Físico da Máquina Servidora lá, ou deixe genérico se for tudo na mesma máquina.

---

## 🌎 Passo 3: Controle e Acesso Externo Remoto Totalizado 4G (Obrigatório pra Rua)
E se o Jarvis roda fechado na malha de casa e você está no trânsito querendo enviar áudios e anotar gastos nele?
Instalamos uma Ponte de Aço via Cloudflare de forma **segura e grátis**, exponenciando a rota 3000 do app Node Server pra um domínio seguro HTTPS. (Instrução ultra mastigada):

1. Vá fisicamente na Máquina Base (Servidor).
2. Entre em `https://dash.cloudflare.com/sign-up` - Crie uma conta gratuita.
3. No painel de navegação à esquerda da Cloudflare, busque pelo ícone amarelo das engrenagens **Zero Trust / Networks -> Tunnels**.
4. Siga clicando em "Create a Tunnel", selecione "Cloudflared" -> Nomeie de "Jarvis_Tether_Movel".
5. Uma janela monstruosa irá se abrir com linhas de comando para instanciar (Choose environment). Selecione `Windows` (ou a máquina alvo).
6. Ele exibirá pra você um código nativo CMD, ex: `cloudflared.exe service install eyJh...[GIGANTE]`. Copie exatamente esse comando monstruoso completo!
7. Abra os Powershells/Terminals **como Admin** no computador Servidor, cole esse comando puro e aperte enter. O serviço `cloudflared` começará a correr anonimamente como Serviço Interno do Windows.
8. No final, retorne ao Browser no painel das rotas e confirme `Public Hostnames`.
9. Registre seu DNS legal (ex `jarvis-seunome.com.br`) e redirecione via Service: `HTTP` Url: `localhost:3000`.

**Pronto!** Vá pro seu celular Apple ou Android, digite o link que você configurou acima. Faça o Login. A tela web renderizará universalmente segura o UI do Jarvis com voz e acesso irrestrito aos módulos residindo seguro no seu HD sem necessidade de abrir senhas cruas de Roteador NAT da operadora. Tudo seguro através da DMZ Zero Trust da Cloudflare.
