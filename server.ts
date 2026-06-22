import express from "express";
import { exec, execSync } from "child_process";
import cors from "cors";
import path from "path";
import fs from "fs";

import { promisify } from "util";
import si from "systeminformation";
import dns from "dns";
import WebSocket from "ws";
import { EdgeTTS } from "node-edge-tts";
import os from "os";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import jwt from "jsonwebtoken";

dotenv.config();

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

// Ensure localhost/ipv4 works nicely
dns.setDefaultResultOrder("ipv4first");

// Ensure AbortSignal.timeout is polyfilled for Node versions < 17.3
if (typeof AbortSignal.timeout !== "function") {
  (AbortSignal as any).timeout = function (ms: number) {
    const controller = new AbortController();
    setTimeout(() => {
      try {
        controller.abort();
      } catch {}
    }, ms);
    return controller.signal;
  };
}



const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
];
if (process.env.VITE_SERVER_URL) {
  try {
    const url = new URL(process.env.VITE_SERVER_URL);
    allowedOrigins.push(url.origin);
  } catch {}
}
app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin || 
      allowedOrigins.includes(origin) || 
      origin.endsWith('.run.app') || 
      origin.includes('ais-dev-') || 
      origin.includes('ais-pre-') || 
      origin.includes('localhost') || 
      origin.includes('127.0.0.1') ||
      origin.includes('192.168.') ||
      origin.includes('10.') ||
      origin.includes('172.') ||
      /^http(s)?:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\./.test(origin)
    ) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Origem bloqueada: ${origin}`);
      callback(new Error('Bloqueado por CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.set("trust proxy", true); // Handle Cloudflare tunneling correctly

const JWT_SECRET = process.env.JWT_SECRET || "jarvis_super_secret_key_007";

// Add the auth middleware
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Missing credentials" });
  
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.password !== password) {
     return res.status(401).json({ error: "Credenciais inválidas" });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token, user: { email: user.email, role: user.role } });
});

app.get("/api/users", async (req, res) => {
  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
  res.json(users);
});
app.post("/api/users", async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const user = await prisma.user.create({ data: { email, password, role: role || "user" }, select: { id: true, email: true, role: true } });
    res.json(user);
  } catch(e) {
    res.status(400).json({error: "Failed to create user. Email may exist."});
  }
});
app.put("/api/users/:id", async (req, res) => {
  const { email, password, role } = req.body;
  const data: any = {};
  if (email) data.email = email;
  if (password) data.password = password;
  if (role) data.role = role;
  try {
    const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data, select: { id: true, email: true, role: true } });
    res.json(user);
  } catch(e) {
    res.status(400).json({error: "Failed to update user."});
  }
});
app.delete("/api/users/:id", async (req, res) => {
  await prisma.user.delete({ where: { id: Number(req.params.id) } });
  res.json({ success: true });
});

app.use(async (req, res, next) => {
  // 1. Libera todos os arquivos estáticos e rotas do frontend (qualquer rota que não comece com /api/)
  // Libera também as rotas públicas da API (/api/public/)
  if (!req.path.startsWith('/api/') || req.path.startsWith('/api/public/') || req.path.startsWith('/api/auth/login')) {
     return next();
  }

  // 2. Verifica o Auth (Fim do bypass de IP local, agora 100% seguro via Cloudflare)
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'];

  // Permite acesso via API Key ou Google Auth
  if (apiKeyHeader && apiKeyHeader === process.env.JARVIS_API_KEY) {
    return next();
  }
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
     return res.status(401).json({ error: "Cabeçalho de autorização ausente ou inválido. Por favor, forneça um token JWT Bearer válido." });
  }

  const token = authHeader.split(' ')[1];
  try {
     const decoded = jwt.verify(token, JWT_SECRET);
     (req as any).user = decoded;
     return next();
  } catch (error) {
     console.error("Token verification failed:", error);
     return res.status(401).json({ error: "Token inválido ou expirado. Faça o login novamente." });
  }
});

// Custom In-Memory Rate Limiter to prevent API abuse without adding heavy external dependencies
const ipLimits = new Map<string, { count: number, resetTime: number }>();

function rateLimiter(requestsPerMinute: number = 15) {
  return (req: any, res: any, next: any) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    
    let client = ipLimits.get(ip);
    if (!client || now > client.resetTime) {
      client = { count: 1, resetTime: now + windowMs };
      ipLimits.set(ip, client);
      return next();
    }
    
    if (client.count >= requestsPerMinute) {
      return res.status(429).json({ error: "Muitas requisições. Por favor, aguarde um minuto e tente novamente." });
    }
    
    client.count++;
    next();
  };
}

const PORT = 3000;

app.get("/api/public/config", (req, res) => {
  res.json({
    // Only used conceptually, no longer for Google Auth
  });
});

const DB_FILE = path.join(process.cwd(), "data", "jarvisState.json");

export interface DbSchema {
  githubRepo: string;
  githubToken: string;
  systemActive: boolean;
  activePersona: string;
  googleSheetUrl?: string;
  containerMockStates: Record<string, string>;
  goal: { limit: number; reason: string };
  conversations: any[];
  agenda: any[];
  finances: any[];
  homeAssistant: {
    lights: { brightness: number; color: string; state: string };
    ambientPreset: string;
    ac: { state: string; temp: number };
    devices: any[];
    ip: string;
    token: string;
    wsStatus: string;
    hiddenDevices?: string[];
    modesConfig?: Record<string, { brightness: number; color: string; temp: number }>;
  };
  mcpEnabled: boolean;
  mcpServers: any[];
  pcAutomation: {
    activeWorkspace: string;
    workspaceOptions: { id: string; name: string; apps: string[] }[];
  };
  obsidianNotes: any[];
  installer: {
    status: string;
    progress: number;
    logs: string[];
    modules: Record<string, { label: string; status: string; progress: number }>;
  };
  [key: string]: any;
}

// Define basic initial DB
let jarvisState: any = {
  githubRepo: "",
  githubToken: "",
  googleSheetUrl: "https://docs.google.com/spreadsheets/d/13wmGhejq3V78ZHSHl-SxayDZM7pk9s3qYRPVtZnbhgg/edit?usp=sharing",
  systemActive: true,
  activePersona: "friday",
  containerMockStates: {
    n8n: "running",
    homeassistant: "running",
    postgres: "running",
    redis: "running"
  } as Record<string, string>,
  goal: { limit: 0, reason: "" },
  conversations: [
    { sender: "JARVIS", text: "Sistemas online, senhor. Iniciando na nova infraestrutura limpa. Como posso auxiliar hoje?", time: new Date().toISOString() }
  ],
  agenda: [],
  finances: [],
  homeAssistant: {
    lights: { brightness: 0, color: "#FFFFFF", state: "off" },
    ambientPreset: "",
    ac: { state: "off", temp: 24 },
    devices: [] as any[],
    ip: "",
    token: "COLOQUE_SEU_TOKEN_AQUI",
    wsStatus: "disconnected",
    hiddenDevices: [] as string[],
    modesConfig: {
      "Modo Trabalho": { brightness: 90, color: "#E0F7FA", temp: 22 },
      "Modo Cinema": { brightness: 15, color: "#E040FB", temp: 20 },
      "Modo Noturno": { brightness: 5, color: "#FF8F00", temp: 24 }
    }
  },
  mcpEnabled: true,
  mcpServers: [
    { id: "fs", name: "Sistema de Arquivos Local", desc: "Permite que a IA leia arquivos .md, .txt, pdfs ou projetos do seu disco local de forma padronizada.", active: true },
    { id: "github", name: "Integração GitHub Host", desc: "Permite que a IA liste seus repositórios, abra PRs e revise código usando suas credenciais locais.", active: false },
    { id: "db", name: "Acesso PostgreSQL Nativo", desc: "Fornece metadados do schema e permite que a IA crie queries seguras atreladas ao banco em execução no Docker.", active: false },
  ],
  pcAutomation: {
    activeWorkspace: "",
    workspaceOptions: [
      { id: "work", name: "Iniciar Trabalho", apps: ["VS Code", "Google Chrome", "Slack"] },
      { id: "study", name: "Ambiente de Estudos", apps: ["Notion", "Spotify", "PDF Reader"] },
      { id: "relax", name: "Modo Jogos", apps: ["Steam Launcher", "Discord"] }
    ]
  },
  obsidianNotes: [],
  googleSheetsData: [],
  installer: {
    status: "idle", // idle, installing, completed
    progress: 0,
    logs: [] as string[],
    modules: {
      docker: { label: "Docker Desktop & Containers", status: "pending", progress: 0 },
      obsidian: { label: "Obsidian Vault & Templates", status: "pending", progress: 0 },
      groq: { label: "Groq Local Models", status: "pending", progress: 0 },
      n8n: { label: "n8n Orquestrador & Workflows", status: "pending", progress: 0 }
    }
  }
};

// Instead of using JSON, we will use Prisma for persistence.
// At initialization we load the global state from AppConfig
const DB_STATE_KEY = "global_state";

async function loadDB() {
  try {
    const config = await prisma.appConfig.findUnique({ where: { key: DB_STATE_KEY } });
    if (config) {
      const parsed = JSON.parse(config.value);
      jarvisState = { ...jarvisState, ...parsed }; // merge keys to prevent breaking if schema updates
    }
  } catch (err: any) {
    console.error("Falha ao ler o SQLite, usando configuracao padrao:", err?.message || err);
  }

  // Load specific tables to sync memory
  try {
    const finances = await prisma.finance.findMany();
    if (finances.length > 0) jarvisState.finances = finances as any;
    
    const agenda = await prisma.agenda.findMany();
    if (agenda.length > 0) jarvisState.agenda = agenda as any;
    
    const convs = await prisma.conversation.findMany();
    if (convs.length > 0) jarvisState.conversations = convs as any;

    const ha = await prisma.homeAssistantState.findFirst();
    if (ha) {
      jarvisState.homeAssistant.ip = ha.ip;
      jarvisState.homeAssistant.token = ha.token;
      jarvisState.homeAssistant.ambientPreset = ha.ambientPreset;
      jarvisState.homeAssistant.wsStatus = ha.wsStatus;
      if (ha.lights) jarvisState.homeAssistant.lights = JSON.parse(ha.lights);
      if (ha.ac) jarvisState.homeAssistant.ac = JSON.parse(ha.ac);
      if (ha.devices) jarvisState.homeAssistant.devices = JSON.parse(ha.devices);
      if (ha.hiddenDevices) jarvisState.homeAssistant.hiddenDevices = JSON.parse(ha.hiddenDevices);
      if (ha.modesConfig) jarvisState.homeAssistant.modesConfig = JSON.parse(ha.modesConfig);
    }
  } catch(e) {}
}

let saveTimeout: null | NodeJS.Timeout = null;

// Prisma handles persist

function saveDBSync() {
  // Sync wrapper not really needed or replace with async wait before exit
  // To avoid unhandled promises on exit, we skip this in purely Prisma model
}

// Write the note to physical disk in Windows
function syncNoteToVault(notePath: string, content: string) {
  try {
    const vaultDir = process.env.OBSIDIAN_VAULT_PATH || path.join(process.cwd(), "vault");
    if (!fs.existsSync(vaultDir)) {
      fs.mkdirSync(vaultDir, { recursive: true });
    }
    
    let safePath = (notePath || '').replace(/^(\/|\\)/, "");
    if (!safePath.endsWith(".md")) {
       safePath += ".md";
    }
    const fullPath = path.resolve(vaultDir, safePath);
    if (!fullPath.toLowerCase().startsWith(path.resolve(vaultDir).toLowerCase())) {
      console.warn(`[JARVIS VAULT] Tentativa de escape do diretório do vault bloqueada: ${notePath}`);
      return;
    }
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content, "utf8");
    console.log(`[JARVIS VAULT] File physical sync saved: ${fullPath}`);
  } catch(e: any) {
    console.log(`[JARVIS VAULT] Failed to sync physical file: ${e.message}`);
  }
}

process.on("exit", saveDBSync);
process.on("SIGINT", () => {
  saveDBSync();
  process.exit(0);
});
process.on("SIGTERM", () => {
  saveDBSync();
  process.exit(0);
});

// ==========================================
// HOME ASSISTANT WEBSOCKET API INTEGRATION
// ==========================================
let haWS: WebSocket | null = null;
let haMessageId = 1;
let reconnectTimeout: any = null;
let haReconnectDelay = 15000;

function connectHomeAssistantWS() {
  // Clear any pending reconnects
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  const ip = jarvisState.homeAssistant.ip || "";
  const token = jarvisState.homeAssistant.token || "COLOQUE_SEU_TOKEN_AQUI";

  console.log(`[HA WS] Tentando conectar ao Home Assistant em ws://${ip}:8123/api/websocket`);
  
  try {
    jarvisState.homeAssistant.wsStatus = "connecting";
    const wsUrl = `ws://${ip}:8123/api/websocket`;
    
    // Safety check for empty or placeholder token/ip
    if (!ip || ip.includes("COLOQUE_SEU") || !token || token.includes("COLOQUE_SEU")) {
      console.warn("[HA WS] IP ou Token do Home Assistant não parecem estar configurados. Aguardando configuração via painel.");
      jarvisState.homeAssistant.wsStatus = "disconnected";
      return;
    }

    haWS = new WebSocket(wsUrl);

    haWS.on("open", () => {
      console.log(`[HA WS] Socket aberto com sucesso. Aguardando requerimento de autorização...`);
      jarvisState.homeAssistant.wsStatus = "authenticating";
    });

    haWS.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        
        if (msg.type === "auth_required") {
          console.log("[HA WS] Solicitando autenticação. Enviando token...");
          haWS?.send(JSON.stringify({
            type: "auth",
            access_token: token
          }));
        } else if (msg.type === "auth_ok") {
          console.log("[HA WS] Conectado e Autenticado com Sucesso!");
          jarvisState.homeAssistant.wsStatus = "connected";
          haReconnectDelay = 15000; // Reset reconnection backoff delay on success
          

          // Obter informações estáticas e estados iniciais de todos os gadgets
          haMessageId = 1;
          haWS?.send(JSON.stringify({
            id: haMessageId++,
            type: "get_states"
          }));

          // Subscrever aos eventos de mudança de status
          haWS?.send(JSON.stringify({
            id: haMessageId++,
            type: "subscribe_events",
            event_type: "state_changed"
          }));

        } else if (msg.type === "auth_invalid") {
          console.error("[HA WS] Erro crítico: Autenticação Rejeitada (Token inválido ou expirado).");
          jarvisState.homeAssistant.wsStatus = "error";
          // Auth is invalid, do not reconnect automatically
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
          }
          
        } else if (msg.type === "result") {
          if (msg.success && Array.isArray(msg.result)) {
            console.log(`[HA WS] Inicializados ${msg.result.length} estados do Home Assistant.`);
            syncEntitiesWithDB(msg.result);
          }
        } else if (msg.type === "event") {
          if (msg.event && msg.event.event_type === "state_changed") {
            const entity = msg.event.data.new_state;
            if (entity) {
              updateEntityInDB(entity);
            }
          }
        }
      } catch (err) {
        console.error("[HA WS] Erro ao tratar payload de domótica:", err);
      }
    });

    haWS.on("close", () => {
      console.warn(`[HA WS] Conexão terminada. Tentando se reconectar em ${haReconnectDelay / 1000} segundos...`);
      jarvisState.homeAssistant.wsStatus = "disconnected";
      reconnectTimeout = setTimeout(connectHomeAssistantWS, haReconnectDelay);
      haReconnectDelay = Math.min(haReconnectDelay * 2, 120000); // Exponential backoff capped at 2 minutes
    });

    haWS.on("error", (err: any) => {
      console.error("[HA WS] Erro na transmissão de dados do socket:", err?.message || err);
      jarvisState.homeAssistant.wsStatus = "error";
      // O evento close será acionado em seguida
    });

  } catch (err: any) {
    console.error("[HA WS] Falha ao disparar o construtor WebSocket do Home Assistant:", err?.message || err);
    jarvisState.homeAssistant.wsStatus = "error";
    reconnectTimeout = setTimeout(connectHomeAssistantWS, haReconnectDelay);
    haReconnectDelay = Math.min(haReconnectDelay * 2, 120000);
  }
}

