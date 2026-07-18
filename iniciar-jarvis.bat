@echo off
echo ============================================
echo  JARVIS SYSTEM - INICIANDO...
echo ============================================

:: Mata processos anteriores
taskkill /F /IM "Jarvis Tauri Overlay.exe" /T 2>nul
taskkill /F /IM node.exe /T 2>nul
taskkill /F /IM msedgewebview2.exe /T 2>nul

:: Aguarda liberacao das portas
timeout /t 3 /nobreak >nul

:: Define diretorio
cd /d "%~dp0"

echo [1/3] Iniciando servidor API...
start "Jarvis-API" cmd /k "cd /d %~dp0 && npx tsx server.ts"

:: Aguarda servidor subir
timeout /t 4 /nobreak >nul

echo [2/3] Iniciando Vite (frontend)...
start "Jarvis-Vite" cmd /k "cd /d %~dp0 && npx vite"

:: Aguarda Vite subir
timeout /t 5 /nobreak >nul

echo [3/3] Iniciando Tauri (janela desktop)...
set WEBVIEW2_USER_DATA_FOLDER=C:\temp-jarvis-webview2
set RUST_BACKTRACE=1

start "Jarvis-Desktop" cmd /k "cd /d %~dp0 && npx tauri dev"

echo ============================================
echo  PRONTO! A janela do Jarvis deve aparecer.
echo  Se nao aparecer, verifique as janelas CMD.
echo ============================================
pause
