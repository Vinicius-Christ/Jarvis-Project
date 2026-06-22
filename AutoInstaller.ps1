# AutoInstaller.ps1
# JARVIS System Suite - Instalador Automático para Windows (Dual Mode)

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
# 1. ESCOLHA DE MODO DE INSTALAÇÃO
# ============================================
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " TIPO DE INSTALAÇÃO JARVIS SYSTEM SUITE" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "[1] SERVIDOR CENTRAL" -ForegroundColor Yellow
Write-Host "    (Instala Bancos de Dados Docker, Prisma, Ambiente Node p/ Orquestração de Rede)" -ForegroundColor Gray
Write-Host "[2] CLIENTE PESSOAL / DESKTOP" -ForegroundColor Yellow
Write-Host "    (Interface Gráfica de Usuário, Comandos Nativos de S.O., Spotify, Web Search)" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

$InstallMode = ""
while ($InstallMode -notmatch "^[12]$") {
    $InstallMode = Read-Host "Digite 1 ou 2 para escolher o modo"
}

$IsServerMode = $InstallMode -eq "1"
if ($IsServerMode) {
    Write-Status "🛠️  Modo Selecionado: SERVIDOR CENTRAL" $WarningColor
} else {
    Write-Status "🖥️  Modo Selecionado: CLIENTE PESSOAL / DESKTOP" $SuccessColor
}

# ============================================
# 2. VALIDAR INTERNET E NODE.JS
# ============================================
Write-Status "Verificando conexão com internet..." $InfoColor
try {
    $testConnection = Test-NetConnection -ComputerName 8.8.8.8 -ErrorAction Stop
    if ($testConnection.PingSucceeded) {
        Write-Status "✅ Conexão OK" $SuccessColor
    }
} catch {
    Write-Status "❌ Sem conexão com internet!" $ErrorColor
    exit 1
}

Write-Status "Validando Node.js..." $InfoColor
$nodeVersion = node -v 2>$null
if ($null -eq $nodeVersion) {
    Write-Status "⚠️  Node.js não encontrado! Baixando..." $WarningColor
    winget install OpenJS.NodeJS -e --silent
    $nodeVersion = node -v
}
Write-Status "✅ Node.js: $nodeVersion" $SuccessColor

# ============================================
# 3. DOCKER & WSL2 (APENAS MODO SERVIDOR)
# ============================================
if ($IsServerMode) {
    Write-Status "Ativando WSL2..." $InfoColor
    dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart | Out-Null
    dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart | Out-Null

    Write-Status "Validando Docker Desktop..." $InfoColor
    $dockerVersion = docker --version 2>$null
    if ($null -eq $dockerVersion) {
        Write-Status "⚠️  Instalando Docker Desktop..." $WarningColor
        winget install Docker.DockerDesktop -e --silent --accept-package-agreements --accept-source-agreements
        Write-Status "⏳ Docker instalando... Aguarde." $WarningColor
    } else {
        Write-Status "✅ Docker: $dockerVersion" $SuccessColor
    }
}

# ============================================
# 4. DEPENDÊNCIAS GERAIS E OBSIDIAN
# ============================================
Write-Status "Baixando Obsidian..." $InfoColor
winget install Obsidian.Obsidian --silent --accept-package-agreements | Out-Null

Write-Status "Instalando dependências NPM..." $InfoColor
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Status "❌ Erro nas dependências NPM!" $ErrorColor
    exit 1
}

# ============================================
# 5. CONFIGURAÇÕES ESPECÍFICAS (DB vs DESKTOP)
# ============================================
if ($IsServerMode) {
    Write-Status "Configurando Banco de Dados Prisma..." $InfoColor
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
    }
    npx prisma generate
    npx prisma db push

    Write-Status "Criando diretórios Vault base..." $InfoColor
    @('data', 'logs', 'C:\jarvis-vault') | ForEach-Object { if (-not (Test-Path $_)) { New-Item -ItemType Directory -Path $_ | Out-Null } }
    $dirs = @("C:\jarvis-vault\perfil", "C:\jarvis-vault\agenda", "C:\jarvis-vault\financas", "C:\jarvis-vault\casa", "C:\jarvis-vault\conversas", "C:\jarvis-vault\aprendizados")
    foreach ($dir in $dirs) { if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null } }

    $profileContent = @"
