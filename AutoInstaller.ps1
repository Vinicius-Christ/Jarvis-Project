# AutoInstaller.ps1
# JARVIS System Suite - Instalador Automático para Windows

param(
    [string]$Version = "latest"
)

# Cores para output
$ErrorColor = 'Red'
$SuccessColor = 'Green'
$WarningColor = 'Yellow'
$InfoColor = 'Cyan'

function Write-Status {
    param([string]$Message, [string]$Color = 'White')
    Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] $Message" -ForegroundColor $Color
}

# Verificar Admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Status "❌ Este script requer permissões de Administrator!" $ErrorColor
    Write-Status "Por favor, execute novamente como Administrator no PowerShell" $ErrorColor
    exit 1
}

Write-Status "🚀 Iniciando instalação do JARVIS v$Version" $InfoColor

# ============================================
# 1. VALIDAR INTERNET
# ============================================
Write-Status "Verificando conexão com internet..." $InfoColor
try {
    $testConnection = Test-NetConnection -ComputerName 8.8.8.8 -ErrorAction Stop
    if ($testConnection.PingSucceeded) {
        Write-Status "✅ Conexão de internet: OK" $SuccessColor
    }
} catch {
    Write-Status "❌ Sem conexão com internet! Verifique sua rede e tente novamente." $ErrorColor
    exit 1
}

# ============================================
# 2. VALIDAR NODE.JS
# ============================================
Write-Status "Validando Node.js..." $InfoColor
$nodeVersion = node -v 2>$null
if ($null -eq $nodeVersion) {
    Write-Status "❌ Node.js não encontrado! Baixando base..." $WarningColor
    winget install OpenJS.NodeJS -e --silent
    $nodeVersion = node -v
}
Write-Status "✅ Node.js: $nodeVersion" $SuccessColor

# ============================================
# 3. VALIDAR DOCKER DESKTOP E WSL2
# ============================================
Write-Status "Ativando Recursos Opcionais do Windows (WSL2)..." $InfoColor
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart | Out-Null
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart | Out-Null

Write-Status "Validando Docker Desktop..." $InfoColor
$dockerVersion = docker --version 2>$null
if ($null -eq $dockerVersion) {
    Write-Status "⚠️  Docker não instalado. Instalando Docker Desktop..." $WarningColor
    winget install Docker.DockerDesktop -e --silent --accept-package-agreements --accept-source-agreements
    Write-Status "⏳ Docker instalando... Por favor aguarde o término." $WarningColor
} else {
    Write-Status "✅ Docker: $dockerVersion" $SuccessColor
}

# ============================================
# 4. INSTALAR DEPENDÊNCIAS NODE E WINGET
# ============================================
Write-Status "Baixando Obsidian e Ollama..." $InfoColor
winget install Obsidian.Obsidian --silent --accept-package-agreements | Out-Null
winget install Ollama.Ollama --silent --accept-package-agreements | Out-Null

Write-Status "Instalando dependências Node.js..." $InfoColor
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Status "❌ Erro ao instalar dependências NPM!" $ErrorColor
    exit 1
}
Write-Status "✅ Dependências instaladas" $SuccessColor

# ============================================
# 5. CRIAR DIRETÓRIOS DO VAULT
# ============================================
Write-Status "Criando diretórios base e Obsidian Vault..." $InfoColor
@('data', 'logs', 'jarvis-vault') | ForEach-Object {
    if (-not (Test-Path $_)) {
        New-Item -ItemType Directory -Path $_ | Out-Null
    }
}
$dirs = @("jarvis-vault\perfil", "jarvis-vault\agenda", "jarvis-vault\financas", "jarvis-vault\casa", "jarvis-vault\conversas", "jarvis-vault\aprendizados")
foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
}

$profileContent = @"
# Perfil do Usuário

Nome: Master
Tom preferido: Inteligente, refinado, estilo JARVIS
Resumo: Inicializado pelo instalador JARVIS System Suite v5.0
"@
Set-Content -Path "jarvis-vault\perfil\usuario.md" -Value $profileContent

Write-Status "✅ Obsidian Vault criado e semeado" $SuccessColor

# ============================================
# 6. INICIAR OLLAMA E OBTER MODELOS
# ============================================
Write-Status "Iniciando Ollama em background..." $InfoColor
Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
Start-Sleep -Seconds 5
Write-Status "Puxando modelo llama3.2..." $InfoColor
ollama pull llama3.2 | Out-Null
Write-Status "Puxando modelo nomic-embed-text..." $InfoColor
ollama pull nomic-embed-text | Out-Null

# ============================================
# 7. BUILD E DOCKER
# ============================================
Write-Status "Compilando projeto..." $InfoColor
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Status "❌ Erro ao compilar com Vite!" $ErrorColor
    exit 1
}
Write-Status "✅ Projeto compilado com sucesso" $SuccessColor

Write-Status "Iniciando containers do Docker (pode demorar alguns minutos)..." $InfoColor
docker compose up -d

Write-Status "`n✨ INSTALAÇÃO DO MÓDULO LOCAL CONCLUÍDA!" $SuccessColor
Write-Host @"
╔═══════════════════════════════════════════════════════════╗
║             JARVIS SYSTEM SUITE - PRONTO PARA USO         ║
╚═══════════════════════════════════════════════════════════╝
"@
Write-Status "Por favor, reinicie a máquina se o WSL2 acabou de ser instalado." $WarningColor
Read-Host -Prompt "Pressione Enter para fechar..."