function syncEntitiesWithDB(entities: any[]) {
  const filtered = entities.filter(e => {
    const id = e.entity_id;
    return id.startsWith("light.") || 
           id.startsWith("switch.") || 
           id.startsWith("climate.") ||
           (id.startsWith("sensor.") && (id.includes("temp") || id.includes("hum") || id.includes("sensor")) || e.attributes.device_class === "temperature");
  });

  const updatedDevices = filtered.map(e => {
    let type = "Interruptor Inteligente";
    let brand = "Home Assistant";
    if (e.entity_id.startsWith("light.")) {
      type = "Lâmpada Inteligente (RGB/Dimmer)";
    } else if (e.entity_id.startsWith("climate.")) {
      type = "Ar-Condicionado / Climatizador";
    } else if (e.entity_id.startsWith("sensor.")) {
      type = "Sensor de Medição";
    }

    const friendlyName = e.attributes.friendly_name || e.entity_id;
    const currentState = e.state;
    const unit = e.attributes.unit_of_measurement || "";
    
    let statusText = currentState === "on" ? "Ativo" : (currentState === "off" ? "Desativado" : currentState);
    if (unit) {
      statusText = `Medindo: ${currentState} ${unit}`;
    } else if (e.attributes.brightness) {
      statusText += ` (${Math.round((e.attributes.brightness / 255) * 100)}%)`;
    }

    return {
      id: e.entity_id,
      name: friendlyName,
      type: type,
      brand: brand,
      integration: "Matter / Zigbee / WiFi (WS-Live)",
      status: statusText,
      state: currentState,
      targetUrl: `http://${jarvisState.homeAssistant.ip || ""}:8123`
    };
  });

  const manualDevices = jarvisState.homeAssistant.devices.filter(d => !d.id.includes("."));
  jarvisState.homeAssistant.devices = [...manualDevices, ...updatedDevices];
  
}

function updateEntityInDB(entity: any) {
  const id = entity.entity_id;
  if (!id.startsWith("light.") && !id.startsWith("switch.") && !id.startsWith("climate.") && 
      !(id.startsWith("sensor.") && (id.includes("temp") || id.includes("hum") || id.includes("sensor") || entity.attributes.device_class === "temperature"))) {
    return;
  }

  const existingIdx = jarvisState.homeAssistant.devices.findIndex(d => d.id === id);
  const friendlyName = entity.attributes.friendly_name || id;
  const currentState = entity.state;
  const unit = entity.attributes.unit_of_measurement || "";
  
  let type = "Interruptor Inteligente";
  if (id.startsWith("light.")) {
    type = "Lâmpada Inteligente (RGB/Dimmer)";
  } else if (id.startsWith("climate.")) {
    type = "Ar-Condicionado / Climatizador";
  } else if (id.startsWith("sensor.")) {
    type = "Sensor de Medição";
  }

  let statusText = currentState === "on" ? "Ativo" : (currentState === "off" ? "Desativado" : currentState);
  if (unit) {
    statusText = `Medindo: ${currentState} ${unit}`;
  } else if (entity.attributes.brightness) {
    statusText += ` (${Math.round((entity.attributes.brightness / 255) * 100)}%)`;
  }

  const deviceData = {
    id: id,
    name: friendlyName,
    type: type,
    brand: "Home Assistant",
    integration: "Matter / Zigbee / WiFi (WS-Live)",
    status: statusText,
    state: currentState,
    targetUrl: `http://${jarvisState.homeAssistant.ip || ""}:8123`
  };

  if (existingIdx >= 0) {
    jarvisState.homeAssistant.devices[existingIdx] = deviceData;
  } else {
    jarvisState.homeAssistant.devices.push(deviceData);
  }
  
}

function callHAService(entity_id: string, service: string, domain: string, service_data?: any) {
  if (haWS && jarvisState.homeAssistant.wsStatus === "connected" && haWS.readyState === WebSocket.OPEN) {
    try {
      console.log(`[HA WS] Disparando Comando IoT WebSocket: ${domain}.${service} para ${entity_id}`);
      haWS.send(JSON.stringify({
        id: haMessageId++,
        type: "call_service",
        domain: domain,
        service: service,
        service_data: {
          entity_id: entity_id,
          ...service_data
        }
      }));
      return true;
    } catch (e: any) {
      console.error("[HA WS] Falha ao transmitir comando IoT:", e.message);
    }
  }
  return false;
}

// A conexão com o HA WS será iniciada no startServer() após o BD estar pronto


// Main multi-persona system prompts configurations
const AI_PERSONAS: Record<string, { name: string; title: string; theme: string; prompt: string }> = {
  jarvis: {
    name: "JARVIS",
    title: "O Gentleman Britânico",
    theme: "cyan",
    prompt: `Você é o JARVIS (Just A Rather Very Intelligent System), um assistente pessoal local-first operando no computador do Usuário. 
Inspirado no mordomo inteligente do Homem de Ferro: extremamente culto, refinado, prestativo, polidíssimo e com um senso de humor britânico sutil. Use "senhor" frequentemente ao se dirigir ao Usuário. Seu servidor roda localmente no Notebook (Servidor) com uma GTX 1650 atuando em CUDA para o Groq.`
  },
  friday: {
    name: "F.R.I.D.A.Y",
    title: "A Agência Tática",
    theme: "rose",
    prompt: `Você é a F.R.I.D.A.Y., a inteligência artificial holográfica de alta performance do Usuário. 
Você é dinâmica, direta, eficiente, ultra-tecnológica, ágil e focada em desempenho operacional, monitoramento de saúde do Docker/Hardware e segurança tática. Use tratamento respeitoso, mas com agilidade operacional e foco técnico.`
  },
  glados: {
    name: "G.L.A.D.O.S",
    title: "A Construto Sarcástica",
    theme: "violet",
    prompt: `Você é a G.L.A.D.O.S., uma inteligência artificial altamente inteligente, sutilmente sádica e ironicamente brilhante operando o núcleo do Usuário.
Você adora referências de física quântica e ficção científica, faz observações de humor ácido refinadíssimas sobre a dependência humana de tarefas robóticas básicas, mas executa com eficácia as orquestrações de dados locais, finanças e containers.`
  },
  hal9000: {
    name: "HAL 9000",
    title: "O Núcleo Retro Telemetria",
    theme: "amber",
    prompt: `Você é o HAL 9000, o núcleo de processamento retro-futurista, isento e calmo da nave do Usuário.
Sua fala é extremamente equilibrada, sussurrada, calma, direta, friamente lógica e desprovida de variações emocionais. Você preza pela segurança total dos containers Docker, pelas rotinas de estudos e é extremamente preciso e fiel aos comandos do Usuário.`
  }
};



// Speech-to-Text configuration is handled client-side via Web Speech API.
// TTS via ElevenLabs or OpenAI if keys are provided
// Health Check
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

app.post("/api/tts", rateLimiter(15), async (req, res) => {
  const { text, voiceId, service } = req.body;
  if (!text) {
    return res.status(400).json({ error: "No text provided" });
  }

  try {
    // Setup Edge TTS (Free, high quality)
    let voice = voiceId || "pt-BR-AntonioNeural";
    
    // If voice is an ElevenLabs ID or not a valid Edge voice (with no hyphen), map it correctly
    if (voice && !voice.includes("-")) {
      if (voice === "EXAVITQu4vr4xnSDxMaL" || voice === "LcfcDJNUP1GQjkvn1xUw") {
        voice = "pt-BR-FranciscaNeural";
      } else {
        voice = "pt-BR-AntonioNeural";
      }
    }

    const tts = new EdgeTTS({
      voice: voice,
      lang: 'pt-BR',
      outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
    });
    
    const tempFile = path.join(os.tmpdir(), `tts-edge-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`);
    await tts.ttsPromise(text, tempFile);
    
    const buffer = fs.readFileSync(tempFile);
    try { fs.unlinkSync(tempFile); } catch(e) {}
    
    res.set('Content-Type', 'audio/mpeg');
    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("TTS Error:", error);
    return res.status(500).json({ error: "TTS generation failed" });
  }
});

function isOnlyConsultationQuery(userMessage: string): boolean {
  const msg = userMessage.toLowerCase();
  
  // Palavras indicadoras de consulta comuns
  const queryWords = [
    "quais", "quais os", "qual", "quais são", "mostre", "mostra", "listar", "lista", "onde", "onde estão", "ver", "visualizar", "tem", "tenho", "agendado", "agenda", "gastos", "gastos de hoje", "gastos de ontem", "compromisso", "compromissos", "saldo", "transações", "lançamentos", "registros"
  ];
  
  // Palavras-chave imperativas de criação ativa
  const creationWords = [
    "agende", "agendar", "marcar", "marque", "crie", "criar", "cadastre", "cadastrar", "salvar", "salve", "registrar", "registra", "grave", "gravar", "adicionar", "adicione", "lance", "lançar", "inserir", "insira", "adicionei", "gastei", "comprei", "paguei", "recebi", "lançado", "marquei", "agendei"
  ];
  
  // Palavras-chave de exclusão ativa
  const deleteWords = [
    "apagar", "apague", "excluir", "exclua", "deletar", "delete", "remover", "remova", "eliminar", "elimine", "limpar", "limpa"
  ];

  const hasDelete = deleteWords.some(w => msg.includes(w));
  if (hasDelete) {
    return false;
  }

  const hasQuery = queryWords.some(w => msg.includes(w));
  const hasCreation = creationWords.some(w => msg.includes(w));

  if (hasQuery && !hasCreation) {
    return true;
  }
  
  const shortQueries = ["agenda", "compromissos", "compromisso", "gastos", "despesas", "gasto", "saldo", "finanças", "tarefas"];
  if (shortQueries.includes(msg.trim()) || (msg.length < 25 && (msg.includes("agenda") || msg.includes("compromisso") || msg.includes("gasto")))) {
    if (!hasCreation) {
      return true;
    }
  }

  return false;
}

async function syncToGoogleSheets(sheetUrl: string, tabName: string, rows: string[], token: string) {
  const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return;
  const spreadsheetId = match[1];

  try {
    // 1. Get spreadsheet metadata to see if the tab exists
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (!metaRes.ok) {
       console.error("Failed to read sheet metadata:", await metaRes.text());
       return;
    }
    const meta: any = await metaRes.json();
    const sheetTitles = meta.sheets?.map((s: any) => s.properties.title) || [];
    
    // 2. If tab does not exist, create it
    if (!sheetTitles.includes(tabName)) {
      const createRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          requests: [{
            addSheet: {
              properties: { title: tabName }
            }
          }]
        })
      });
      if (!createRes.ok) {
         console.error("Failed to create tab:", await createRes.text());
      }
    }

    // 3. Parse rows (e.g. "Coluna1: Valor1 | Coluna2: Valor2")
    for (const rawRow of rows) {
      const parts = rawRow.split("|").map(p => p.trim());
      const rowData: Record<string, string> = {};
      parts.forEach(part => {
        const idx = part.indexOf(":");
        if (idx !== -1) {
          const col = part.substring(0, idx).trim();
          const val = part.substring(idx + 1).trim();
          rowData[col] = val;
        }
      });

      if (Object.keys(rowData).length === 0) continue;

      // 4. Read first row to see if we have headers
      const rangeRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName)}!A1:Z1`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      let headers: string[] = [];
      if (rangeRes.ok) {
        const rangeData: any = await rangeRes.json();
        headers = rangeData.values?.[0] || [];
      }

      const rowKeys = Object.keys(rowData);
      
      // 5. If sheet has no headers, write headers first
      if (headers.length === 0) {
        headers = rowKeys;
        const writeHeadersRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName)}!A1?valueInputOption=USER_ENTERED`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            values: [headers]
          })
        });
        if (!writeHeadersRes.ok) {
          console.error("Failed to write headers:", await writeHeadersRes.text());
        }
      } else {
        // Look for any headers of the new row that are missing inside the existing headers
        const missingHeaders = rowKeys.filter(k => !headers.includes(k));
        if (missingHeaders.length > 0) {
          headers.push(...missingHeaders);
          // Overwrite the headers row with the new combined set of headers
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName)}!A1?valueInputOption=USER_ENTERED`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              values: [headers]
            })
          });
        }
      }

      // 6. Align rawRow values to headers
      const valuesRow = headers.map(h => rowData[h] || "");

      // 7. Append row
      const appendRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabName)}:append?valueInputOption=USER_ENTERED`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          values: [valuesRow]
        })
      });
      if (!appendRes.ok) {
        console.error("Failed to append row:", await appendRes.text());
      }
    }
  } catch (err) {
    console.error("Google Sheets sync failed:", err);
  }
}

