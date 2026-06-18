import fs from 'fs';

function replaceInFile(filename, replacements) {
    let content = fs.readFileSync(filename, 'utf8');
    for (let r of replacements) {
        content = content.replace(r.search, r.replace);
    }
    fs.writeFileSync(filename, content);
    console.log(`Updated ${filename}`);
}

const gemmaSearches = [
    { search: /gemma4:e4b/g, replace: "llama3.2" },
    { search: /Gemma 4/g, replace: "Llama 3.2" },
    { search: /Gemma/g, replace: "Llama" },
    { search: /RTX 4070 Ti/g, replace: "GTX 1650" },
    { search: /Desktop Ryzen 7/g, replace: "Notebook (Servidor)" },
    { search: /ryzen 7/ig, replace: "notebook (servidor)" }
];

['server.ts', 'src/App.tsx', 'src/components/CUDATelemetryHUD.tsx', 'src/components/DeviceConfig.tsx', 'src/components/Installer.tsx', 'src/components/JarvisAssistant.tsx', 'src/components/LogsDocker.tsx', 'src/components/MCPSettings.tsx'].forEach(file => {
    try {
        replaceInFile(file, gemmaSearches);
    } catch(err) {
        console.error(`Failed to update ${file}: ${err.message}`);
    }
});
