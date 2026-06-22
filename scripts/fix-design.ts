import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace too small fonts with readable sizes
content = content.replace(/text-\[9px\]/g, 'text-xs');
content = content.replace(/text-\[10px\]/g, 'text-sm');
content = content.replace(/text-\[11px\]/g, 'text-sm');

// Replace aggressive neon shadows
content = content.replace(/shadow-\[0_0_15px_var\(--brand-glow\)\]/g, 'shadow-md border border-[var(--brand-glow)] shadow-[var(--brand-glow)]/20');
content = content.replace(/shadow-\[0_0_20px_var\(--brand-glow\)\]/g, 'shadow-lg border border-[var(--brand-glow)] shadow-[var(--brand-glow)]/30');
content = content.replace(/shadow-\[0_0_30px_var\(--brand-glow\)\]/g, 'shadow-xl');
content = content.replace(/shadow-\[0_0_10px_var\(--brand-glow\)\]/g, 'shadow-sm');

fs.writeFileSync('src/App.tsx', content);
