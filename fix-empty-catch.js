import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(/catch \((e|err)\) \{\s*\}/g, 'catch ($1) { /* ignore */ }');
fs.writeFileSync('src/App.tsx', content);

let files = ['src/components/DeviceConfig.tsx', 'src/components/LogsDocker.tsx', 'src/components/JarvisAssistant.tsx'];
for(let f of files) {
  let c = fs.readFileSync(f, 'utf-8');
  c = c.replace(/catch \((e|err)\) \{\s*\}/g, 'catch ($1) { /* ignore */ }');
  fs.writeFileSync(f, c);
}
