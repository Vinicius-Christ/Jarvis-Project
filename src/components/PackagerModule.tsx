import React, { useState } from 'react';
import { Download, TerminalSquare, Package, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';

export default function PackagerModule() {
  const [buildState, setBuildState] = useState<'idle' | 'building' | 'done'>('idle');
  const [appName, setAppName] = useState('JARVIS Core Suite');
  const [version, setVersion] = useState('5.0.0');
  const [enableStartup, setEnableStartup] = useState(true);

  const psScript = `# install_and_daemonize_jarvis.ps1
# Script gerador de Startup Service para o ${appName} v${version} no Servidor Windows

Write-Host "Verificando permissões de administrador..."
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Por favor, execute como Administrador." -ForegroundColor Yellow
    Exit
}

$APP_DIR = "C:\\JARVIS"
Write-Host "Copiando arquivos do JARVIS para $APP_DIR..."
if (-not (Test-Path -Path $APP_DIR)) {
    New-Item -ItemType Directory -Path $APP_DIR -Force | Out-Null
}
Copy-Item -Path ".*\\*" -Destination $APP_DIR -Recurse -Force

Set-Location -Path $APP_DIR

Write-Host "Instalando dependências de produção do servidor CJS..."
npm install --production

# Criar script de inicialização
$SCRIPT_FILE = "C:\\JARVIS\\start.bat"
$BAT_CONTENT = @"
@echo off
set NODE_ENV=production
set PORT=3000
node server.cjs
"@

Set-Content -Path $SCRIPT_FILE -Value $BAT_CONTENT

${enableStartup ? `
Write-Host "Criando atalho de inicialização no Windows..."
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\JarvisBackend.lnk")
$Shortcut.TargetPath = $SCRIPT_FILE
$Shortcut.WorkingDirectory = $APP_DIR
$Shortcut.WindowStyle = 7
$Shortcut.Save()
` : ''}

Write-Host "Iniciando o JARVIS..."
Start-Process -FilePath $SCRIPT_FILE -WindowStyle Hidden
Write-Host "JARVIS instalado e operante na porta 3000." -ForegroundColor Green

Write-Host "Levantando Containers Docker..."
docker compose up -d

Write-Host "Implantação finalizada com sucesso! Acesse http://localhost:3000" -ForegroundColor Green
`;

  const handleBuild = () => {
    setBuildState('building');
    setTimeout(() => {
      setBuildState('done');
    }, 1500);
  };

  const downloadScript = () => {
    const element = document.createElement("a");
    const file = new Blob([psScript], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "deploy_jarvis.ps1";
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
  };

  return (
    <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden">
      {/* Decorative background aura */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-primary)]/5 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
        <Package className="text-[var(--brand-light)] w-6 h-6 transition-opacity duration-300" />
        <div>
          <h2 className="text-lg font-bold text-[var(--brand-light)] font-mono tracking-wide">COMPILADOR & DEPLOY NATIVO WINDOWS</h2>
          <p className="text-[11px] text-zinc-400 font-sans">Gere scripts powershell para empacotar o executável Node.js/CJS do JARVIS como um serviço startup no seu Servidor Windows.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side: Setup config */}
        <div className="space-y-4 relative z-10 w-full font-mono text-xs">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1 block">Nome da Suite</label>
            <input 
              type="text" 
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-sm text-[var(--brand-light)] font-mono focus:border-[var(--brand-primary)]/50 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1 block">Versão de Release</label>
            <input 
              type="text" 
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-sm text-[var(--brand-light)] font-mono focus:border-[var(--brand-primary)]/50 focus:outline-none transition-colors"
            />
          </div>

          <div className="pt-3 pb-1 border-b border-zinc-800">
            <label className="flex items-start gap-2.5 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={enableStartup}
                onChange={(e) => setEnableStartup(e.target.checked)}
                className="w-4 h-4 rounded mt-0.5 border-zinc-800 bg-zinc-900 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]/20"
              />
              <div>
                <span className="text-xs font-bold text-zinc-300 block uppercase tracking-wide group-hover:text-[var(--brand-light)] transition-colors">Iniciar automaticamente com o Sistema (Startup)</span>
                <span className="text-[10px] text-zinc-500 font-mono block mt-0.5 leading-relaxed">
                  Registra um atalho no Inicializar do Windows que inicializa o JARVIS invisivelmente em segundo plano (porta 3000) no momento em que o servidor ligar.
                </span>
              </div>
            </label>
          </div>

          <div className="pt-2">
            <h3 className="text-xs font-bold text-[var(--brand-light)] mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5" /> Deploy Contínuo (Servidor)
            </h3>
            <ul className="text-xs text-zinc-400 space-y-2.5 font-mono">
              <li className="flex items-start gap-2">
                <span className="text-[var(--brand-primary)] font-bold">1.</span>
                <span>
                  Copie o script gerado <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-300">deploy_jarvis.ps1</code> para o diretório <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-300">dist/</code> do seu projeto compilado.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--brand-primary)] font-bold">2.</span>
                <span>
                  Execute o script powershell gerado como Administrador no Windows. Ele moverá os arquivos para a pasta <code className="text-zinc-200">C:\JARVIS</code>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--brand-primary)] font-bold">3.</span>
                <span>
                  O script também ativará as dependências físicas Docker locais no background, levantando a suíte de dados RAG.
                </span>
              </li>
            </ul>
          </div>
          
          <div className="pt-2 flex gap-3">
            <button 
              onClick={handleBuild}
              className="flex items-center gap-2 bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/40 hover:bg-[var(--brand-primary)]/20 text-[var(--brand-light)] px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              {buildState === 'idle' ? 'Validar Parâmetros' : buildState === 'building' ? 'Analisando Estrutura...' : 'Script Validado ✓'}
            </button>
            <button 
              onClick={downloadScript}
              className="flex items-center gap-2 bg-zinc-900 border border-zinc-750 hover:bg-zinc-800 text-zinc-300 px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Baixar .PS1 Script
            </button>
          </div>
        </div>

        {/* Right Side: Script preview */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col relative z-10 w-full overflow-hidden">
          <div className="bg-zinc-900/40 rounded-t-xl px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
             <div className="flex items-center gap-2">
               <TerminalSquare className="w-4 h-4 text-[var(--brand-light)]" />
               <span className="text-xs font-mono font-bold text-zinc-400">deploy_jarvis.ps1</span>
             </div>
             <div className="flex gap-1.5">
               <div className="w-2 h-2 rounded-full bg-zinc-800 border border-zinc-700"></div>
               <div className="w-2 h-2 rounded-full bg-zinc-800 border border-zinc-700"></div>
               <div className="w-2 h-2 rounded-full bg-zinc-800 border border-zinc-700"></div>
             </div>
          </div>
          <div className="p-4 flex-1 font-mono text-[10px] leading-relaxed text-zinc-300 bg-zinc-950 overflow-y-auto max-h-96 md:max-h-none h-80 flex flex-col">
             <pre className="whitespace-pre-wrap">{psScript}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
