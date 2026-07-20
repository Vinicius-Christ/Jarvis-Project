import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import fs from 'fs';
import path from 'path';

export const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./prisma/dev.db" });
export const prisma = new PrismaClient({ adapter });

export const DB_STATE_KEY = "global_state";

export let jarvisState: any = {
    githubRepo: "",
    githubToken: "",

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
        ip: process.env.HOME_ASSISTANT_IP || "",
        token: process.env.HOME_ASSISTANT_TOKEN || process.env.HA_TOKEN || "",
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

    installer: {
        status: "idle",
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

export async function loadDB() {
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
            if (ha.ip) jarvisState.homeAssistant.ip = ha.ip;
            if (ha.token) jarvisState.homeAssistant.token = ha.token;
            jarvisState.homeAssistant.ambientPreset = ha.ambientPreset;
            jarvisState.homeAssistant.wsStatus = ha.wsStatus;
            if (ha.lights) jarvisState.homeAssistant.lights = JSON.parse(ha.lights);
            if (ha.ac) jarvisState.homeAssistant.ac = JSON.parse(ha.ac);
            if (ha.devices) jarvisState.homeAssistant.devices = JSON.parse(ha.devices);
            if (ha.hiddenDevices) jarvisState.homeAssistant.hiddenDevices = JSON.parse(ha.hiddenDevices);
            if (ha.modesConfig) jarvisState.homeAssistant.modesConfig = JSON.parse(ha.modesConfig);
        }
        if (!jarvisState.homeAssistant.ip && process.env.HOME_ASSISTANT_IP) {
            jarvisState.homeAssistant.ip = process.env.HOME_ASSISTANT_IP;
        }
        if (!jarvisState.homeAssistant.token && (process.env.HOME_ASSISTANT_TOKEN || process.env.HA_TOKEN)) {
            jarvisState.homeAssistant.token = process.env.HOME_ASSISTANT_TOKEN || process.env.HA_TOKEN;
        }
    } catch (e: any) {
        console.error("[Database Load Error]: Fallback memory sync failed.", e?.message || e);
    }

    // Sync Physical Obsidian Vault to Memory
    try {
        const vaultDir = process.env.OBSIDIAN_VAULT_PATH || path.join(process.cwd(), "vault");
        if (fs.existsSync(vaultDir)) {
            jarvisState.obsidianNotes = [];
            const readFilesRecursively = (dir: string) => {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const fullPath = path.join(dir, file);
                    if (fs.statSync(fullPath).isDirectory()) {
                        readFilesRecursively(fullPath);
                    } else if (file.endsWith('.md')) {
                        const relativePath = path.relative(vaultDir, fullPath).replace(/\\/g, '/');
                        const content = fs.readFileSync(fullPath, 'utf-8');
                        jarvisState.obsidianNotes.push({ path: relativePath, content });
                    }
                }
            };
            readFilesRecursively(vaultDir);
        }
    } catch (e: any) {
        console.error("Erro ao carregar arquivos do Obsidian Vault:", e?.message);
    }
}
