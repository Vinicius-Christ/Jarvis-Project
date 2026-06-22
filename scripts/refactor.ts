import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace typography
content = content.replace(/text-\[10px\]/g, 'text-xs');
content = content.replace(/text-\[9px\]/g, 'text-xs');

// Keep some badges as text-[10px]
content = content.replace(/text-xs bg-\[var\(--brand-glow\)/g, 'text-[10px] bg-[var(--brand-glow)');
content = content.replace(/text-xs bg-zinc-900\/50/g, 'text-[10px] bg-zinc-900/50');
content = content.replace(/text-xs flex items-center justify-center/g, 'text-[10px] flex items-center justify-center');
content = content.replace(/text-xs font-mono text-zinc-500 uppercase/g, 'text-[10px] font-mono text-zinc-500 uppercase');
content = content.replace(/text-xs text-zinc-500 hover:text-\[var\(--brand-light\)\] underline cursor-pointer/g, 'text-[10px] text-zinc-500 hover:text-[var(--brand-light)] underline cursor-pointer');

// Replace borders
content = content.replace(/border-zinc-800/g, 'border-zinc-800/40');
content = content.replace(/border-zinc-800\/40\/50/g, 'border-zinc-800/40');
content = content.replace(/border-zinc-800\/40\/60/g, 'border-zinc-800/40');

// Replace heavy glows
content = content.replace(/shadow-\[0_0_15px_var\(--brand-glow\)\]/g, 'shadow-sm group-hover:shadow-[0_0_15px_var(--brand-glow)] transition-all');

// Fix motion imports
if (!content.includes('import { AnimatePresence, motion } from "motion/react";')) {
  content = content.replace('import React, { useState, useEffect, useRef } from "react";', 
    'import React, { useState, useEffect, useRef } from "react";\nimport { AnimatePresence, motion } from "motion/react";\nimport { SystemHealthMonitor, HardwareProcessingMonitor } from "./components/HardwareMonitor";');
}

fs.writeFileSync('src/App.tsx', content);
