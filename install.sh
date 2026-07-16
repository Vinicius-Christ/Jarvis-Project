#!/bin/bash
echo "=========================================================="
echo " JARVIS V6.0 - SELEÇÃO DE ARQUITETURA DA MÁQUINA (LINUX/MAC)"
echo "=========================================================="
echo "[1] MODO SERVIDOR CENTRAL"
echo "    (Roda silencioso. Instala Cérebro Python, Sandbox .venv, Prisma SQLite e Pastas Root do Vault)."
echo "[2] MODO CLIENTE PESSOAL (APP DESKTOP)"
echo "    (Instala Rust e dependências restritas do Tauri App pra focar na parte visual do controle remoto)."
echo "=========================================================="

read -p "Selecione a versão (1 ou 2) e dê Enter: " mode

if [ -d ".git" ]; then echo "[OK] Validado caminho."; else git clone https://github.com/Vinicius-Christ/Jarvis-Project.git && cd Jarvis-Project || exit; fi

if [ "$mode" == "1" ]; then
    echo ">> CONFIGURANDO SERVIDOR PYTHON / NODE <<"
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    
    npm install
    
    if [ ! -f ".env" ]; then cp .env.example .env 2>/dev/null || true; fi
    npx prisma generate
    npx prisma db push
    
    mkdir -p data logs ~/jarvis-vault
    mkdir -p ~/jarvis-vault/perfil ~/jarvis-vault/agenda ~/jarvis-vault/financas ~/jarvis-vault/casa ~/jarvis-vault/conversas ~/jarvis-vault/aprendizados
    echo -e "# Perfil do Usuário\nNome: Master\nTom: Cínico, refinado\n" > ~/jarvis-vault/perfil/usuario.md
    
    echo "========================================="
    echo " SERVIDOR PRONTO E ARMADO LOCALMENTE!"
    echo " Para inciar as IAs de pensamento: source .venv/bin/activate && python jarvis_engine/main.py --mode daemon"

elif [ "$mode" == "2" ]; then
    echo ">> CONFIGURANDO INTERFACE CLIENTE TAURI <<"
    if ! command -v rustc &> /dev/null; then echo "[AVISO CRÍTICO] Rust/Cargo não encontrado. Instale com: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"; fi
    
    npm install
    
    echo "========================================="
    echo " ÁREA DE TRABALHO FRONTEND COMPILÁVEL!"
    echo " Para puxar pela RAM nativa a UI flutuante digite: npm run tauri dev"
else
    echo "Opção inválida, abortando."
    exit 1
fi
