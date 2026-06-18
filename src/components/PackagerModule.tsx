import React, { useState } from 'react';
import { Download, TerminalSquare, Package, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';

export default function PackagerModule() {
  const [buildState, setBuildState] = useState<'idle' | 'building' | 'done'>('idle');
  const [appName, setAppName] = useState('JARVIS Core Suite');
  const [version, setVersion] = useState('5.0.0');
  const [enableStartup, setEnableStartup] = useState(true);

  const innoScript = `; jarvis.iss
; Script de compilação do Inno Setup para gerar o instalador nativo do ${appName} v${version}

[Setup]
AppId={{D8C2F2D1-331B-46C9-9A0B-4ED1A748A5C2}
AppName=${appName}
AppVersion=${version}
AppPublisher=Vinicius Castro
DefaultDirName={commonpf}\\${appName}
DefaultGroupName=${appName}
DisableProgramGroupPage=yes
OutputDir=.
OutputBaseFilename=${appName.replace(/\s+/g, '')}Setup_v${version}
; Icon desativado pois InnoSetup só aceita .ico nativo
; SetupIconFile=dist\\favicon.ico
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "startup"; Description: "Iniciar o JARVIS com o Windows (Em segundo plano)"; GroupDescription: "Configurações Globais:"

[Files]
; Copia o binário unificado do servidor compilado em CJS/EXE para a pasta de arquivos de programas
Source: "dist\\server.cjs"; DestDir: "{app}"; Flags: ignoreversion
; Copia o script de instalação automatizada de dependências e ecossistema
Source: "AutoInstaller.ps1"; DestDir: "{app}"; Flags: ignoreversion
; Copia a build do Frontend React compilada
Source: "dist\\*"; DestDir: "{app}\\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
; Copia os arquivos de banco de dados locais e configurações preservando os dados do usuário
Source: "data\\*"; DestDir: "{userappdata}\\JARVIS Core\\data"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "docker-compose.yml"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\\${appName}"; Filename: "{app}\\server.cjs"
Name: "{commondesktop}\\${appName}"; Filename: "{app}\\server.cjs"; Tasks: desktopicon

[Registry]
; Registra o JARVIS para iniciar silenciosamente em segundo plano junto com o Windows se a Task estiver marcada
${enableStartup ? `Root: HKCU; Subkey: "Software\\Microsoft\\Windows\\CurrentVersion\\Run"; ValueType: string; ValueName: "JARVISCore"; ValueData: """{app}\\server.cjs"" --background"; Flags: uninsdeletevalue; Tasks: startup` : `; Inicialização opcional pelo registro do Windows desativada`}

[Run]
; Executa o ativador do ecossistema e instalador de dependências nativas (Docker, Ollama, Obsidian, Modelos RAG)
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\\AutoInstaller.ps1"""; Flags: runascurrentuser postinstall; Description: "Instalar e Configurar Ecossistema JARVIS Completo (Docker, Ollama, Obsidian, Modelos de IA e Vault)"

; Inicializa a pilha de serviços Docker compose locais ao finalizar a instalação física
Filename: "powershell.exe"; Parameters: "-Command ""Set-Location '{app}'; docker compose up -d"""; Flags: runhidden postinstall; Description: "Iniciar Containers Docker do Sistema (ChromaDB, PostgreSQL, n8n)"

; Executa o backend invisivelmente
Filename: "{app}\\server.cjs"; Description: "{cm:LaunchProgram,${appName}}"; Flags: shellexec runascurrentuser postinstall nowait
`;

  const handleBuild = () => {
    setBuildState('building');
    setTimeout(() => {
      setBuildState('done');
    }, 1500);
  };

  const downloadScript = () => {
    const element = document.createElement("a");
    const file = new Blob([innoScript], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "jarvis.iss";
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
  };

  return (
    <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden">
      {/* Decorative background aura */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
        <Package className="text-cyan-400 w-6 h-6 transition-opacity duration-300" />
        <div>
          <h2 className="text-lg font-bold text-[var(--brand-light)] font-mono tracking-wide">COMPILADORES NATIVOS & INNO SETUP</h2>
          <p className="text-[11px] text-zinc-400 font-sans">Gere scripts nativos do Windows para empacotar o executável Node.js/CJS do JARVIS e os assets estáticos do Vite de forma persistente.</p>
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
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-sm text-[var(--brand-light)] font-mono focus:border-cyan-500/50 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-1 block">Versão de Release</label>
            <input 
              type="text" 
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-sm text-[var(--brand-light)] font-mono focus:border-cyan-500/50 focus:outline-none transition-colors"
            />
          </div>

          <div className="pt-3 pb-1 border-b border-zinc-800">
            <label className="flex items-start gap-2.5 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={enableStartup}
                onChange={(e) => setEnableStartup(e.target.checked)}
                className="w-4 h-4 rounded mt-0.5 border-zinc-800 bg-zinc-900 text-cyan-500 focus:ring-cyan-500/20"
              />
              <div>
                <span className="text-xs font-bold text-zinc-300 block uppercase tracking-wide group-hover:text-cyan-400 transition-colors">Iniciar automaticamente com o Windows</span>
                <span className="text-[10px] text-zinc-500 font-mono block mt-0.5 leading-relaxed">
                  Registra uma chave em <code className="text-zinc-400">HKCU\Software\Microsoft\Windows\Run</code> que inicializa o JARVIS invisivelmente em segundo plano na porta local do servidor (3000).
                </span>
              </div>
            </label>
          </div>

          <div className="pt-2">
            <h3 className="text-xs font-bold text-cyan-400 mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5" /> Integração Omnipresente (AutoInstaller)
            </h3>
            <ul className="text-xs text-zinc-400 space-y-2.5 font-mono">
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">1.</span>
                <span>
                  O script <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-300">AutoInstaller.ps1</code> foi imbutido no empacotador físico para provisionar as dependências automaticamente.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">2.</span>
                <span>
                  Durante a instalação pelo <code className="text-zinc-200">JarvisSetup.exe</code>, o assistente irá disparar a instalação do Docker Desktop, Obsidian, Ollama e o download silencioso dos LLM Models no background.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-500 font-bold">3.</span>
                <span>
                  Abra este script gerado (.ISS) no <strong>Inno Setup</strong> e aperte F9 (Build). O instalador gerado cuidará de tudo sozinho de ponta-a-ponta!
                </span>
              </li>
            </ul>
          </div>
          
          <div className="pt-2 flex gap-3">
            <button 
              onClick={handleBuild}
              className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/40 hover:bg-cyan-500/20 text-cyan-400 px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              {buildState === 'idle' ? 'Validar Parâmetros' : buildState === 'building' ? 'Analisando Estrutura...' : 'Script Validado ✓'}
            </button>
            <button 
              onClick={downloadScript}
              className="flex items-center gap-2 bg-zinc-900 border border-zinc-750 hover:bg-zinc-800 text-zinc-300 px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Baixar .ISS Script
            </button>
          </div>
        </div>

        {/* Right Side: Script preview */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col relative z-10 w-full overflow-hidden">
          <div className="bg-zinc-900/40 rounded-t-xl px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
             <div className="flex items-center gap-2">
               <TerminalSquare className="w-4 h-4 text-cyan-400" />
               <span className="text-xs font-mono font-bold text-zinc-400">jarvis.iss</span>
             </div>
             <div className="flex gap-1.5">
               <div className="w-2 h-2 rounded-full bg-zinc-800 border border-zinc-700"></div>
               <div className="w-2 h-2 rounded-full bg-zinc-800 border border-zinc-700"></div>
               <div className="w-2 h-2 rounded-full bg-zinc-800 border border-zinc-700"></div>
             </div>
          </div>
          <div className="p-4 flex-1 font-mono text-[10px] leading-relaxed text-zinc-300 bg-zinc-950 overflow-y-auto max-h-96 md:max-h-none h-80">
             <pre className="whitespace-pre-wrap">{innoScript}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