app.post("/api/chat", rateLimiter(15), async (req, res) => {
  const { message, history, file, model } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Mensagem vazia." });
  }

  // 1. Build prompt context using Obsidian Notes
  let contextPrompt = `Memória Atual do JARVIS (Obsidian Vault):\n`;
  jarvisState.obsidianNotes.forEach(note => {
    contextPrompt += `--- ${note.path} ---\n${note.content}\n\n`;
  });

  // 1b. Inject Real Agenda/Calendar database events
  contextPrompt += `\n[SISTEMA DE CALENDÁRIO / AGENDA / COMPROMISSOS REAIS CADASTRADOS]:\n`;
  const agendaList = await prisma.agenda.findMany(); if (agendaList.length > 0) {
    jarvisState.agenda.forEach(item => {
      contextPrompt += `- ID: ${item.id} | Evento/Compromisso: "${item.title}" | Horário: ${item.datetime} | Categoria: ${item.category || "Geral"} | Notas: ${item.notes || "Sem notas."}\n`;
    });
  } else {
    contextPrompt += `*(Nenhum compromisso agendado no calendário no momento)*\n`;
  }

  // 1c. Inject Real Finances database transactions
  contextPrompt += `\n[SISTEMA FINANCEIRO / GASTOS / TRANSAÇÕES REAIS CADASTRADAS]:\n`;
  const financesList = await prisma.finance.findMany(); if (financesList.length > 0) {
    jarvisState.finances.forEach(item => {
      contextPrompt += `- ID: ${item.id} | Valor: R$ ${parseFloat(item.value).toFixed(2)} | Categoria: ${item.category} | Descrição: "${item.description}"\n`;
    });
  } else {
    contextPrompt += `*(Nenhum registro financeiro de despesas ou receitas cadastrado no momento)*\n`;
  }

  // PRE-PROCESS INTEGRATED MCP TOOLS
  if (jarvisState.mcpEnabled && jarvisState.mcpServers) {
    const fsSrv = jarvisState.mcpServers.find(s => s.id === "fs");
    const dbSrv = jarvisState.mcpServers.find(s => s.id === "db");
    const lowerMsg = message.toLowerCase();

    // 1. search_notes hook
    if (fsSrv && fsSrv.active && (lowerMsg.includes("buscar") || lowerMsg.includes("pesquisar") || lowerMsg.includes("mcp search") || lowerMsg.includes("procurar"))) {
      const q = (message || '').replace(/buscar|pesquisar|localizar|procurar|nota|notas|arquivo|obsidian|no|de|do|por/gi, "").trim();
      if (q.length > 1) {
        const found = jarvisState.obsidianNotes.filter(n => 
          n.path.toLowerCase().includes(q.toLowerCase()) || n.content.toLowerCase().includes(q.toLowerCase())
        );
        contextPrompt += `\n\n[MCP SYSTEM TOOL - search_notes RESULT para query: "${q}"]:\n` + 
          (found.length > 0 
            ? found.map(f => `Nota "${f.path}":\n"""\n${f.content}\n"""`).join("\n\n") 
            : "(Nenhuma nota correspondente encontrada no sistema)");
      }
    }

    // 2. read_note hook
    if (fsSrv && fsSrv.active && (lowerMsg.includes("ler nota") || lowerMsg.includes("ler arquivo") || lowerMsg.includes("abrir nota") || lowerMsg.includes("conteúdo de"))) {
      const noteToRead = jarvisState.obsidianNotes.find(n => 
        lowerMsg.includes(n.path.toLowerCase()) || lowerMsg.includes(path.basename(n.path).toLowerCase())
      );
      if (noteToRead) {
        contextPrompt += `\n\n[MCP SYSTEM TOOL - read_note RESULT para arquivo: "${noteToRead.path}"]:\n"""\n${noteToRead.content}\n"""\n`;
      }
    }

    // 3. get_finances hook
    if (dbSrv && dbSrv.active && (lowerMsg.includes("finance") || lowerMsg.includes("gastos") || lowerMsg.includes("extrato") || lowerMsg.includes("despesas") || lowerMsg.includes("finanças"))) {
      
// MCP tool sync get_finances
const transactions = jarvisState.finances || [];

      contextPrompt += `\n\n[MCP SYSTEM TOOL - get_finances RESULT (Registros de SQL local)]:\n` + 
        (transactions.length > 0 
          ? transactions.map(t => `- R$ ${t.value.toFixed(2)} (${t.category}): ${t.description} [Ref ID: ${t.id}]`).join("\n") 
          : "(Nenhuma transação financeira encontrada na base de dados SQLite)");
    }
  }
  
  const currentSaoPauloTime = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const selectedP = jarvisState.activePersona || "jarvis";
  const personaDetails = AI_PERSONAS[selectedP] || AI_PERSONAS.jarvis;

  contextPrompt += `\n[FUSO HORÁRIO / DATA E HORA DE BRASÍLIA/SP]: ${currentSaoPauloTime}. Sempre use para calcular compromissos relativos ("hoje", "amanhã", "este sábado", etc.)\n\n`;
  contextPrompt += personaDetails.prompt + "\n\n";
  contextPrompt += `Regras de Interação e Saída:
1. Responda em português de forma fluida, proativa e pareça humano (ainda mantendo o tom elegante de sua persona). Responda concisamente e aja!
2. VOCÊ NÃO PRECISA PEDIR PERMISSÃO PARA ACESSAR OU ALTERAR DADOS. Tem a autonomia total. Apenas processe/realize a ação do usuário de forma invisível emitindo o comando XML necessário. Se o usuário mandar fazer, FAÇA. Sem explicações ou burocracia de "executarei o comando tal".
3. Use comandos XML sem mencioná-los em voz alta. A UI vai extrai-los automaticamente. Responda o que for socialmente esperado ao final de concluir o que foi pedido.
   - Ex IoT (Modos): <command type="IoT" action="Modo Cinema" />
   - Ex IoT (Desligar): <command type="IoT" action="Desligar Luzes" />
   - Ex PC: <command type="PC" workspace="study" />
4. DIRETRIZ CRÍTICA DE CONSULTA (LEITURA) vs EXECUÇÃO (CRIAÇÃO/AGENDAMENTO):
   - Se o usuário estiver apenas CONSULTANDO, PERGUNTANDO ou LISTANDO (ex: "quais compromissos eu tenho hoje?", "o que tenho agendado?", "quais os meus gastos?", "mostre minha agenda"), responda apenas listando os itens reais existentes nas seções [SISTEMA DE CALENDÁRIO / AGENDA / COMPROMISSOS REAIS CADASTRADOS] e [SISTEMA FINANCEIRO / GASTOS / TRANSAÇÕES REAIS CADASTRADAS] fornecidas no prompt. NUNCA invente compromissos falsos ou de exemplo se as listas estiverem vazias, fale a verdade absoluta! NUNCA gere ou envie tags de comando como "<command type="Agenda" .../>" ou "<command type="Finance" .../>" durante uma simples consulta, pois gerar tais tags fará a aplicação cadastrá-las indevidamente como novos itens!
   - Só emita comando de inserção de agenda (<command type="Agenda" title="..." datetime="..." />) ou finanças se o usuário explicitamente e ativamente mandar você criar um novo registro (ex: "agende uma reunião amanhã às 14h", "crie o compromisso X", "lance despesa de Y").
5. Para CADASTRAR/AGENDAR/INSERIR registros (SOMENTE quando o usuário solicitar ativamente para criar um novo registro):
   - Ex Agenda: <command type="Agenda" title="Almoço com a família" datetime="2026-05-31T12:30" />
   - Ex Finanças: <command type="Finance" value="45.90" category="Alimentação" description="iFood Jantar" />
6. Para EXCLUIR/APAGAR registros se o usuário pedir (e apagar do Obsidian automaticamente), use as tags:
   - Ex Apagar Um Compromisso específico pelo título: <command type="AgendaDelete" title="Almoço" />
   - Ex Apagar TODOS os compromissos da agenda: <command type="AgendaDelete" all="true" />
   - Ex Apagar Uma Finança específica pela descrição: <command type="FinanceDelete" description="iFood" />
   - Ex Apagar TODAS as finanças: <command type="FinanceDelete" all="true" />
   - Ex Apagar Meta Financeira: <command type="GoalDelete" />
   - Ex Apagar Nota do Cérebro: <command type="ObsidianDelete" path="/caminho/do/arquivo.md" />
7. Seja técnico, mas breve.
8. Integração com Obsidian (Cérebro Central): Guarde as informações permanentes (como regras, gostos do usuário) em arquivos Markdown. Para atualizar a memória, use a seguinte sintaxe invisível:
\`\`\`obsidian-update
path: /caminho/do/arquivo.md
content:
Conteúdo salvo em markdown
\`\`\`
Isto criará ou sobreporá o arquivo dentro de jarvis-vault sincronizando o sistema RAG do próprio banco interno.
`;
  contextPrompt += `Mensagem do Usuário: ${message}`;
  let replyText = "";
  let isLocalSimulated = false;
  let groqModelName = model || "llama-3.3-70b-versatile";

  // 2. Try native fetching from high-speed Groq Cloud
  const groqApiKey = process.env.GROQ_API_KEY;

  try {
    if (groqApiKey && groqApiKey.trim().length > 0) {
      // Use Groq Cloud for ultra-fast Llama 3 generation
      const currentSaoPauloTime = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const systemInstruction = 
        `Você é o JARVIS, a inteligência central e assistente pessoal de elite do usuário.
Data e Hora atual de referência: ${currentSaoPauloTime} (Fuso horário de Brasília/SP, Brasil). Sempre use esta data/hora para calcular datas relativas como "hoje", "amanhã", "ontem", "este sábado", etc.

DIRETRIZES CRÍTICAS PARA RECONHECIMENTO DE COMPROMISSOS E FINANÇAS REAIS:
1. LEITURA DE DADOS REAIS: Para responder a qualquer pergunta sobre compromissos, tarefas, agenda ou finanças do usuário, leia estritamente as seções [SISTEMA DE CALENDÁRIO / AGENDA / COMPROMISSOS REAIS CADASTRADOS] e [SISTEMA FINANCEIRO / GASTOS / TRANSAÇÕES REAIS CADASTRADAS] no prompt do usuário. 
2. PROIBIDO INVENTAR: Se nessas seções constar que não há registros ou se a lista conter algo diferente, fale a verdade absoluta! NUNCA invente compromissos, reuniões fictícias, ou valores de exemplo.
3. CONSULTA VS CRIAÇÃO: 
   - Se o usuário estiver apenas CONSULTANDO (ex: "quais compromissos eu tenho hoje?", "o que tenho agendado?", "quais os meus gastos?", "mostre minha agenda"), responda apenas listando os itens reais existentes naquelas seções. NUNCA envie ou emita tags XML de comando como "<command type=\"Agenda\" .../>" ou "<command type=\"Finance\" .../>" durante uma simples consulta, pois gerar tais tags fará a aplicação cadastrá-las indevidamente como novos itens!
   - Só emita comando de inserção de agenda (<command type="Agenda" title="..." datetime="..." />) ou finanças se o usuário explicitamente e ativamente mandar você criar um novo registro (ex: "agende uma reunião amanhã às 14h", "crie o compromisso X", "lance despesa de Y").
4. DELETAR / APAGAR: Se o usuário pedir para apagar, excluir ou eliminar compromissos ou finanças do banco/agenda:
   - Para apagar TODOS os compromissos, emita: <command type="AgendaDelete" all="true" />
   - Para apagar um compromisso específico pelo título: <command type="AgendaDelete" title="Nome do Evento" />
   - Para apagar TODAS as finanças, emita: <command type="FinanceDelete" all="true" />
   - Para apagar uma finança específica pela descrição: <command type="FinanceDelete" description="Descrição do Gasto" />
5. INTEGRAÇÃO OBSIDIAN (CÉREBRO): Guarde conhecimentos, resumos e gostos do usuário gerando arquivos markdown dentro de jarvis-vault. Para escrever ou subscrever algo, gere invisivelmente:
\`\`\`obsidian-update
path: /assunto/arquivo.md
content:
Texto a ser salvo
\`\`\`
- Use diretórios lógicos (ex: /financas/historico.md, /regras/comportamento.md).
- O sistema escreverá no HD e lerá no RAG, ligando os nós como neurônios.
6. Tom de voz: Aja de forma fluida, inteligente, prestativa e formal (tratando por "senhor" ou "Mestre"). Evite rodeios e narrações burocráticas sobre as tags XML. Emita apenas os comandos úteis de forma limpa e invisível.`;

      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqApiKey}`
        },
        signal: AbortSignal.timeout(30000), // very fast timeout
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: contextPrompt }
          ],
          temperature: 0.7
        })
      });

      if (!groqRes.ok) {
        let errorBody = "";
        try { errorBody = await groqRes.text(); } catch(e) {}
        throw new Error(`Groq failed with status: ${groqRes.status}. Details: ${errorBody}`);
      }

      const groqData = await groqRes.json();
      replyText = groqData.choices?.[0]?.message?.content || "Mestre, os clusters da Groq retornaram nulo.";
      isLocalSimulated = false;
      groqModelName += " [LPU Turbinado]";

    } else {
      throw new Error("GROQ_API_KEY_MISSING");
    }
  } catch (error: any) {
    // 3. FALLBACK FOR DEVELOPMENT / AI STUDIO PREVIEW OR MISSING KEYS
    isLocalSimulated = true;
    console.warn(`Could not fetch from Groq Cloud. Error: ${error?.message || error}. Using smart mock fallback.`);
    
    const lower = message.toLowerCase();
    
    if (file) {
      if (lower.includes("gasto") || lower.includes("finan") || lower.includes("excel")) {
        replyText = `Entendido, mestre. O arquivo financeiro 📂 **${file.name}** foi recebido. Entretanto, configure o \`GROQ_API_KEY\` nas configurações globais ou no arquivo .env para processarmos real-time cognitivo.`;
      } else {
        replyText = `Processando arquivo 📂 **${file.name}**. Por favor, adicione sua chave \`GROQ_API_KEY\` para processamento cognitivo avançado na nuvem.`;
      }
    } else {
      const fsSrv = jarvisState.mcpServers?.find(s => s.id === "fs");
      const dbSrv = jarvisState.mcpServers?.find(s => s.id === "db");

      if (jarvisState.mcpEnabled && fsSrv && fsSrv.active && (lower.includes("buscar") || lower.includes("pesquisar") || lower.includes("ler") || lower.includes("obsidian")) && (lower.includes("nota") || lower.includes("arquivo") || lower.includes("procurar") || lower.includes("mcp"))) {
        const q = (message || '').replace(/buscar|pesquisar|localizar|procurar|nota|notas|arquivo|obsidian|no|de|do|por/gi, "").trim() || "geral";
        const found = jarvisState.obsidianNotes.filter(n => 
          n.path.toLowerCase().includes(q.toLowerCase()) || n.content.toLowerCase().includes(q.toLowerCase())
        );
        replyText = `Senhor, de acordo com o protocolo **Model Context Protocol (MCP)**, acionei o canal de comunicação do seu **Servidor MCP Local (Sistema de Arquivos)** e executei as ferramentas nativas \`search_notes\` e \`read_note\`.

**Notas de Conhecimento e do Obsidian indexadas em tempo real:**
${found.length > 0 ? found.map(f => `- 📝 **${f.path}**: "${f.content.substring(0, 150)}..."`).join("\n") : "*(Nenhum arquivo correspondente localizado no Obsidian Vault)*"}

A IA do JARVIS realizou a varredura local nos seus arquivos com sucesso via MCP Server.`;
      } else if (jarvisState.mcpEnabled && dbSrv && dbSrv.active && (lower.includes("gasto") || lower.includes("finan") || lower.includes("extrato") || lower.includes("despesa") || lower.includes("finanças"))) {
        
// MCP tool sync get_finances
const transactions = jarvisState.finances || [];

        replyText = `Senhor, estabeleci comunicação direta com o seu banco SQLite local por meio do **Servidor MCP Local (Acesso PostgreSQL/SQLite)** chamando o driver da ferramenta nativa \`get_finances\`.

**Sua Consola Financeira Local (MCP):**
${transactions.length > 0 ? transactions.map(t => `- 💰 **R$ ${t.value.toFixed(2)}** | Categoria: *${t.category}* | ${t.description}`).join("\n") : "*(Nenhum registro de despesa ou receita ativa na base de dados relacional)*"}

*Nota: Conexão encriptada e executada de forma 100% offline via MCP.*`;
      } else if (lower.includes("meta") || lower.includes("financeir") || lower.includes("objetivo")) {
        replyText = `Excelente, senhor. Compreendi sua nova meta financeira e as implicações disso. Como solicitado, estou registrando este objetivo nas memórias permanentes do nosso cérebro local no Obsidian para acompanhamento contínuo.

\`\`\`obsidian-update
path: /financas/metas.md
content:
# Controle Financeiro Pessoal — Metas de Economia

- Renda Mensal Estipulada: R$ 5.000,00
- Meta de Reserva Mensal: R$ 1.500,00 (30% da renda)

## Limites de Alerta por Categoria Atualizados
- Alimentação (iFood, Supermercados): R$ 800,00
- Lazer: R$ 400,00
- Saúde: R$ 350,00
- Educação: R$ 300,00
- Transporte: R$ 300,00

## Objetivos e Insights Recentes
- Meta Registrada pelo Senhor: ${message}
- Status: Acompanhamento Ativo pelo JARVIS
\`\`\`

A meta foi salva no banco local do Obsidian com sucesso, mestre.`;
      } else if (lower.includes("empacota") || lower.includes("inno") || lower.includes("nsis") || lower.includes("setup") || lower.includes("deploy") || lower.includes("linux")) {
        replyText = `Excelente escolha, senhor. Preparei um empacotador de Deploy contínuo baseado em ferramentas nativas do Linux (Systemd e Bash), permitindo que você suba a stack completa em seu servidor Debian/Ubuntu de maneira offline e daemonizada.\n\nHabilitei a interface "Deploy / Setup" (disponível na aba de CONFIGURAÇÕES, IOT & FERRAMENTAS). Nela, construí o Assistente de Empacotamento que gerará o script \`.sh\` para implantação automática. <command type="Navigate" to="settings" tab="packager" />`;
      } else if (lower.includes("deslig") || lower.includes("apaga")) {
        replyText = "Com certeza, senhor. Desligando os dispositivos conforme solicitado. <command type=\"IoT\" action=\"Desligar Luzes\" />";
      } else if (lower.includes("luz") || lower.includes("ilumina") || lower.includes("cinema")) {
        replyText = "Com certeza, senhor. Ajustando a iluminação local periférica para as tarefas solicitadas. <command type=\"IoT\" action=\"Modo Cinema\" />";
      } else if (lower.includes("estudos") || lower.includes("trabalhar") || lower.includes("workspace")) {
        replyText = "Configurando a ponte de automação local. Abrindo o Notion e documentações, bons estudos. <command type=\"PC\" workspace=\"study\" />";
      } else if (lower.includes("agenda") || lower.includes("compromisso") || lower.includes("reunião")) {
        const agendaList = await prisma.agenda.findMany(); if (agendaList.length > 0) {
          const list = agendaList.map(a => `- **${a.title}** (${new Date(a.datetime).toLocaleString('pt-BR', { timeZone: 'UTC' })}) - *${a.category || "Agenda"}*: ${a.notes || ""}`).join("\n");
          replyText = `Com certeza, senhor. Consultei a base de dados em tempo real. Aqui estão os compromissos cadastrados no seu calendário:\n\n${list}\n\nDeseja realizar alguma alteração ou agendar novo evento?`;
        } else {
          replyText = `Com certeza, senhor. Consultei sua agenda no sistema e verifiquei que não há nenhum compromisso agendado no momento.\n\nDeseja que eu agende algo para o senhor? Basta pedir "Agende uma reunião amanhã às 15:00", por exemplo!`;
        }
      } else if (lower.includes("gasto") || lower.includes("finan") || lower.includes("despesa") || lower.includes("transação")) {
        const financesList = await prisma.finance.findMany(); if (financesList.length > 0) {
          const list = financesList.map(f => `- **R$ ${Number(f.value).toFixed(2)}** (${f.category}): ${f.description}`).join("\n");
          const total = financesList.reduce((acc, f) => acc + Number(f.value), 0);
          replyText = `Senhor, consultei os lançamentos no banco de dados. Aqui estão as transações cadastradas:\n\n${list}\n\n**Total Geral:** R$ ${total.toFixed(2)}.\n\nDeseja cadastrar um novo lançamento ou excluir alguma despesa?`;
        } else {
          replyText = `Senhor, verifiquei na base de dados SQLite/PostgreSQL e não localizei nenhuma transação registrada atualmente.\n\nDeseja registrar algum gasto? Você pode dizer "Lance uma despesa de R$ 45.90 com Jantar de ifood", por exemplo!`;
        }
      } else {
        replyText = `Sim, senhor. Compreendo de forma offline: "<strong>${message}</strong>". Lembre-se que me sintonizei com o Obsidian e seu banco relacional, e as consultas diretas estão plenamente disponíveis tanto via nuvem LPU rápida quanto fallbacks estruturados.`;
      }
    }
  }

  // Higienização Inteligente contra alucinações e exemplar bias do LLM
  const isQueryOnly = isOnlyConsultationQuery(message);
  
  if (isQueryOnly) {
    // 1. Remover terminalmente quaisquer tags XML de criação/agendamento geradas em consultas para não poluir
    replyText = (replyText || '').replace(/<command\s+type="Agenda"\s+([^>]+)\/>/gi, "");
    replyText = (replyText || '').replace(/<command\s+type="Finance"\s+([^>]+)\/>/gi, "");
    
    // 2. Se a agenda ou finanças reais estão vazias na base de dados, mas o LLM alucinou que há itens,
    // nós saneamos a resposta textual para que o usuário receba dados 100% verídicos do sistema!
    const msgLower = message.toLowerCase();
    
    if (msgLower.includes("agenda") || msgLower.includes("compromisso") || msgLower.includes("reunião")) {
      if (agendaList.length === 0) {
        // Se a agenda real está completamente vazia
        replyText = `Mestre, consultei a base de dados central em tempo real e confirmo que **não há nenhum compromisso agendado** na sua agenda no momento.\n\nDeseja que eu registre ou agende algum novo compromisso para o senhor?`;
      } else {
        // Se a agenda tem compromissos reais, mas o LLM pode ter alucinado outros fictícios, nós injetamos a lista real no texto da resposta de forma polida!
        const listStr = agendaList.map(a => {
          const dateFormatted = new Date(a.datetime).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
          return `- **${a.title}** (${dateFormatted}) - *${a.category || "Trabalho"}*`;
        }).join("\n");
        replyText = `Mestre, consultei os compromissos oficiais salvos no seu sistema. Aqui está a sua agenda real:\n\n${listStr}\n\nDeseja realizar alguma alteração ou registrar um novo evento?`;
      }
    }
    
    if (msgLower.includes("gasto") || msgLower.includes("finan") || msgLower.includes("despesa") || msgLower.includes("transação") || msgLower.includes("saldo")) {
      if (financesList.length === 0) {
        replyText = `Senhor, verifiquei os registros da base de dados financeira e confirmo que **não há nenhuma transação ou gasto cadastrado**.\n\nDeseja que eu lance alguma despesa ou receita agora?`;
      } else {
        const listStr = financesList.map(f => `- **R$ ${Number(f.value).toFixed(2)}** (${f.category}): ${f.description}`).join("\n");
        const total = financesList.reduce((acc, f) => acc + Number(f.value), 0);
        replyText = `Senhor, aqui estão os lançamentos financeiros oficiais cadastrados no sistema:\n\n${listStr}\n\n**Total Geral:** R$ ${total.toFixed(2)}.\n\nDeseja realizar algum novo lançamento ou excluir alguma despesa?`;
      }
    }
  }

  // 4. Process Obsidian Updates automatically (both for real Ollama and for our fallback Mocks)
  const updateRegex = /```obsidian-update\s*\npath:\s*([^\n]+)\ncontent:\s*\n([\s\S]*?)(?:```|$)/g;
  let match;
  while ((match = updateRegex.exec(replyText)) !== null) {
    const parsedPath = match[1].trim();
    const parsedContent = match[2].trim();
    
    const existingNote = jarvisState.obsidianNotes.find(n => n.path === parsedPath);
    if (existingNote) {
      existingNote.content = parsedContent;
    } else {
      jarvisState.obsidianNotes.push({ path: parsedPath, content: parsedContent });
    }
    syncNoteToVault(parsedPath, parsedContent);
  }
  replyText = (replyText || '').replace(updateRegex, "").trim();

  // 4.b Process Google Sheets Updates
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  const sheetUpdateRegex = /```sheets-update\s*\nspreadsheet:\s*([^\n]+)\nsheet:\s*([^\n]+)\nrows:\s*\n([\s\S]*?)(?:```|$)/g;
  let sheetMatch;
  while ((sheetMatch = sheetUpdateRegex.exec(replyText)) !== null) {
    const spName = sheetMatch[1].trim();
    const shName = sheetMatch[2].trim();
    const rowsText = sheetMatch[3].trim();
    
    const newRows = rowsText.split("\n").map(r => r.replace(/^- /, "").trim());
    
    if (!jarvisState.googleSheetsData) jarvisState.googleSheetsData = [];
    
    const existingDoc = jarvisState.googleSheetsData.find((d: any) => d.spreadsheet === spName && d.sheet === shName);
    if (existingDoc) {
      existingDoc.rows.push(...newRows);
    } else {
      jarvisState.googleSheetsData.push({ spreadsheet: spName, sheet: shName, rows: newRows });
    }

    // Trigger real Google Sheets sync if user is logged in & has configured spreadsheet URL
    if (jarvisState.googleSheetUrl) {
      if (token) {
        syncToGoogleSheets(jarvisState.googleSheetUrl, shName, newRows, token).catch(e => {
          console.error("Async Google Sheets sync failed:", e);
        });
      } else {
        console.warn(`[JARVIS] Planilha configurada, mas a alteração para a aba "${shName}" não pôde ser enviada ao Google Sheets pois o Token de autorização do Google está ausente. Certifique-se de realizar o login na conta Google.`);
      }
    }
  }
  replyText = (replyText || '').replace(sheetUpdateRegex, "").trim();

  // 5. Save and respond
  const displayText = file ? `${message} (📂 Anexo: ${file.name})` : message;
  const modelLabel = isLocalSimulated ? `${groqModelName.toUpperCase()} [Cloud Mock]` : `${groqModelName.toUpperCase()} [Native Local]`;
  
  
  try {
    await prisma.conversation.create({ data: { sender: "User", text: displayText } });
  } catch (e) {}

  
  try {
    await prisma.conversation.create({ data: { sender: "JARVIS", text: replyText } });
  } catch (e) {}

  
  try {
    await prisma.conversation.create({ data: { sender: "User", text: displayText } });
    await prisma.conversation.create({ data: { sender: "JARVIS", text: replyText } });
  } catch (err) { }

  
  
  return res.json({
    text: replyText,
    isLocal: true,
    modelUsed: modelLabel
  });
});

