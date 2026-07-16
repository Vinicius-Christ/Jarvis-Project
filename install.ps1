# JARVIS AutoInstaller Windows Universal (Dual Mode)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " JARVIS V6.0 - SELEÇÃO DE ARQUITETURA DA MÁQUINA" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "[1] MODO SERVIDOR (O CÉREBRO PRINCIPAL)" -ForegroundColor Yellow
Write-Host "    (Instala Python .venv, RAG Local, Banco Prisma SQLite, Cria Pastas do Vault, Roda Daemon 24/7)" -ForegroundColor Gray
Write-Host "[2] MODO DESKTOP / PC PESSOAL (A SUPERFÍCIE)" -ForegroundColor Yellow
Write-Host "    (Instala Rust, Compila apenas Interface Visual Tauri pra se conectar via IP, sem bancos pesados locais)" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

$InstallMode = ""
while ($InstallMode -notmatch "^[12]$") {
    $InstallMode = Read-Host "Digite 1 ou 2 para confirmar"
}
$IsServer = ($InstallMode -eq "1")

if ($IsServer) {
    Write-Host "`n>> MODO SERVIDOR SELECIONADO <<" -ForegroundColor Green
    Write-Host "[...] Instalando Node.js via Winget"
    if (-not (node -v 2>$null)) { winget install OpenJS.NodeJS -e --silent }
    Write-Host "[...] Instalando Python 3.11 via Winget"
    if (-not (python --version 2>$null)) { winget install Python.Python.3.11 -e --silent }

    Write-Host "[...] Criando Sandbox Local (.venv) e Instalando Requirements"
    if (-not (Test-Path ".venv")) { python -m venv .venv }
    & .venv\Scripts\Activate.ps1
    pip install -r requirements.txt

    Write-Host "[...] Instalando Pacotes Base NPM"
    npm install

    Write-Host "[...] Isolando Cofre de Memória JARVIS e Bancos SQLite"
    if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" -ErrorAction SilentlyContinue }
    npx prisma generate
    npx prisma db push

    @('data', 'logs', 'C:\jarvis-vault') | ForEach-Object { if (-not (Test-Path $_)) { New-Item -ItemType Directory -Force -Path $_ | Out-Null } }
    $dirs = @("C:\jarvis-vault\perfil", "C:\jarvis-vault\agenda", "C:\jarvis-vault\financas", "C:\jarvis-vault\casa", "C:\jarvis-vault\conversas", "C:\jarvis-vault\aprendizados")
    foreach ($dir in $dirs) { if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null } }
    
    $profileContent = "# Perfil do Usuário`nNome: Master`nTom preferido: Inteligente, estilo JARVIS`nResumo: Inicializado pelo instalador JARVIS System Suite v6.0 Server."
    Set-Content -Path "C:\jarvis-vault\perfil\usuario.md" -Value $profileContent

    Write-Host "`n=================================================" -ForegroundColor Green
    Write-Host " MODO SERVIDOR CONCLUÍDO! SISTEMA VIVO E OPERANTE! " -ForegroundColor Green
    Write-Host "================================================="
    Write-Host " > Para Ativar as IA em background: .\.venv\Scripts\Activate.ps1 e depois python jarvis_engine/main.py --mode daemon"
} else {
    Write-Host "`n>> MODO DESKTOP / PC PESSOAL SELECIONADO <<" -ForegroundColor Green
    Write-Host "[...] Testando binários NodeJS"
    if (-not (node -v 2>$null)) { winget install OpenJS.NodeJS -e --silent }
    
    Write-Host "[...] Validando Rust Compiler (Obrigatório pro Desktop Nativo)"
    if (-not (rustc --version 2>$null)) { Write-Host "⚠️ Rust Ausente! Acesse rustup.rs e baixe ANTES de tentar rodar a interface UI!" -ForegroundColor Red }

    Write-Host "[...] Baixando apenas módulos essenciais do NPM Frontend"
    npm install

    Write-Host "`n=================================================" -ForegroundColor Green
    Write-Host " MODO DESKTOP ALOCADO COM SUCESSO! " -ForegroundColor Green
    Write-Host "================================================="
    Write-Host " > Acesse e compile a UI Flutuante digitando: npm run tauri dev"
}
