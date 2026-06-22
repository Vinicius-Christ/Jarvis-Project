import fs from "fs";

let jarvis = fs.readFileSync("src/components/JarvisAssistant.tsx", "utf-8");
jarvis = jarvis.replace(/msg\.text\.replace/g, "(msg.text || '').replace");
jarvis = jarvis.replace(/text\.replace/g, "(text || '').replace");
jarvis = jarvis.replace(/lowerTxt\.replace/g, "(lowerTxt || '').replace");
jarvis = jarvis.replace(/lowerTxt\.match/g, "(lowerTxt || '').match");
jarvis = jarvis.replace(/msg\.text\.match/g, "(msg.text || '').match");
fs.writeFileSync("src/components/JarvisAssistant.tsx", jarvis);

let hw = fs.readFileSync("src/components/HardwareMonitor.tsx", "utf-8");
hw = hw.replace(/hardwareStats\.gpuModel\.replace/g, "(hardwareStats.gpuModel || '').replace");
hw = hw.replace(/hardwareStats\.cpu\.replace/g, "(hardwareStats.cpu || '').replace");
fs.writeFileSync("src/components/HardwareMonitor.tsx", hw);

let server = fs.readFileSync("server.ts", "utf-8");
server = server.replace(/message\.replace/g, "(message || '').replace");
server = server.replace(/replyText\.replace/g, "(replyText || '').replace");
server = server.replace(/notePath\.replace/g, "(notePath || '').replace");
server = server.replace(/mConfig\.color\.replace/g, "(mConfig.color || '').replace");
server = server.replace(/presetName\.toLowerCase\(\)\.replace/g, "(presetName || '').toLowerCase().replace");
fs.writeFileSync("server.ts", server);