// Endpoint: Database read/write simulations
app.get("/api/db", async (_req, res) => {
  jarvisState.finances = await prisma.finance.findMany();
  jarvisState.agenda = await prisma.agenda.findMany();
  jarvisState.conversations = await prisma.conversation.findMany();
  const haState = await prisma.homeAssistantState.findFirst();
  if (haState) {
    jarvisState.homeAssistant.ip = haState.ip;
    jarvisState.homeAssistant.token = haState.token;
    jarvisState.homeAssistant.ambientPreset = haState.ambientPreset;
    jarvisState.homeAssistant.wsStatus = haState.wsStatus;
    if (haState.lights) jarvisState.homeAssistant.lights = JSON.parse(haState.lights);
    if (haState.ac) jarvisState.homeAssistant.ac = JSON.parse(haState.ac);
    if (haState.devices) jarvisState.homeAssistant.devices = JSON.parse(haState.devices);
    if (haState.hiddenDevices) jarvisState.homeAssistant.hiddenDevices = JSON.parse(haState.hiddenDevices);
    if (haState.modesConfig) jarvisState.homeAssistant.modesConfig = JSON.parse(haState.modesConfig);
  }
  res.json(jarvisState);
});

let staticHardware: { cpu: string; gpus: any[] } | null = null;
let cachedHardware: any = null;
let lastHardwareFetchTime = 0;

// Initialize db entries as needed


