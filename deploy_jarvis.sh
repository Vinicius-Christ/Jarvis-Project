#!/bin/bash

# ==============================================================================
# 🚀 SYSTEM SUITE AUTOMATED LINUX INSTALLER
# ==============================================================================
# Designed specifically for Linux Mint (and Ubuntu-based distributions)
# Set up Docker Engine, Nvidia Drivers, Ollama, NodeJS v20 & JARVIS backend 
# ==============================================================================

# Cores do terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Mensagem de tempo
log_status() {
    echo -e "🐳 [$(date +'%H:%M:%S')] ${CYAN}$1${NC}"
}
log_success() {
    echo -e "🐳 [$(date +'%H:%M:%S')] ${GREEN}$1${NC}"
}
log_warning() {
    echo -e "🐳 [$(date +'%H:%M:%S')] ${YELLOW}$1${NC}"
}
log_error() {
    echo -e "🐳 [$(date +'%H:%M:%S')] ${RED}$1${NC}"
}

clear
echo -e "${CYAN}======================================================================${NC}"
echo -e "        ${GREEN}JARVIS CORE SUITE - INSTALADOR AUTOMATIZADO LINUX MINT${NC}"
echo -e "${CYAN}======================================================================${NC}"
echo -e "Este script irá configurar o seu notebook servidor totalmente do zero."
echo -e "Serão instalados: Docker, Node.js v20, Ollama, Modelos IA e o Servidor."
echo -e "${CYAN}======================================================================${NC}"
echo ""

# Verificar se está rodando como ROOT/SUDO
if [ "$EUID" -ne 0 ]; then
  log_error "Por favor, execute o script utilizando sudo:"
  echo -e "👉 ${YELLOW}sudo ./deploy_jarvis.sh${NC}"
  echo ""
  exit 1
fi

# Obter o usuário real por trás do sudo
REAL_USER=$SUDO_USER
if [ -z "$REAL_USER" ]; then
    REAL_USER=$(whoami)
fi

# ============================================
# 1. VERIFICAR CONEXÃO DE REDE
# ============================================
log_status "Verificando conexão à Internet..."
if ping -q -c 1 -W 5 8.8.8.8 >/dev/null; then
    log_success "Conexão com a Internet detectada com sucesso!"
else
    log_error "Sem conexão com a internet! Verifique seus cabos ou Wi-Fi e re-execute."
    exit 1
fi

# ============================================
# 2. INSTALAR DEPENDÊNCIAS BASE
# ============================================
log_status "Instalando compiladores, wget, curl e ferramentas do sistema..."
apt-get update -y
apt-get install -y curl wget git build-essential htop software-properties-common ca-certificates gnupg lsb-release jq

# ============================================
# 3. INSTALAÇÃO AUTOMÁTICA DO DOCKER & COMPOSE
# ============================================
log_status "Validando presença da plataforma Docker..."
if ! command -v docker &> /dev/null; then
    log_warning "Docker não localizado. Instalando motor oficial robusto..."
    curl -fsSL https://get.docker.com | sh
    log_success "Docker Engine instalado com sucesso!"
else
    log_success "Docker já está instalado no sistema: $(docker --version)"
fi

# Habilitar e iniciar Docker
systemctl enable docker
systemctl start docker

# Instalar docker-compose-plugin se não estiver presente
if ! docker compose version &> /dev/null; then
    log_status "Instalando plugin do Docker Compose..."
    apt-get install -y docker-compose-plugin
fi
log_success "Docker Compose validado em: $(docker compose version)"

# Adicionar usuário ao grupo Docker
log_status "Configurando permissões do usuário '$REAL_USER' no grupo Docker..."
usermod -aG docker $REAL_USER

# ============================================
# 4. CONFIGURAR ACELERAÇÃO NVIDIA (Se houver GPU)
# ============================================
log_status "Verificando presença de Placa de Vídeo NVIDIA no Servidor..."
if lspci | grep -i nvidia &> /dev/null || command -v nvidia-smi &> /dev/null; then
    log_success "GPU NVIDIA detectada! Instalando NVIDIA Container Toolkit..."
    
    # Configure repositório
    curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor --yes -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
    curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
      sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
      tee /etc/apt/sources.list.d/nvidia-container-toolkit.list > /dev/null
      
    apt-get update
    apt-get install -y nvidia-container-toolkit
    
    # Configurar runtime
    nvidia-ctk runtime configure --runtime=docker
    systemctl restart docker
    log_success "NVIDIA Container Toolkit ativado com sucesso!"
else
    log_warning "Nenhuma placa gráfica NVIDIA dedicada detectada. Rodando em modo CPU."
fi

