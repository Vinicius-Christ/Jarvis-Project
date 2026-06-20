import fs from 'fs';
let c = fs.readFileSync('src/components/CUDATelemetryHUD.tsx', 'utf-8');
c = c.replace(/catch \((e|err)\) \{\s*\}/g, 'catch ($1) { /* ignore */ }');
c = c.replace(/catch\s*\{\s*\}/g, 'catch { /* ignore */ }');
fs.writeFileSync('src/components/CUDATelemetryHUD.tsx', c);