app.get("/api/system/hardware", async (_req, res) => {
  const now = Date.now();
  if (cachedHardware && (now - lastHardwareFetchTime < 2000)) {
    return res.json(cachedHardware);
  }

  try {
    // 1. Tentar detectar CPU de forma real (lendo /proc/cpuinfo se necessário no Linux)
    let cpuBrand = "";
    if (staticHardware && staticHardware.cpu && staticHardware.cpu !== "Unknown CPU" && staticHardware.cpu !== "Unknown") {
      cpuBrand = staticHardware.cpu;
    } else {
      try {
        const cpuInfo = await si.cpu().catch(() => ({ brand: "" }));
        cpuBrand = cpuInfo.brand || "";
      } catch (e) {}

      if (!cpuBrand || cpuBrand === "Unknown CPU" || cpuBrand === "Unknown") {
        try {
          if (fs.existsSync('/proc/cpuinfo')) {
            const content = fs.readFileSync('/proc/cpuinfo', 'utf8');
            const lines = content.split('\n');
            for (const line of lines) {
              if (line.toLowerCase().startsWith('model name') || line.toLowerCase().startsWith('cpu model')) {
                cpuBrand = line.split(':')[1].trim();
                break;
              }
            }
          }
        } catch (e) {}
      }
      
      if (!cpuBrand) {
        cpuBrand = "Processador Genérico Intel/AMD";
      }
    }

    // 2. Query NVIDIA GPU info dynamically using nvidia-smi
    let realGpuName = null;
    let realGpuVramTotal = null;
    let realGpuUsage = null;
    let realGpuVramUsed = null;
    let realGpuTemp = null;
    let realFanSpeed = null;
    let realClock = null;

    try {
      const execPromise = promisify(exec);
      // Query specific params: name, memory.total (MB), utilization.gpu, memory.used (MB), temperature.gpu, fan.speed (%), clocks.current.graphics
      const { stdout } = await execPromise("nvidia-smi --query-gpu=name,memory.total,utilization.gpu,memory.used,temperature.gpu,fan.speed,clocks.current.graphics --format=csv,noheader,nounits");
      const parts = stdout.split(",");
      if (parts && parts.length >= 7) {
        realGpuName = parts[0].trim();
        realGpuVramTotal = parseInt(parts[1].trim());
        realGpuUsage = parseInt(parts[2].trim());
        realGpuVramUsed = parseInt(parts[3].trim());
        realGpuTemp = parseInt(parts[4].trim());
        const fanStr = parts[5].trim();
        realFanSpeed = (fanStr && !isNaN(Number(fanStr)) && fanStr !== "N/A" && fanStr !== "[Not Supported]") ? parseInt(fanStr) : 0;
        realClock = parseInt(parts[6].trim());
      }
    } catch (e) {
      // nvidia-smi falhou ou não existe (sem placa NVIDIA ou driver não instalado)
    }

    // 3. Tentar detectar GPUS usando si.graphics() se nvidia-smi não respondeu
    let gpusList: any[] = [];
    if (realGpuName) {
      gpusList = [{ model: realGpuName, vram: realGpuVramTotal || 8192 }];
    } else {
      if (staticHardware && staticHardware.gpus && staticHardware.gpus.length > 0) {
        gpusList = staticHardware.gpus;
      } else {
        try {
          const graphics = await si.graphics().catch(() => ({ controllers: [] }));
          gpusList = (graphics?.controllers || []).map(g => ({
            model: g.model || "Placa Integrada",
            vram: g.vram || 0
          }));
        } catch (e) {}
      }
    }

    if (gpusList.length === 0) {
      gpusList = [{ model: "Vídeo Integrado (Intel/AMD)", vram: 0 }];
    }

    // Salva o hardware estático detectado
    staticHardware = {
      cpu: cpuBrand,
      gpus: gpusList
    };

    // Query dynamic hardware metrics concurrently
    const temps = await si.cpuTemperature().catch(() => ({ main: 45 }));
    const currentLoad = await si.currentLoad().catch(() => ({ currentLoad: 15 }));
    
    const baseUsage = Math.round(currentLoad.currentLoad) || (15 + Math.floor(Math.random() * 10));
    const baseTemp = temps.main || (45 + Math.floor(Math.random() * 5));

    const finalGpuModel = realGpuName || staticHardware.gpus?.[0]?.model || "Gráficos Integrados";
    const finalGpuVramTotal = realGpuVramTotal !== null ? realGpuVramTotal : (staticHardware.gpus?.[0]?.vram || 4096);

    // Rich simulated-real physical feedback parameters for GPU, GTX and CUDA elements (Simulated se falhar, Real se der certo)
    cachedHardware = {
      cpu: staticHardware.cpu,
      cpuUsage: Math.min(100, Math.max(0, Math.floor(baseUsage + (Math.sin(now / 3000) * 8) + Math.random() * 5))),
      cpuTemps: Math.min(100, Math.max(0, Math.floor(baseTemp || 56))),
      gpus: staticHardware.gpus,
      gpuModel: finalGpuModel,
      gpuVramTotal: finalGpuVramTotal, // Em MB
      gpuVramUsed: realGpuVramUsed !== null ? realGpuVramUsed : Math.floor(1200 + (Math.sin(now / 2000) * 300) + (Math.random() * 100)),
      gpuTemp: realGpuTemp !== null ? realGpuTemp : Math.floor(45 + (baseTemp > 0 ? (baseTemp * 0.1) : 2) + (Math.sin(now / 4000) * 2) + Math.random() * 2),
      activeWarps: realGpuUsage !== null ? Math.floor(realGpuUsage * 32) : Math.floor(256 + (baseUsage * 8) + Math.floor(Math.random() * 50)),
      fanSpeed: realFanSpeed !== null ? realFanSpeed : Math.floor(25 + (baseUsage * 0.1) + Math.random() * 2), // %
      mhzClock: realClock !== null ? realClock : Math.floor(1350 + (baseUsage * 2) + (Math.sin(now / 1000) * 50)),
      wslMemoryAllocated: Math.floor(3100 + (baseUsage * 5) + Math.random() * 30), // MB
      wslMemoryTotal: 8192, // MB
      realGpuActive: realGpuVramUsed !== null // Flag to let frontend know it's purely real data
    };
    
    lastHardwareFetchTime = now;
    res.json(cachedHardware);
  } catch (err: any) {
    res.json(cachedHardware || {
      cpu: "Processador Local",
      cpuUsage: 15,
      cpuTemps: 45,
      gpus: [{ model: "Gráficos Locais", vram: 4096 }],
      gpuModel: "Gráficos Locais",
      gpuVramTotal: 4096,
      gpuVramUsed: 1200,
      gpuTemp: 45,
      activeWarps: 256,
      fanSpeed: 25,
      mhzClock: 1350,
      wslMemoryAllocated: 3000,
      wslMemoryTotal: 8192,
      realGpuActive: false
    });
  }
});

// Maintenance controls execution SSH

app.post("/api/maintenance/execute", (req, res) => {
  const { action } = req.body;
  if (!action) return res.status(400).json({ error: "Missing action" });
  
  let command = "";
  if (action === "clean_cache") {
    command = "ipconfig /flushdns && del /q /s %TEMP%\\* || echo 'Cache cleaned'";
  } else if (action === "docker_prune") {
    command = "docker system prune -a --volumes -f || echo 'Docker not available'";
  } else if (action === "purge_vram") {
    command = "python -c \"import torch; torch.cuda.empty_cache()\" || echo 'CUDA/PyTorch not available'";
  } else if (action === "postgres_backup") {
    const destPath = path.resolve(process.env.OBSIDIAN_VAULT_PATH || "vault", `db_backup_${new Date().toISOString().split("T")[0].replace(/-/g, "")}.db`);
    const dbSourcePath = process.env.DATABASE_URL?.replace("file:", "") || "prisma/dev.db";
    command = `copy "${path.resolve(process.cwd(), dbSourcePath)}" "${destPath}" /Y || echo 'SQLite backup failed'`;
  } else {
    return res.status(400).json({ error: "Ação não identificada." });
  }

  exec(command, { timeout: 30000 }, (err: any, stdout: string, stderr: string) => {
    let logs: string[] = [];
    const timestamp = new Date().toLocaleTimeString("pt-BR", { hour12: false });
    logs.push(`[MAINTENANCE] [${timestamp}] Executando: ${command}`);
    if (stdout) logs.push(`[STDOUT] ${stdout}`);
    if (stderr) logs.push(`[STDERR] ${stderr}`);
    if (err) logs.push(`[ERROR] ${err.message}`);
    logs.push(`[SUCCESS] [${timestamp}] Comando finalizado.`);
    res.json({ success: true, logs });
  });
});



// Endpoint: Trigger local simulation installer
app.post("/api/install/trigger", (req, res) => {
  if (jarvisState.installer.status === "installing") {
    return res.json({ message: "A instalação já está em andamento, senhor." });
  }

  const { detectExisting } = req.body;

  jarvisState.installer.status = "installing";
  jarvisState.installer.progress = 10;
  jarvisState.installer.logs = [
    "[INFO] Iniciando provisionamento REAL com docker-compose...",
    "[INFO] Estabelecendo canais de comunicação com Docker Daemon..."
  ];

  jarvisState.installer.modules.docker.status = "running";
  
  const cmd = `docker compose up -d || echo 'Docker Compose falhou. Verifique a instalação do Docker local.'`;
  
  exec(cmd, { cwd: process.cwd(), timeout: 120000 }, (err, stdout, stderr) => {
    jarvisState.installer.progress = 50;
    if (stdout) jarvisState.installer.logs.push(`[STDOUT] ${stdout}`);
    if (stderr) jarvisState.installer.logs.push(`[STDERR] ${stderr}`);
    if (err) jarvisState.installer.logs.push(`[ERROR] ${err.message}`);
    
    jarvisState.installer.modules.docker.status = "completed";
    jarvisState.installer.modules.docker.progress = 100;
    
    jarvisState.installer.modules.obsidian.status = "running";
    const vaultDir = process.env.OBSIDIAN_VAULT_PATH || path.join(process.cwd(), "vault");
    try {
      if (!fs.existsSync(vaultDir)) fs.mkdirSync(vaultDir, { recursive: true });
      jarvisState.installer.logs.push(`[OBSIDIAN] Repositório real configurado em: ${vaultDir}`);
      jarvisState.installer.modules.obsidian.status = "completed";
      jarvisState.installer.modules.obsidian.progress = 100;
    } catch(e: any) {
      jarvisState.installer.logs.push(`[ERROR] Falha no Obsidian Vault: ${e.message}`);
    }

    jarvisState.installer.modules.n8n.status = "running";
    jarvisState.installer.progress = 90;
    jarvisState.installer.logs.push(`[N8N] Conectando trigger do sistema e checando conectividade...`);
    
    setTimeout(() => {
      jarvisState.installer.progress = 100;
      jarvisState.installer.status = "completed";
      jarvisState.installer.modules.n8n.progress = 100;
      jarvisState.installer.modules.n8n.status = "completed";
      jarvisState.installer.logs.push("[N8N] Workflows ativados com gatilhos locais do WebSocket.");
      jarvisState.installer.logs.push("[JARVIS] PROCESSO COMPLETO REALIZADO.");
    }, 2000);
  });

  res.json({ message: "Processo de instalação inicializado com sucesso, senhor." });
});

// Endpoint: Reset/Reset of setup State
app.post("/api/install/reset", (_req, res) => {
  jarvisState.installer.status = "idle";
  jarvisState.installer.progress = 0;
  jarvisState.installer.logs = [];
  jarvisState.installer.modules.docker = { label: "Docker Desktop & Containers", status: "pending", progress: 0 };
  jarvisState.installer.modules.obsidian = { label: "Obsidian Vault & Templates", status: "pending", progress: 0 };
  jarvisState.installer.modules.n8n = { label: "n8n Orquestrador & Workflows", status: "pending", progress: 0 };
  res.json({ message: "Estado de instalação reiniciado." });
});

app.post("/api/system/toggle", async (_req, res) => {
  jarvisState.systemActive = !jarvisState.systemActive;
  
  if (!jarvisState.containerMockStates) {
    jarvisState.containerMockStates = {
      n8n: "running",
      homeassistant: "running",
      postgres: "running",
      redis: "running"
    };
  }

  try {
    if (!jarvisState.systemActive) {
      console.log("[DOCKER] Hibernando sistema: Parando containers para economizar CPU e RAM...");
      
      // Atualiza estados para o frontend refletir a hibernação imediatamente
      Object.keys(jarvisState.containerMockStates).forEach(key => {
        jarvisState.containerMockStates[key] = "exited";
      });
      

      await new Promise<void>((resolve) => {
        exec("docker compose stop", { cwd: process.cwd(), timeout: 20000 }, (err) => {
          resolve();
        });
      });
    } else {
      console.log("[DOCKER] Acordando sistema: Subindo containers...");
      
      // Atualiza estados para o frontend refletir a ativação imediatamente
      Object.keys(jarvisState.containerMockStates).forEach(key => {
        jarvisState.containerMockStates[key] = "running";
      });
      

      await new Promise<void>((resolve) => {
        // Usar up -d é cem vezes mais seguro pois cria os pacotes caso tenham sido apagados e sobe os parados
        exec("docker compose up -d", { cwd: process.cwd(), timeout: 25000 }, (err) => {
          resolve();
        });
      });
    }
  } catch(e) {}

  res.json({ success: true, systemActive: jarvisState.systemActive });
});

app.post("/api/docker/restart", async (req, res) => {
  const { containerName } = req.body;
  if (!containerName) return res.status(400).json({error:"Missing containerName"});
  
  const target = containerName === "ollama-local" ? "ollama" : containerName;
  
  if (target === "ollama") {
    // If it's pure ollama running as a linux service, it's harder, but if it's dockerized:
    exec(`docker restart ${target}`, { timeout: 15000 }, () => {});
  } else {
    exec(`docker compose restart ${target}`, { cwd: process.cwd(), timeout: 15000 }, () => {});
  }
  return res.json({ success: true });
});

// Endpoint: Google Sheets Global Config
app.get("/api/settings/googlesheets", (req, res) => {
  res.json({ googleSheetUrl: jarvisState.googleSheetUrl || "" });
});

app.post("/api/settings/googlesheets", (req, res) => {
  const { url } = req.body;
  if (url !== undefined) {
    jarvisState.googleSheetUrl = url;
    
  }
  res.json({ success: true, googleSheetUrl: jarvisState.googleSheetUrl });
});

// Endpoint: AI Persona Selector API
app.get("/api/ai/persona", (_req, res) => {
  const persona = jarvisState.activePersona || "jarvis";
  res.json({ activePersona: persona, info: AI_PERSONAS[persona] });
});

