import re

with open('src/components/JarvisAssistant.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    'import { motion, AnimatePresence } from "motion/react";',
    'import { motion, AnimatePresence, useDragControls } from "motion/react";'
)

# 2. Add isWidget to props
content = content.replace(
    'isDarkMode?: boolean;\n}',
    'isDarkMode?: boolean;\n  isWidget?: boolean;\n}'
)

content = content.replace(
    'isDarkMode = true,',
    'isDarkMode = true,\n  isWidget = false,'
)

# 3. Add dragControls
content = content.replace(
    'const audioRef = useRef<HTMLAudioElement | null>(null);',
    'const audioRef = useRef<HTMLAudioElement | null>(null);\n  const dragControls = useDragControls();'
)

# 4. Modify the wrapper to motion.div and add dragHandle
wrapper_original = '''  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_380px] gap-4 h-full p-4 bg-transparent text-white overflow-hidden font-sans">

      {/* ======================================================== */}'''
wrapper_new = '''  return (
    <motion.div 
      drag={isWidget ? true : false}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      style={{ resize: isWidget ? "both" : "none" }}
      className={isWidget 
        ? "fixed bottom-6 right-6 w-80 min-w-[280px] min-h-[350px] max-h-[90vh] max-w-[90vw] h-[28rem] bg-black/80 backdrop-blur-3xl border border-[var(--brand-primary)]/40 shadow-[0_0_40px_var(--brand-glow)] rounded-3xl overflow-hidden z-[9999] flex flex-col font-sans pointer-events-auto" 
        : "grid grid-cols-1 lg:grid-cols-[280px_1fr_380px] gap-4 h-full p-4 bg-transparent text-white overflow-hidden font-sans"}
    >
      {isWidget && (
        <div 
          className="w-full h-8 flex items-center justify-between px-4 cursor-grab active:cursor-grabbing shrink-0 z-50 bg-white/5 hover:bg-white/10 transition-colors border-b border-[var(--brand-primary)]/20"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="w-4 h-4" />
          <div className="w-12 h-1 bg-[var(--brand-light)]/40 rounded-full" />
          <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setIsVoiceModalOpen(true)} className="text-zinc-500 hover:text-white transition-colors cursor-pointer z-50 p-1">
             <Sliders className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ======================================================== */}'''
content = content.replace(wrapper_original, wrapper_new)

# 5. Hide left column in widget mode
content = content.replace(
    '<div className="glass-panel rounded-3xl p-5 flex flex-col gap-4 h-full overflow-hidden border border-[var(--brand-primary)]/20 shadow-[0_0_20px_var(--brand-glow)] relative glass-panel">',
    '{!isWidget && (<div className="glass-panel rounded-3xl p-5 flex flex-col gap-4 h-full overflow-hidden border border-[var(--brand-primary)]/20 shadow-[0_0_20px_var(--brand-glow)] relative glass-panel">'
)

# 6. Close left column and update Center Column
center_col_orig = '''      </div>

      {/* ======================================================== */}
      {/* CENTER COLUMN: GALAXY NUCLEUS CORE */}
      {/* ======================================================== */}
      <div className="flex flex-col items-center justify-center relative h-full rounded-3xl overflow-hidden glass-panel border border-white/5">
        {/* No title — clean & immersive */}

        {/* State label — subtle floating badge */}
        <div className="absolute top-6 z-10">'''
center_col_new = '''      </div>
      )}

      {/* ======================================================== */}
      {/* CENTER COLUMN: GALAXY NUCLEUS CORE */}
      {/* ======================================================== */}
      <div className={`flex flex-col items-center justify-center relative overflow-hidden ${isWidget ? "flex-none h-[140px] bg-transparent" : "rounded-3xl glass-panel border border-white/5 h-full"}`}>
        {/* No title — clean & immersive */}

        {/* State label — subtle floating badge */}
        <div className={`absolute z-10 ${isWidget ? "top-2" : "top-6"}`}>'''
content = content.replace(center_col_orig, center_col_new)

# 7. Scale Orb in widget mode
orb_orig = '<div className="relative flex flex-col items-center justify-center w-full flex-1">'
orb_new = '<div className={`relative flex flex-col items-center justify-center w-full flex-1 ${isWidget ? "scale-[0.4] mt-2" : ""}`}>'
content = content.replace(orb_orig, orb_new)

# 8. Hide action toolbar in widget mode
toolbar_orig = '<div className="absolute bottom-10 flex gap-4 p-3 rounded-full border border-white/5 bg-white/5 backdrop-blur-3xl shadow-2xl z-40 hover-glow">'
toolbar_new = '{!isWidget && (<div className="absolute bottom-10 flex gap-4 p-3 rounded-full border border-white/5 bg-white/5 backdrop-blur-3xl shadow-2xl z-40 hover-glow">'
content = content.replace(toolbar_orig, toolbar_new)

toolbar_end_orig = '''          <button onClick={() => setIsVoiceModalOpen(true)} className="magnetic-btn p-4 rounded-full flex items-center justify-center bg-white/5 text-zinc-400 hover:text-white border border-white/10 cursor-pointer">
            <Sliders className="w-5 h-5" />
          </button>
        </div>
      </div>'''
toolbar_end_new = '''          <button onClick={() => setIsVoiceModalOpen(true)} className="magnetic-btn p-4 rounded-full flex items-center justify-center bg-white/5 text-zinc-400 hover:text-white border border-white/10 cursor-pointer">
            <Sliders className="w-5 h-5" />
          </button>
        </div>
        )}
      </div>'''
content = content.replace(toolbar_end_orig, toolbar_end_new)