# ============================================
# 5. INSTALAR OLLAMA E EXPÔ-LO NA REDE
# ============================================
log_status "Preparando Motor de Inteligência Artificial Local (Ollama)..."
if ! command -v ollama &> /dev/null; then
    log_warning "Ollama não localizado. Instalando nativamente via script oficial..."
    curl -fsSL https://ollama.com/install.sh | sh
else
    log_success "Ollama já instalado."
fi

log_status "Expondo a porta do Ollama na rede para controle remoto (JARVIS-Client)..."
# Criar override do systemd de forma automatizada
mkdir -p /etc/systemd/system/ollama.service.d
cat <<EOF > /etc/systemd/system/ollama.service.d/override.conf
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
EOF

# Aplicar mudanças do systemd e reatar Ollama
systemctl daemon-reload
systemctl restart ollama
log_success "Ollama configurado de forma soberana para ouvir em todo o Wi-Fi doméstico na porta 11434!"

# ============================================
# 6. BAIXAR OS MODELOS DA IA
# ============================================
log_status "Puxando modelo lógico llama3.2 (Aguarde o download)..."
ollama pull llama3.2
log_status "Puxando modelo de embeddings nomic-embed-text..."
ollama pull nomic-embed-text
log_success "Modelos de IA sincronizados na máquina servidor!"

# ============================================
# 7. INSTALAR NODEJS v20 OFICIAL
# ============================================
log_status "Validando NodeJS..."
if ! command -v node &> /dev/null || [[ "$(node -v)" != v20* ]]; then
    log_warning "Node.js incorreto ou não localizado. Instalando Node v20 oficial..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    log_success "Node.js validado: $(node -v)"
fi

# ============================================
# 8. PREPARAR ESTADOS DE VAULT E DIRETÓRIOS
# ============================================
log_status "Semeando as pastas físicas do Obsidian Vault e Logs..."
# Executa como usuário padrão para as pastas não ficarem com permissão exclusiva de ROOT
sudo -u $REAL_USER mkdir -p data logs jarvis-vault
sudo -u $REAL_USER mkdir -p jarvis-vault/perfil jarvis-vault/agenda jarvis-vault/financas jarvis-vault/casa jarvis-vault/conversas jarvis-vault/aprendizados

if [ ! -f "jarvis-vault/perfil/usuario.md" ]; then
cat <<EOF > "jarvis-vault/perfil/usuario.md"
# Perfil do Usuário

Nome: Master
Tom preferido: Inteligente, refinado, estilo JARVIS
Resumo: Inicializado pelo instalador JARVIS System Suite v5.0
EOF
chown $REAL_USER:$REAL_USER "jarvis-vault/perfil/usuario.md"
fi
log_success "Pastas locais criadas e inicializadas!"

# ============================================
# 9. INSTALAR DEPENDÊNCIAS DO NODE E SUBIR BANCO
# ============================================
log_status "Instalando pacotes npm do backend..."
sudo -u $REAL_USER npm install

log_status "Compilando front-end do JARVIS..."
sudo -u $REAL_USER npm run build

log_status "Sincronizando e subindo containers do Docker (Postgres, n8n, etc)..."
# Executa como root para garantir permissões totais no soquete durante a instalação
docker compose down || true
docker rm -f jarvis_chromadb jarvis_n8n jarvis_homeassistant jarvis_postgres jarvis_redis 2>/dev/null || true
docker compose up -d

# Garante que todo o diretório pertence ao usuário real
chown -R $REAL_USER:$REAL_USER .

# Obter IP local real do servidor
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${GREEN}======================================================================${NC}"
echo -e "        ${GREEN}✨ CONFIGURAÇÃO DOS SERVIÇOS DO NOTEBOOK FINALIZADA! ✨${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo -e "Seu Servidor central já está ativo na sua rede."
echo -e "Ele ficará escutando nas seguintes direções locais da casa:"
echo ""
echo -e "🤖 ${YELLOW}IP DO SEU NOTEBOOK SERVIDOR LINUX:${NC} ${GREEN}${LOCAL_IP}${NC}"
echo -e "🌐 ${CYAN}Painel JARVIS Web / API:${NC}  http://${LOCAL_IP}:3000"
echo -e "🧩 ${CYAN}Orquestrador n8n Master:${NC} http://${LOCAL_IP}:5678"
echo -e "🧠 ${CYAN}Motor IA Ollama Aberto:${NC}  http://${LOCAL_IP}:11434"
echo -e "📂 ${CYAN}Banco ChromaDB Inspetor:${NC} http://${LOCAL_IP}:8000"
echo -e "🏠 ${CYAN}Home Assistant Nativo:${NC}   http://${LOCAL_IP}:8123"
echo -e "======================================================================"
echo -e "${YELLOW}DICA DE INICIALIZAÇÃO:${NC}"
echo -e "Para iniciar o backend do seu servidor, acesse a pasta e digite:"
echo -e "👉 ${GREEN}npm run start${NC}"
echo -e "======================================================================"
echo ""