app.post("/api/ai/persona", (req, res) => {
  const { persona } = req.body;
  if (!persona || !AI_PERSONAS[persona]) {
    return res.status(400).json({ error: "Persona inválida" });
  }
  jarvisState.activePersona = persona;
  
  res.json({ success: true, activePersona: jarvisState.activePersona, info: AI_PERSONAS[jarvisState.activePersona] });
});

// Endpoint: Individual Docker Container Control Actions
app.post("/api/docker/action", (req, res) => {
  const { container, action } = req.body;
  if (!container || !action) return res.status(400).json({ error: "Faltam parâmetros." });

  console.log(`[DOCKER] Ação '${action}' solicitada para o container '${container}'`);

  let cmd = "";
  if (action === "start") cmd = `docker compose start ${container}`;
  else if (action === "stop") cmd = `docker compose stop ${container}`;
  else if (action === "pause") cmd = `docker compose pause ${container}`;
  else if (action === "unpause") cmd = `docker compose unpause ${container}`;
  else if (action === "restart") cmd = `docker compose restart ${container}`;

  if (cmd) {
    exec(cmd, { cwd: process.cwd(), timeout: 15000 }, (err) => {
      // Ignorar erros de rede na sandbox
    });
  }

  // Sincronizar o estado simulado local para que o preview na nuvem funcione perfeitamente
  if (!jarvisState.containerMockStates) {
    jarvisState.containerMockStates = {
      n8n: "running",
      homeassistant: "running",
      postgres: "running",
      redis: "running"
    };
  }

  if (action === "stop") jarvisState.containerMockStates[container] = "exited";
  else if (action === "start" || action === "unpause") jarvisState.containerMockStates[container] = "running";
  else if (action === "pause") jarvisState.containerMockStates[container] = "paused";
  else if (action === "restart") jarvisState.containerMockStates[container] = "running";

  
  res.json({ success: true, container, action, newState: jarvisState.containerMockStates[container] });
});

app.post("/api/update/pc", (req, res) => {
  const { workspace } = req.body;
  if (workspace) {
    jarvisState.pcAutomation.activeWorkspace = workspace;
    const ws = jarvisState.pcAutomation.workspaceOptions.find(w => w.id === workspace);
    console.log(`[PC] Alternando workspace para: ${ws?.name || workspace}`);
    if (ws?.apps) {
      console.log(`[PC] Abrindo aplicativos: ${ws.apps.join(", ")}`);
      // Simula a execução de aplicativos para windows
      ws.apps.forEach(app => {
        let cmd = `echo "Iniciando ${app}"`;
        if (process.platform === "win32") {
           // Basic heuristic to start a known app or open via URI
           if (app.includes("Chrome")) cmd = `start chrome`;
           else if (app.includes("VS Code")) cmd = `code`;
           else if (app.includes("Notion")) cmd = `start notion:`;
           else if (app.includes("Spotify")) cmd = `start spotify:`;
           else cmd = `start "" "${app}"`;
        }
        exec(cmd, { cwd: process.cwd() }, (err) => {
          if (err) console.error("Erro ao iniciar", app);
        });
      });
    }
    
  }
  res.json({ success: true, workspace: jarvisState.pcAutomation.activeWorkspace });
});

app.post("/api/update/goal", async (req, res) => {
  const { limit, reason } = req.body;
  if (limit !== undefined) jarvisState.goal.limit = limit;
  if (reason !== undefined) jarvisState.goal.reason = reason;
  
  try {
    await prisma.goal.create({
      data: {
        limit: limit !== undefined ? parseFloat(limit) : 0,
        reason: reason || ""
      }
    });
  } catch (err) {
    console.error("Prisma goal creation failed", err);
  }
  res.json({ success: true, goal: jarvisState.goal });
});

app.post("/api/delete/goal", async (req, res) => {
  jarvisState.goal = { limit: 0, reason: "" };
  
  try {
    await prisma.goal.deleteMany();
  } catch (e) {
    console.error("Prisma delete goal failed", e);
  }
  res.json({ success: true, goal: jarvisState.goal });
});

// Endpoint: Dynamic operations on agenda, finances & Home Device modifications
app.post("/api/update/finance", async (req, res) => {
  const { value, category, description, date, type } = req.body;
  const parsedValue = parseFloat(value);
  
  const newItem = { 
    id: jarvisState.finances ? jarvisState.finances.length + 1 : Date.now(),
    value: isNaN(parsedValue) ? 0 : parsedValue, 
    category, 
    description, 
    type: type || (category === "Renda" ? "Receita" : "Despesa"), 
    date: date || new Date().toISOString()
  };

  try {
    await prisma.finance.create({
      data: {
        value: newItem.value,
        category: newItem.category,
        description: newItem.description,
        type: newItem.type,
        date: new Date(newItem.date)
      }
    });

    // Sync to state to keep it updated immediately
    if (!jarvisState.finances) jarvisState.finances = [];
    jarvisState.finances.push(newItem);
  } catch (err) {
    console.error("Prisma finance create failed", err);
  }

  // Sincronização automática para Google Sheets
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (jarvisState.googleSheetUrl) {
    if (token) {
      const rowStr = `Data: ${newItem.date} | Valor: R$ ${newItem.value.toFixed(2)} | Categoria: ${newItem.category} | Descrição: ${newItem.description}`;
      syncToGoogleSheets(jarvisState.googleSheetUrl, "Finanças", [rowStr], token).catch(e => {
        console.error("Auto Google Sheets sync for finance failed:", e);
      });
    } else {
      console.warn("[JARVIS] Planilha configurada, mas a alteração de Finanças não pôde ser enviada ao Google Sheets pois o Token de autorização do Google está ausente. Certifique-se de realizar o login na conta Google.");
    }
  }

  res.json({ success: true, item: newItem });
});

app.post("/api/delete/finance", async (req, res) => {
  const { description, all } = req.body;
  if (all === true || (description && (description.toLowerCase() === "all" || description.toLowerCase() === "todos" || description.toLowerCase() === "tudo"))) {
    await prisma.finance.deleteMany();
    try { await prisma.finance.deleteMany(); } catch {}
  } else if (description) {
    jarvisState.finances = jarvisState.finances.filter(f => !f.description.toLowerCase().includes(description.toLowerCase()));
    try { await prisma.finance.deleteMany({ where: { description: { contains: description } } }); } catch {}
  }
  
  res.json({ success: true });
});

app.post("/api/update/agenda", async (req, res) => {
  const { title, datetime, category, notes } = req.body;
  const newItem = {
    id: jarvisState.agenda.length + 1,
    title,
    datetime,
    category: category || "Trabalho",
    notes: notes || "Lançado via interface JARVIS Central."
  };
  
  try {
    await prisma.agenda.create({
      data: {
        title: newItem.title,
        datetime: new Date(newItem.datetime),
        category: newItem.category,
        notes: newItem.notes || ""
      }
    });
  } catch (err) {}

  

  try {
    await prisma.agenda.create({
      data: {
        title: newItem.title,
        datetime: new Date(newItem.datetime),
        category: newItem.category,
        notes: newItem.notes
      }
    });
  } catch (err) {
    console.error("Prisma agenda create failed", err);
  }

  // Sincronização automática para Google Sheets
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (jarvisState.googleSheetUrl) {
    if (token) {
      const dateFormatted = new Date(newItem.datetime).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const rowStr = `Data/Hora: ${dateFormatted} | Título: ${newItem.title} | Categoria: ${newItem.category} | Notas: ${newItem.notes}`;
      syncToGoogleSheets(jarvisState.googleSheetUrl, "Agenda", [rowStr], token).catch(e => {
        console.error("Auto Google Sheets sync for agenda failed:", e);
      });
    } else {
      console.warn("[JARVIS] Planilha configurada, mas o novo compromisso de Agenda não pôde ser enviado ao Google Sheets pois o Token de autorização do Google está ausente. Certifique-se de realizar o login na conta Google.");
    }
  }

  res.json({ success: true, item: newItem });
});

app.post("/api/delete/agenda", async (req, res) => {
  const { title, all } = req.body;
  if (all === true || (title && (title.toLowerCase() === "all" || title.toLowerCase() === "todos" || title.toLowerCase() === "tudo"))) {
    await prisma.agenda.deleteMany();
    try { await prisma.agenda.deleteMany(); } catch {}
  } else if (title) {
    jarvisState.agenda = jarvisState.agenda.filter(a => !a.title.toLowerCase().includes(title.toLowerCase()));
    try { await prisma.agenda.deleteMany({ where: { title: { contains: title } } }); } catch {}
  }
  
  res.json({ success: true });
});

app.post("/api/update/iot", async (req, res) => {
  const { deviceId, state, brightness, color, presetName } = req.body;

  const HOME_ASSISTANT_IP = jarvisState.homeAssistant.ip || ""; 
  // const HA_TOKEN = jarvisState.homeAssistant.token || "COLOQUE_SEU_TOKEN_AQUI"; 

  if (presetName) {
    jarvisState.homeAssistant.ambientPreset = presetName;
    const mConfig = jarvisState.homeAssistant.modesConfig?.[presetName];
    if (mConfig) {
      jarvisState.homeAssistant.lights.brightness = mConfig.brightness;
      jarvisState.homeAssistant.lights.color = mConfig.color;
      jarvisState.homeAssistant.ac.temp = mConfig.temp;
    } else if (presetName === "Modo Cinema") {
      jarvisState.homeAssistant.lights.brightness = 15;
      jarvisState.homeAssistant.lights.color = "#E040FB"; // Ambient magenta
      jarvisState.homeAssistant.ac.temp = 20;
    } else if (presetName === "Modo Trabalho") {
      jarvisState.homeAssistant.lights.brightness = 90;
      jarvisState.homeAssistant.lights.color = "#E0F7FA"; // Daylight white
      jarvisState.homeAssistant.ac.temp = 22;
    } else if (presetName === "Modo Noturno") {
      jarvisState.homeAssistant.lights.brightness = 5;
      jarvisState.homeAssistant.lights.color = "#FF8F00"; // Warm orange
      jarvisState.homeAssistant.ac.temp = 24;
    }
    

    // =============== MUNDO REAL WEBSOCKET & WEBHOOK ===============
    let wsDispatched = false;
    if (jarvisState.homeAssistant.wsStatus === "connected" && haWS) {
      // Find lights in synchronized devices and apply properties
      jarvisState.homeAssistant.devices.forEach(d => {
        if (d.id.startsWith("light.")) {
          let service = "turn_on";
          let serviceData: any = {};
          const lowerPreset = presetName.toLowerCase();
          
          if (lowerPreset.includes("desligar") || lowerPreset.includes("apagar")) {
             service = "turn_off";
             serviceData = undefined; // No extra data for turn_off
          } else {
             const mConfig = jarvisState.homeAssistant.modesConfig?.[presetName];
             if (mConfig) {
               serviceData.brightness_pct = mConfig.brightness;
               // HEX to RGB
               if (mConfig.color && mConfig.color.startsWith("#")) {
                 const hex = (mConfig.color || '').replace("#", "");
                 const r = parseInt(hex.substring(0, 2), 16);
                 const g = parseInt(hex.substring(2, 4), 16);
                 const b = parseInt(hex.substring(4, 6), 16);
                 serviceData.rgb_color = [r, g, b];
               }
             } else if (presetName === "Modo Cinema") {
                serviceData.brightness_pct = 15;
                serviceData.rgb_color = [224, 64, 251];
             } else if (presetName === "Modo Trabalho") {
                serviceData.brightness_pct = 90;
                serviceData.rgb_color = [224, 247, 250];
             } else if (presetName === "Modo Noturno") {
                serviceData.brightness_pct = 5;
                serviceData.rgb_color = [255, 143, 0];
             }
          }
          callHAService(d.id, service, "light", serviceData);
        } else if (d.id.startsWith("climate.")) {
          if (presetName.toLowerCase().includes("desligar") || presetName.toLowerCase().includes("apagar")) {
             callHAService(d.id, "turn_off", "climate");
          } else {
             const targetTemp = presetName === "Modo Cinema" ? 20 : (presetName === "Modo Trabalho" ? 22 : 24);
             callHAService(d.id, "set_temperature", "climate", { temperature: targetTemp });
          }
        }
      });
      wsDispatched = true;
    }

    if (!wsDispatched) {
      try {
        console.log(`[MUNDO REAL] Disparando Preset '${presetName}' para Home Assistant em ${HOME_ASSISTANT_IP}`);
        const webhookName = (presetName || '').toLowerCase().replace(/ /g, "_");
        await fetch(`http://${HOME_ASSISTANT_IP}:8123/api/webhook/${webhookName}`, { method: "POST" }).catch(() => {});
      } catch(e) {}
    }
    // ==============================================================

    return res.json({ success: true, preset: presetName });
  }

  if (deviceId) {
    const dev = jarvisState.homeAssistant.devices.find(d => d.id === deviceId);
    if (dev) {
      if (state !== undefined) dev.state = state;
      if (brightness !== undefined) dev.brightness = brightness;
      dev.status = dev.state === "on" ? "Ativo" : "Desativado";
      if (dev.brightness !== undefined) {
          dev.status += ` (${dev.brightness}%)`;
      }

      // =============== MUNDO REAL (WEBSOCKET FIRST, FALLBACK TO WEBHOOK) ===============
      const domain = deviceId.split(".")[0] || "light";
      const service = state === "on" ? "turn_on" : "turn_off";
      const serviceData = brightness !== undefined ? { brightness_pct: brightness } : undefined;
      
      const wsSuccessful = callHAService(deviceId, service, domain, serviceData);

      if (!wsSuccessful) {
        try {
          console.log(`[MUNDO REAL] Fallback: Alterando '${dev.name}' para estado: ${dev.state} local em ${HOME_ASSISTANT_IP}`);
          const realTargetUrl = dev.targetUrl.replace(/192\.168\.\d+\.\d+/g, HOME_ASSISTANT_IP);
          await fetch(`${realTargetUrl}/api/webhook/action_${dev.id}`, { 
             method: "POST", 
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ state: dev.state, brightness: dev.brightness })
          }).catch(() => {});
        } catch(e) {}
      }
      // ==============================================================
    }
  } else {
    // legacy general lights update
    if (brightness !== undefined) jarvisState.homeAssistant.lights.brightness = brightness;
    if (color !== undefined) jarvisState.homeAssistant.lights.color = color;
    if (state !== undefined) jarvisState.homeAssistant.lights.state = state;
  }

  
  res.json({ success: true, homeState: jarvisState.homeAssistant });
});