# 9. Modify Right Column (Chat Terminal)
right_col_orig = '''      {/* ======================================================== */}
      {/* RIGHT COLUMN: CHAT TERMINAL */}
      {/* ======================================================== */}
      <div className="glass-panel border border-[var(--brand-primary)]/20 shadow-[0_0_20px_var(--brand-glow)] flex flex-col justify-between overflow-hidden relative rounded-3xl h-full">
        <div className="flex justify-between items-center px-5 py-4 border-b border-[var(--brand-primary)]/20 bg-white/5 shrink-0">'''

right_col_new = '''      {/* ======================================================== */}
      {/* RIGHT COLUMN: CHAT TERMINAL */}
      {/* ======================================================== */}
      <div className={`glass-panel border border-[var(--brand-primary)]/20 shadow-[0_0_20px_var(--brand-glow)] flex flex-col justify-between overflow-hidden relative rounded-3xl ${isWidget ? "flex-1 border-none bg-transparent rounded-none" : "h-full"}`}>
        {!isWidget && (
          <div className="flex justify-between items-center px-5 py-4 border-b border-[var(--brand-primary)]/20 bg-white/5 shrink-0">'''
content = content.replace(right_col_orig, right_col_new)

sys_log_orig = '''              <span className="text-xs font-mono font-bold text-[var(--brand-light)] tracking-wider">
                SYS_LOG@CYBER_CORE:~
              </span>
            </div>
          </div>'''
sys_log_new = '''              <span className="text-xs font-mono font-bold text-[var(--brand-light)] tracking-wider">
                SYS_LOG@CYBER_CORE:~
              </span>
            </div>
          </div>
        )}'''
content = content.replace(sys_log_orig, sys_log_new)

# 10. Input Form modifications (adding inline mic/radio in widget mode)
input_form_orig = '''        {/* Input area */}
        <form onSubmit={handleSendText} className="p-4 border-t border-[var(--brand-primary)]/20 flex gap-3 items-center bg-white/5 backdrop-blur-3xl z-10 shrink-0">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.docx,.xlsx,.xls,.txt,.jpg,.jpeg,.png,.webp" className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="magnetic-btn p-3.5 rounded-xl border border-white/10 bg-white/10 text-zinc-400 hover:text-[var(--brand-light)] transition-all cursor-pointer shrink-0">
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={appState === "processing"}
            placeholder={
              appState === "listening" ? "Aguardando entrada de voz..." :
                appState === "processing" ? "Processando..." :
                  "Inicializar comando..."
            }
            className="holo-input flex-1 rounded-xl text-xs px-4 py-3.5 font-mono"
          />
          <button type="submit" disabled={appState === "processing" || (!inputText.trim() && !attachedFile)} className="magnetic-btn px-6 py-3.5 bg-[var(--brand-primary)]/80 hover:bg-[var(--brand-primary)] text-white border border-[var(--brand-primary)]/50 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center font-bold cursor-pointer shrink-0 shadow-[0_0_15px_var(--brand-glow-strong)]">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>'''

input_form_new = '''        {/* Input area */}
        <form onSubmit={handleSendText} className={`p-3 border-t border-[var(--brand-primary)]/20 flex flex-col gap-2 bg-white/5 backdrop-blur-3xl z-10 shrink-0 ${isWidget ? "" : "p-4 gap-3 flex-row items-center"}`}>
          {isWidget && (
            <div className="flex gap-2 w-full justify-center">
              <button type="button" onClick={handleMicToggle} className={`magnetic-btn p-2 rounded-xl flex items-center justify-center cursor-pointer flex-1 transition-all ${appState === 'listening' ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-light)] border border-[var(--brand-primary)]/30' : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'}`}>
                {appState === 'listening' ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
              </button>
              <button type="button" onClick={() => {
                const newMode = !isContinuousMode;
                setIsContinuousMode(newMode);
                if (newMode && appState === "inactive") {
                  recognitionRef.current?.start();
                } else if (!newMode && appState === "listening") {
                  recognitionRef.current?.stop();
                }
              }} className={`magnetic-btn p-2 rounded-xl flex items-center justify-center cursor-pointer flex-1 transition-all ${isContinuousMode ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-light)] border border-[var(--brand-primary)]/40' : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'}`}>
                <Radio className={`w-4 h-4 ${isContinuousMode ? 'animate-flicker' : ''}`} />
              </button>
            </div>
          )}
          
          <div className="flex gap-2 items-center w-full">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.docx,.xlsx,.xls,.txt,.jpg,.jpeg,.png,.webp" className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="magnetic-btn p-3 rounded-xl border border-white/10 bg-white/10 text-zinc-400 hover:text-[var(--brand-light)] transition-all cursor-pointer shrink-0">
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={appState === "processing"}
              placeholder={
                appState === "listening" ? "Ouvindo..." :
                  appState === "processing" ? "Computando..." :
                    "Comando..."
              }
              className="holo-input flex-1 rounded-xl text-[11px] px-3 py-3 font-mono"
            />
            <button type="submit" disabled={appState === "processing" || (!inputText.trim() && !attachedFile)} className="magnetic-btn px-4 py-3 bg-[var(--brand-primary)]/80 hover:bg-[var(--brand-primary)] text-white border border-[var(--brand-primary)]/50 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center font-bold cursor-pointer shrink-0 shadow-[0_0_15px_var(--brand-glow-strong)]">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>'''
content = content.replace(input_form_orig, input_form_new)

# 11. Final motion.div wrap closing
content = content.replace(
    '  );\n});',
    '    </motion.div>\n  );\n});'
)

with open('src/components/JarvisAssistant.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Update complete')
