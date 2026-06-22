import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Remove hardwareStats from App.tsx state
content = content.replace(/const \[hardwareStats, setHardwareStats\] = useState<any>\(null\);/g, '');

// 2. Remove fetchHardwareStats from App.tsx
content = content.replace(/const fetchHardwareStats = async \(\) => \{[\s\S]*?\n  \};\n/g, '');

// 3. Remove hardwareStats from intervals in App.tsx
content = content.replace(/const hwInterval = setInterval\(fetchHardwareStats, 3000\);/g, '');
content = content.replace(/clearInterval\(hwInterval\);/g, '');
content = content.replace(/fetchHardwareStats\(\);\n/g, '');

// 4. Replace hardwareStats usages with static or separate component
content = content.replace(/\{hardwareStats\?\.cpu \|\| "Notebook \(Servidor\)"\}/g, '"Servidor Jarvis"');
content = content.replace(/\{hardwareStats\?\.gpus\?\.\[0\]\?\.model \|\| "GTX 1650"\}/g, '"GPU Local"');
content = content.replace(/\{hardwareStats\?\.gpus\?\.\[0\]\?\.vram\n\s*\?\s*Math\.round\(hardwareStats\.gpus\[0\]\.vram \/ 1024\) \+\n\s*"GB"\n\s*:\n\s*"4GB"\}/g, '"VRAM Alocada"');

// 5. Replace the HardwareProcessingMonitor prop
content = content.replace(/<HardwareProcessingMonitor hardwareStats=\{hardwareStats\} setActiveTab=\{setActiveTab\} setSettingsTab=\{setSettingsTab\} \/>/g, '<HardwareProcessingMonitor setActiveTab={setActiveTab} setSettingsTab={setSettingsTab} />');

fs.writeFileSync('src/App.tsx', content);