# Perfil do Usuário
Nome: Master
Tom preferido: Inteligente, refinado, estilo JARVIS
Resumo: Inicializado pelo instalador JARVIS System Suite v5.0
"@
    Set-Content -Path "C:\jarvis-vault\perfil\usuario.md" -Value $profileContent
    Write-Status "✅ Vault semeado" $SuccessColor

    Write-Status "Compilando Backend..." $InfoColor
    npm run build:server
    
    Write-Status "Iniciando Infraestrutura de Servidor via Docker..." $InfoColor
    docker compose up -d

} else {
    # MODO CLIENTE DESKTOP
    Write-Status "Compilando App Desktop React (Vite)..." $InfoColor
    npm run build

    Write-Status "Criando atalhos nativos na Área de Trabalho..." $InfoColor
    $WshShell = New-Object -comObject WScript.Shell
    
    # 1. Atalho no Desktop
    $DesktopPath = [Environment]::GetFolderPath("Desktop")
    $ShortcutPath = Join-Path -Path $DesktopPath -ChildPath "JARVIS Desktop.lnk"
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    
    $CurrentDir = Get-Location
    # Executa silenciosamente no background via um command trick
    $Shortcut.TargetPath = "powershell.exe"
    $Shortcut.Arguments = "-WindowStyle Hidden -Command `"Set-Location '$CurrentDir'; npm run desktop`""
    $Shortcut.IconLocation = "$CurrentDir\dist\favicon.ico"
    if (-not (Test-Path "$CurrentDir\dist\favicon.ico")) {
        $Shortcut.IconLocation = "$CurrentDir\assets\icon.ico"
    }
    $Shortcut.WorkingDirectory = "$CurrentDir"
    $Shortcut.Save()
    Write-Status "✅ Atalho 'JARVIS Desktop' criado com sucesso!" $SuccessColor

    # 2. Auto-Startup (Opcional, mas recomendado para o Desktop Client)
    $StartMenuPath = [Environment]::GetFolderPath("Startup")
    $AutoStartPath = Join-Path -Path $StartMenuPath -ChildPath "JARVIS AutoStart.lnk"
    $AutoShortcut = $WshShell.CreateShortcut($AutoStartPath)
    $AutoShortcut.TargetPath = "powershell.exe"
    $AutoShortcut.Arguments = "-WindowStyle Hidden -Command `"Set-Location '$CurrentDir'; npm run desktop`""
    $AutoShortcut.WorkingDirectory = "$CurrentDir"
    $AutoShortcut.Save()
    Write-Status "✅ Auto-Inicialização junto com o Windows configurada!" $SuccessColor
}

Write-Status "`n✨ INSTALAÇÃO DO JARVIS (MODO: $(if ($IsServerMode) {'SERVIDOR'} else {'CLIENTE'})) CONCLUÍDA!" $SuccessColor
Write-Host @"
╔═══════════════════════════════════════════════════════════╗
║             JARVIS SYSTEM SUITE - PRONTO PARA USO         ║
╚═══════════════════════════════════════════════════════════╝
"@
if ($IsServerMode) {
    Write-Status "NOTA: Se o Docker ou WSL2 acabaram de ser instalados, o Servidor requer REINICIALIZAÇÃO." $WarningColor
} else {
    Write-Status "NOTA: Acesse o ícone do JARVIS gerado em sua Área de Trabalho para Iniciar o UI." $InfoColor
}
Read-Host -Prompt "Pressione Enter para fechar..."