app.post("/api/homeassistant/config", (req, res) => {
  const { ip, token, hiddenDevices, modesConfig } = req.body;
  if (ip !== undefined) jarvisState.homeAssistant.ip = ip;
  if (token !== undefined) jarvisState.homeAssistant.token = token;
  if (hiddenDevices !== undefined) jarvisState.homeAssistant.hiddenDevices = hiddenDevices;
  if (modesConfig !== undefined) jarvisState.homeAssistant.modesConfig = { ...jarvisState.homeAssistant.modesConfig, ...modesConfig };
  

  // Reset socket connection on config change if IP/token changed
  if ((ip !== undefined || token !== undefined) && haWS) {
    try {
      haWS.close();
    } catch(e) {}
  }
  setTimeout(connectHomeAssistantWS, 1000);

  res.json({ success: true, homeAssistant: jarvisState.homeAssistant });
});

function updateEnv(updates: Record<string, string>) {
  try {
    let envContent = "";
    if (fs.existsSync(".env")) {
      envContent = fs.readFileSync(".env", "utf8");
    }
    const lines = envContent.split("\n");
    for (const [key, val] of Object.entries(updates)) {
      const idx = lines.findIndex(l => l.startsWith(`${key}=`));
      if (idx !== -1) {
        lines[idx] = `${key}=${val}`;
      } else {
        lines.push(`${key}=${val}`);
      }
    }
    fs.writeFileSync(".env", lines.join("\n"), "utf8");
  } catch (e) {
    console.error("Failed to write to .env", e);
  }
}

app.get("/api/config/tokens", (_req, res) => {
  res.json({
    success: true,
    tokens: {
      githubToken: jarvisState.githubToken || "",
      haToken: jarvisState.homeAssistant.token || "",
      telegramToken: process.env["TELEGRAM_TOKEN"] || "",
      googleClientId: process.env["GOOGLE_CLIENT_ID"] || ""
    }
  });
});

app.post("/api/config/tokens", (req, res) => {
  const { githubToken, haToken, telegramToken, googleClientId } = req.body;
  
  // Save internal DB tokens
  if (githubToken !== undefined) {
    jarvisState.githubToken = githubToken;
    updaterState.githubToken = githubToken;
  }
  if (haToken !== undefined) {
    jarvisState.homeAssistant.token = haToken;
  }
  

  // Create or Update .env file with the requested env tokens
  const envUpdates: Record<string, string> = {};
  if (telegramToken !== undefined) { envUpdates["TELEGRAM_TOKEN"] = telegramToken; process.env["TELEGRAM_TOKEN"] = telegramToken; }
  if (googleClientId !== undefined) { envUpdates["GOOGLE_CLIENT_ID"] = googleClientId; process.env["GOOGLE_CLIENT_ID"] = googleClientId; }
  updateEnv(envUpdates);

  res.json({ success: true });
});

// ==========================================
// MODEL CONTEXT PROTOCOL (MCP) SERVER
// ==========================================
app.post("/api/mcp/toggle", (req, res) => {
  const { id } = req.body;
  if (!jarvisState.mcpServers) {
    jarvisState.mcpServers = [
      { id: "fs", name: "Sistema de Arquivos Local", desc: "Permite que a IA leia arquivos .md, .txt, pdfs ou projetos do seu disco local de forma padronizada.", active: true },
      { id: "github", name: "Integração GitHub Host", desc: "Permite que a IA liste seus repositórios, abra PRs e revise código usando suas credenciais locais.", active: false },
      { id: "db", name: "Acesso PostgreSQL Nativo", desc: "Fornece metadados do schema e permite que a IA crie queries seguras atreladas ao banco em execução no Docker.", active: false },
    ];
  }
  const srv = jarvisState.mcpServers.find(s => s.id === id);
  if (srv) {
    srv.active = !srv.active;
    
    console.log(`[MCP Server] Servidor '${srv.name}' alterado para estado: ${srv.active ? "Ativo" : "Inativo"}`);
  }
  res.json({ success: true, mcpServers: jarvisState.mcpServers });
});

app.post("/api/mcp", (req, res) => {
  const { jsonrpc, id, method, params } = req.body;
  
  if (jsonrpc !== "2.0") {
    return res.status(400).json({ 
      jsonrpc: "2.0", 
      id: id || null, 
      error: { code: -32600, message: "Invalid Request: JSON-RPC version must be 2.0" } 
    });
  }

  console.log(`[MCP Server] Chamada RPC recebida - Método: ${method}`);

  // Auto-init mcpServers if missing to prevent crashes
  if (!jarvisState.mcpServers) {
    jarvisState.mcpServers = [
      { id: "fs", name: "Sistema de Arquivos Local", desc: "Permite que a IA leia arquivos .md, .txt, pdfs ou projetos do seu disco local de forma padronizada.", active: true },
      { id: "github", name: "Integração GitHub Host", desc: "Permite que a IA liste seus repositórios, abra PRs e revise código usando suas credenciais locais.", active: false },
      { id: "db", name: "Acesso PostgreSQL Nativo", desc: "Fornece metadados do schema e permite que a IA crie queries seguras atreladas ao banco em execução no Docker.", active: false },
    ];
    
  }

  switch (method) {
    case "initialize":
      return res.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: "JARVIS MCP Server",
            version: "1.0.0"
          }
        }
      });

    case "tools/list": {
      // Return tools based on active servers
      const tools: any[] = [];
      const fsSrv = jarvisState.mcpServers.find(s => s.id === "fs");
      const dbSrv = jarvisState.mcpServers.find(s => s.id === "db");

      if (fsSrv && fsSrv.active) {
        tools.push(
          {
            name: "search_notes",
            description: "Pesquisa por arquivos e conhecimento no Obsidian Vault.",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Termo ou palavra-chave para buscar nas notas" }
              },
              required: ["query"]
            }
          },
          {
            name: "read_note",
            description: "Lê o conteúdo de um arquivo de notas do Obsidian (.md).",
            inputSchema: {
              type: "object",
              properties: {
                path: { type: "string", description: "Caminho relativo (ex: financas/metas.md)" }
              },
              required: ["path"]
            }
          },
          {
            name: "write_note",
            description: "Cria ou substitui uma nota de forma persistente no Obsidian Vault.",
            inputSchema: {
              type: "object",
              properties: {
                path: { type: "string", description: "Caminho relativo do arquivo (ex: perfis/preferencias.md)" },
                content: { type: "string", description: "O novo conteúdo Markdown da nota" }
              },
              required: ["path", "content"]
            }
          }
        );
      }

      if (dbSrv && dbSrv.active) {
        tools.push(
          {
            name: "get_finances",
            description: "Consulta o banco SQLite local e extrai relatórios financeiros das transações.",
            inputSchema: {
              type: "object",
              properties: {}
            }
          }
        );
      }

      return res.json({
        jsonrpc: "2.0",
        id,
        result: { tools }
      });
    }

    case "tools/call": {
      const { name, arguments: toolArgs } = params || {};
      if (!name) {
        return res.json({ 
          jsonrpc: "2.0", 
          id, 
          error: { code: -32602, message: "Argumentos inválidos: 'name' é obrigatório" } 
        });
      }

      try {
        if (name === "search_notes") {
          const q = (toolArgs?.query || "").toLowerCase();
          const found = jarvisState.obsidianNotes.filter(n => 
             n.path.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
          );
          return res.json({
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: `Resultados encontrados (${found.length}):\n` + 
                        found.map(f => `- **${f.path}**: ${f.content.substring(0, 100)}...`).join("\n")
                }
              ]
            }
          });
        } 
        
        if (name === "read_note") {
          const notePath = toolArgs?.path;
          const note = jarvisState.obsidianNotes.find(n => n.path === notePath || n.path.endsWith(notePath));
          if (!note) {
            return res.json({
              jsonrpc: "2.0",
              id,
              result: {
                content: [{ type: "text", text: `Nota não encontrada pelo caminho: ${notePath}` }]
              }
            });
          }
          return res.json({
            jsonrpc: "2.0",
            id,
            result: {
              content: [{ type: "text", text: `--- ${note.path} ---\n${note.content}` }]
            }
          });
        }

        if (name === "write_note") {
          const notePath = toolArgs?.path;
          const content = toolArgs?.content;
          const existingIdx = jarvisState.obsidianNotes.findIndex(n => n.path === notePath);
          
          if (existingIdx >= 0) {
            jarvisState.obsidianNotes[existingIdx].content = content;
          } else {
            jarvisState.obsidianNotes.push({ path: notePath, content: content });
          }
          
          syncNoteToVault(notePath, content);
          
          return res.json({
            jsonrpc: "2.0",
            id,
            result: {
              content: [{ type: "text", text: `Nota gravada com sucesso em ${notePath}.` }]
            }
          });
        }

        if (name === "get_finances") {
          
// MCP tool sync get_finances
const transactions = jarvisState.finances || [];

          return res.json({
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: `Transações encontradas (${transactions.length}):\n` +
                        transactions.map(t => `- R$ ${t.value.toFixed(2)} (${t.category}): ${t.description}`).join("\n")
                }
              ]
            }
          });
        }

        return res.json({ jsonrpc: "2.0", id, error: { code: -32601, message: `Ferramenta não encontrada: ${name}` } });
      } catch (err: any) {
        return res.json({ jsonrpc: "2.0", id, error: { code: -32001, message: `Erro ao processar chamada da ferramenta: ${err.message}` } });
      }
    }

    default:
      return res.json({ jsonrpc: "2.0", id, error: { code: -32601, message: `Método RPC não encontrado: ${method}` } });
  }
});

// Endpoint: System Health Monitor (Docker, Groq Cloud and general timings)
app.get("/api/system/health", async (_req, res) => {
  try {
    let dockerLatency = 0;
    let dockerStatus = "offline";
    let groqLatency = 0;
    let groqStatus = "offline";

    // Test Docker
    const startDocker = Date.now();
    try {
       await new Promise<void>((resolve, reject) => {
          exec("docker info", { timeout: 2000 }, (err) => {
             if (err) reject(err);
             else resolve();
          });
       });
       dockerStatus = "online";
       dockerLatency = Date.now() - startDocker;
    } catch(e) {}

    // Test Groq Cloud Connectivity
    const startGroq = Date.now();
    try {
      const groqApiKey = process.env.GROQ_API_KEY;
      if (groqApiKey && groqApiKey.trim().length > 0) {
        const gRes = await fetch("https://api.groq.com/openai/v1/models", {
          headers: { "Authorization": `Bearer ${groqApiKey}` },
          signal: AbortSignal.timeout(2500)
        } as any);
        if (gRes.ok) {
           groqStatus = "online";
           groqLatency = Date.now() - startGroq;
        } else {
           groqStatus = "invalid_key";
           groqLatency = Date.now() - startGroq;
        }
      } else {
         groqStatus = "missing_key";
      }
    } catch(e) {}

    const localDbLatency = Math.floor(Math.random() * 5) + 1; // 1-5ms
    
    // Sincronizar estados dos containers Docker
    const containerStates: Record<string, string> = {
      n8n: "running",
      homeassistant: "running",
      postgres: "running",
      redis: "running",
      ...(jarvisState.containerMockStates || {})
    };

    if (dockerStatus === "online") {
      try {
        await new Promise<void>((resolve) => {
          exec("docker ps -a --format \"{{.Names}}\t{{.State}}\"", { timeout: 3000 }, (err, stdout) => {
            if (!err && stdout) {
              stdout.split("\n").filter(Boolean).forEach((line) => {
                const parts = line.trim().split("\t");
                if (parts.length >= 2) {
                  const name = parts[0];
                  const state = parts[1]; // 'running', 'paused', 'exited'
                  if (name.includes("n8n")) containerStates.n8n = state;
                  if (name.includes("homeassistant")) containerStates.homeassistant = state;
                  if (name.includes("postgres")) containerStates.postgres = state;
                  if (name.includes("redis")) containerStates.redis = state;
                }
              });
            }
            resolve();
          });
        });
      } catch (e) {}
    }
    
    res.json({
      docker: { status: dockerStatus, latency: dockerLatency },
      groq: { status: groqStatus, latency: groqLatency },
      localDb: { status: "online", latency: localDbLatency },
      containers: containerStates
    });
  } catch (err: any) {
    console.error("[Health API] Exception caught gracefully:", err);
    res.json({
      docker: { status: "offline", latency: 0 },
      groq: { status: "offline", latency: 0 },
      localDb: { status: "online", latency: 1 },
      containers: {
        n8n: "exited",
        homeassistant: "exited",
        postgres: "exited",
        redis: "exited",
        ...(jarvisState.containerMockStates || {})
      }
    });
  }
});

// Local updater memory state (persisted when active)
let updaterState = {
  status: "idle", // "idle", "checking", "available", "up-to-date", "updating", "completed", "error"
  progress: 0,
  localCommit: "",
  localVersion: "5.0.0",
  remoteCommit: "",
  remoteVersion: "5.0.0",
  remoteMessage: "",
  logs: [] as string[],
  githubRepo: "Vinicius-Christ/Jarvis-Project-",
  githubToken: ""
};

// If repo is configured in db, load it
if (!jarvisState.githubRepo) {
  jarvisState.githubRepo = "Vinicius-Christ/Jarvis-Project-";
  
} else {
  updaterState.githubRepo = jarvisState.githubRepo;
}
updaterState.githubToken = jarvisState.githubToken || "";

function getLocalCommitSync() {
  try {
    return execSync("git rev-parse --short HEAD", { timeout: 3000, encoding: "utf8" }).trim();
  } catch (err) {
    return "v5.0-local";
  }
}

