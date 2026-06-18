import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(/catch\s*\{\s*\}/g, 'catch { /* ignore */ }');
fs.writeFileSync('src/App.tsx', content);

let files = ['src/components/CUDATelemetryHUD.tsx'];
for(let f of files) {
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf-8');
    c = c.replace(/catch \((e|err)\) \{\s*\}/g, 'catch ($1) { /* ignore */ }');
    c = c.replace(/catch\s*\{\s*\}/g, 'catch { /* ignore */ }');
    fs.writeFileSync(f, c);
  }
}