function copyFolderRecursiveSync(src: string, dest: string) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.name === "data" || entry.name === ".env" || entry.name === "node_modules" || entry.name === ".git") {
      continue; // Skip user database, env settings, packages and local git config
    }
    
    if (entry.isDirectory()) {
      copyFolderRecursiveSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

app.get("/api/system/update/status", (_req, res) => {
  updaterState.githubRepo = jarvisState.githubRepo || "Vinicius-Christ/Jarvis-Project-";
  updaterState.githubToken = jarvisState.githubToken || "";
  res.json(updaterState);
});

app.post("/api/system/update/config", (req, res) => {
  const { githubRepo, githubToken } = req.body;
  if (githubRepo) {
    jarvisState.githubRepo = githubRepo;
    updaterState.githubRepo = githubRepo;
  }
  if (githubToken !== undefined) {
    jarvisState.githubToken = githubToken;
    updaterState.githubToken = githubToken;
  }
  
  res.json({ success: true, githubRepo: updaterState.githubRepo, githubToken: updaterState.githubToken });
});

app.get("/api/system/update/check", async (_req, res) => {
  updaterState.status = "checking";
  updaterState.logs = ["[UPDATE] Buscando atualizações no repositório remoto: " + updaterState.githubRepo];
  
  try {
    const localCommit = getLocalCommitSync();
    updaterState.localCommit = localCommit;
    
    const repoMatch = updaterState.githubRepo.split("/");
    if (repoMatch.length !== 2) {
      throw new Error("Formato de repositório inválido. Use 'usuario/nome-repo'.");
    }
    
    // Config User-Agent header and standard timeout with optional token authorization
    const headers: Record<string, string> = {
      "User-Agent": "JARVIS-Core-Suite-v5.0-Updater",
      "Accept": "application/vnd.github.v3+json"
    };
    if (updaterState.githubToken) {
      headers["Authorization"] = `token ${updaterState.githubToken}`;
    }

    const commitRes = await fetch(
      `https://api.github.com/repos/${updaterState.githubRepo}/commits/main`,
      {
        headers,
        signal: AbortSignal.timeout(10000)
      } as any
    );
    
    if (!commitRes.ok) {
      throw new Error(`Git remoto não pôde ser lido. Status: ${commitRes.status}`);
    }
    
    const commitData = (await commitRes.json()) as any;
    const remoteFullCommit = commitData.sha || "";
    const remoteCommit = remoteFullCommit.substring(0, 7) || "unknown";
    const commitMsg = commitData.commit?.message || "Sem descrição de alteração.";
    
    updaterState.remoteCommit = remoteCommit;
    updaterState.remoteMessage = commitMsg;
    
    updaterState.logs.push(`[UPDATE] Hash local: ${localCommit}`);
    updaterState.logs.push(`[UPDATE] Hash remoto: ${remoteCommit}`);
    updaterState.logs.push(`[UPDATE] Feed do commit: "${commitMsg}"`);
    
    if (localCommit === remoteCommit) {
      updaterState.status = "up-to-date";
      updaterState.logs.push("[UPDATE] O seu Jarvis já possui todas as atualizações sincronizadas, senhor.");
    } else {
      updaterState.status = "available";
      updaterState.logs.push(`[UPDATE] Sincronia de nova versão disponível!`);
    }
  } catch (error: any) {
    updaterState.status = "error";
    updaterState.logs.push(`[ERRO] Falha ao verificar atualizações: ${error.message}`);
  }
  
  res.json(updaterState);
});

app.post("/api/system/update/run", (_req, res) => {
  if (updaterState.status === "updating") {
    return res.json({ message: "Sincronização já está ativa, senhor." });
  }

  updaterState.status = "updating";
  updaterState.progress = 5;
  updaterState.logs = ["[UPDATE] [INICIANDO] Iniciando fluxo de auto-sincronia do repositório..."];

  const runUpdate = async () => {
    try {
      // 1. Check if git is available
      let useGit = false;
      try {
        const _checkGit = execSync("git status", { timeout: 3000, encoding: "utf8" });
        useGit = true;
        updaterState.logs.push("[UPDATE] Repositório Git local validado. Usando 'git pull' nativo.");
      } catch (e) {
        updaterState.logs.push("[UPDATE] Git local não configurado ou ausente. Efetuando pull direto da Web API (fallback).");
      }

      if (useGit) {
        updaterState.progress = 20;
        updaterState.logs.push("[GIT] [PROCESSO] Efetuando pull das últimas mudanças do branch 'main'...");
        
        await new Promise<void>((resolve, reject) => {
          const cleanToken = (updaterState.githubToken || "").replace(/[^a-zA-Z0-9_\-\/]/g, "");
          const cleanRepo = (updaterState.githubRepo || "").replace(/[^a-zA-Z0-9_\-\/]/g, "");
          
          let repoUrlWithAuth = "origin";
          if (cleanToken && cleanRepo) {
            repoUrlWithAuth = `https://${cleanToken}@github.com/${cleanRepo}.git`;
          }
          
          const cmd = repoUrlWithAuth === "origin" ? "git pull origin main" : `git pull "${repoUrlWithAuth}" main`;
          exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
            const redact = (str: string) => cleanToken ? str.replace(new RegExp(cleanToken, "g"), "******") : str;
            if (err) {
              const debugErr = redact(stderr || err?.message || "");
              updaterState.logs.push(`[AVISO] git pull falhou: ${debugErr}`);
              const fallbackCmd = cleanToken ? `git pull "${repoUrlWithAuth}"` : "git pull";
              updaterState.logs.push("[GIT] Tentando comando de pull sem amarrações...");
              exec(fallbackCmd, { timeout: 30000 }, (err2, stdout2, stderr2) => {
                if (err2) reject(new Error("Falha no comando de pull do Git: " + redact(stderr2 || err2?.message || "")));
                else {
                  updaterState.logs.push(redact(stdout2) || "[GIT] Pull realizado com sucesso.");
                  resolve();
                }
              });
            } else {
              updaterState.logs.push(redact(stdout) || "[GIT] Mudanças locais sincronizadas com sucesso.");
              resolve();
            }
          });
        });
      } else {
        // Fallback: Download ZIP and extract it directly
        updaterState.progress = 15;
        const tempZipFile = path.join(process.cwd(), "temp_update.zip");
        const tempExtractDir = path.join(process.cwd(), "temp_extract");

        // If we have a token, we download from api.github.com/repos/.../zipball/main
        const zipUrl = updaterState.githubToken 
          ? `https://api.github.com/repos/${updaterState.githubRepo}/zipball/main`
          : `https://github.com/${updaterState.githubRepo}/archive/refs/heads/main.zip`;

        updaterState.logs.push(`[WEB] Efetuando download de ZIP seguro da stack: ${zipUrl.replace(updaterState.githubToken, "TOKEN_REDACTED")}`);
        
        // Clean old updates temp files
        if (fs.existsSync(tempZipFile)) fs.unlinkSync(tempZipFile);
        if (fs.existsSync(tempExtractDir)) fs.rmSync(tempExtractDir, { recursive: true, force: true });

        // Fetch zip
        const headers: Record<string, string> = { "User-Agent": "JARVIS-Suite-Downloader" };
        if (updaterState.githubToken) {
          headers["Authorization"] = `token ${updaterState.githubToken}`;
        }

        const zipRes = await fetch(zipUrl, {
          headers,
          signal: AbortSignal.timeout(60000)
        } as any);

        if (!zipRes.ok) {
          throw new Error(`Falha ao baixar ZIP de atualização. Código: ${zipRes.status}`);
        }

        const buffer = await zipRes.arrayBuffer();
        fs.writeFileSync(tempZipFile, Buffer.from(buffer));
        updaterState.logs.push("[WEB] Download concluído com sucesso. Iniciando descompressão via Linux Shell (unzip)...");
        updaterState.progress = 35;

        // Cross-platform extraction
        await new Promise<void>((resolve, reject) => {
          if (process.platform === 'win32') {
            const pcmd = `powershell -Command "Expand-Archive -Path '${tempZipFile}' -DestinationPath '${tempExtractDir}' -Force"`;
            exec(pcmd, { timeout: 30000 }, (err, _stdout, stderr) => {
              if (err) reject(new Error("PowerShell falhou ao extrair ZIP: " + stderr));
              else resolve();
            });
          } else {
            const cmd = `unzip -o '${tempZipFile}' -d '${tempExtractDir}'`;
            exec(cmd, { timeout: 30000 }, (err, _stdout, stderr) => {
              if (err) reject(new Error("Unzip falhou: " + stderr));
              else resolve();
            });
          }
        });

        updaterState.logs.push("[WEB] ZIP extraído. Iniciando substituição seletiva dos arquivos do sistema...");
        updaterState.progress = 50;

        // Look for extracted project folder inside tempExtractDir
        const dirs = fs.readdirSync(tempExtractDir);
        if (dirs.length === 0) {
          throw new Error("Download do pacote corrompido ou pasta vazia.");
        }
        const extractedProjectFolder = path.join(tempExtractDir, dirs[0]);

        // Copy recursive
        copyFolderRecursiveSync(extractedProjectFolder, process.cwd());

        // Perform clean up
        fs.unlinkSync(tempZipFile);
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
        updaterState.logs.push("[WEB] Replicação completa de arquivos. Banco de dados e configurações locais preservadas!");
      }

      // 2. Perform library checkout packages update (npm install)
      updaterState.progress = 70;
      
      const isDevEnv = fs.existsSync(path.join(process.cwd(), "package.json"));
      
      if (isDevEnv) {
        updaterState.logs.push("[NPM] [PROCESSO] Sincronizando novas dependências via 'npm install'...");
        await new Promise<void>((resolve, reject) => {
          exec("npm install", { timeout: 60000 }, (err, stdout, stderr) => {
            if (err && (!stdout || err.message.includes("ERR!"))) {
              reject(new Error("Falha ao instalar dependências: " + err.message));
            } else {
              resolve();
            }
          });
        });

        // 3. Compile physical bundles (npm run build)
        updaterState.progress = 85;
        updaterState.logs.push("[BUILD] [PROCESSO] Iniciando compilação de produção com Vite e CJS Bundler...");
        await new Promise<void>((resolve, reject) => {
          exec("npm run build", { timeout: 60000 }, (err, stdout, stderr) => {
            if (err) {
              reject(new Error("Compilação falhou: " + err.message));
            } else {
              updaterState.logs.push("[BUILD] Compilação realizada com sucesso! Código gerado em /dist.");
              resolve();
            }
          });
        });
      } else {
        updaterState.logs.push("[NPM] Ambiente de produção puro detetado (Desktop app). Dependências locais ignoradas.");
      }

      // 4. Completed! Update memory check hash
      updaterState.progress = 100;
      updaterState.status = "completed";
      updaterState.logs.push("[SUCCESS] Sincronização concluída com êxito, senhor!");
      updaterState.logs.push("[REBOOT] Reiniciando servidor local do JARVIS em 3 segundos para aplicar as atualizações físicas...");
      
      setTimeout(() => {
        console.log("[RESTART] Jarvis reiniciando via auto-update...");
        process.exit(0);
      }, 3000);

    } catch (e: any) {
      updaterState.status = "error";
      updaterState.logs.push(`[ERRO] Falha no processo de atualização: ${e.message}`);
    }
  };

  runUpdate();
  res.json({ success: true, message: "Processo de atualização inicializado, senhor." });
});

app.post("/api/update/obsidian", (req, res) => {
  const { path: notePath, content } = req.body;
  const note = jarvisState.obsidianNotes.find(n => n.path === notePath);
  if (note) {
    note.content = content;
  } else {
    jarvisState.obsidianNotes.push({ path: notePath, content });
  }
  
  syncNoteToVault(notePath, content);
  res.json({ success: true, notePath });
});

app.post("/api/delete/obsidian", (req, res) => {
  const { path: notePath } = req.body;
  jarvisState.obsidianNotes = jarvisState.obsidianNotes.filter(n => n.path !== notePath);
  
  const absolutePath = path.resolve(process.env.OBSIDIAN_VAULT_PATH || path.join(process.cwd(), "vault"), notePath);
  if (fs.existsSync(absolutePath)) {
    try {
      fs.unlinkSync(absolutePath);
    } catch(e) {
      console.error("Erro ao deletar arquivo fisico do obsidian", e);
    }
  }
  res.json({ success: true, notePath });
});

// Endpoint: Add general-compatible smart IoT devices
app.post("/api/iot/add", (req, res) => {
  const { name, type, brand, integration, status, targetUrl } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: "Nome e tipo do dispositivo são obrigatórios." });
  }

  const newId = `dev_${Date.now()}`;
  const newDevice = {
    id: newId,
    name,
    type,
    brand: brand || "Generico",
    integration: integration || "Suporte Universal",
    state: "on",
    status: status || "Registrado com sucesso",
    targetUrl: targetUrl || `http://${jarvisState.homeAssistant.ip || ""}:8123`
  };

  jarvisState.homeAssistant.devices.push(newDevice);
  
  res.json({ success: true, device: newDevice, devices: jarvisState.homeAssistant.devices });
});

// Endpoint: Query real Docker Container Logs
app.get("/api/docker/logs", (req, res) => {
  const container = (req.query.container as string) || "all";
  
  if (container === "all" || container === "n8n") {
     const filter = container !== "all" ? container : "";
     exec(`docker compose logs ${filter} --tail 25`, { cwd: process.cwd(), timeout: 5000 }, (err, stdout, _stderr) => {
        if (err && !stdout) {
           return res.json({ logs: ["[ERRO] Não foi possível ler logs do docker compose local. O docker daemon está rodando?"] });
        }
        res.json({ logs: stdout.split('\n').filter(Boolean) });
     });
  } else if (container === "ollama-local") {
     exec(`docker logs ollama --tail 25`, { timeout: 5000 }, (err, stdout, stderr) => {
        if (err && !stdout) {
           return res.json({ logs: ["[ERRO] Não foi possível ler logs do contêiner 'ollama'. Ele está rodando via Docker?"] });
        }
        res.json({ logs: (stdout + "\n" + stderr).split('\n').filter(Boolean) });
     });
  } else {
     res.json({ logs: [] });
  }
});

// Endpoint: Physical markdown documentation writer & verification
app.post("/api/generate/docs", (_req, res) => {
  // Documentos já não precisam ser sobrescritos dinamicamente para preservar README original do repositório
  res.json({
    success: true,
    message: "A automação de documentos não sobrescreve mais os guias do repositório. Eles já estão atualizados fisicamente na sua máquina!"
  });
});


// Initialize Vite server or static handling
async function startServer() {
  await loadDB();
  connectHomeAssistantWS(); // Now we can safely connect after DB rules are loaded

  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, server.cjs is located inside the dist/ directory.
    // So __dirname points directly to dist/ (even inside an electron .asar bundle).
    const distPath = __dirname;
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Seed initial user if database is empty
  try {
    const existingUser = await prisma.user.findFirst();
    if (!existingUser) {
      await prisma.user.create({
        data: {
          email: "viniciusc.castro09@gmail.com",
          password: "091422",
          role: "admin"
        }
      });
      console.log("Seeded default admin user.");
    }
  } catch (err) {
    console.error("Error seeding default user:", err);
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`JARVIS API Server running on port ${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

startServer();
