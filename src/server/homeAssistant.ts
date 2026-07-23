import dotenv from "dotenv";
dotenv.config();

import WebSocket from "ws";
import { jarvisState } from "./database";

// ==========================================
// HOME ASSISTANT WEBSOCKET API INTEGRATION
// ==========================================
export let haWS: WebSocket | null = null;
export let haMessageId = 1;
export let reconnectTimeout: any = null;
export let haReconnectDelay = 15000;

export function connectHomeAssistantWS() {
    // Clear any pending reconnects
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }

    // Priorize variáveis de ambiente (.env) em vez do banco de dados para automação completa
    const rawIp = process.env.HOME_ASSISTANT_IP || process.env.HA_IP || jarvisState.homeAssistant.ip || "localhost";
    const token = process.env.HOME_ASSISTANT_TOKEN || process.env.HA_TOKEN || jarvisState.homeAssistant.token || "";

    // Sanitizar IP / Host
    let cleanIp = rawIp.trim().replace(/^https?:\/\//i, "").replace(/^wss?:\/\//i, "").replace(/\/.*$/, "");
    let port = "8123";
    if (cleanIp.includes(":")) {
        const parts = cleanIp.split(":");
        cleanIp = parts[0];
        port = parts[1] || "8123";
    }

    // Atualiza o estado apenas para log/visualização no front
    jarvisState.homeAssistant.ip = cleanIp;
    jarvisState.homeAssistant.token = token;

    // Safety check for empty or placeholder token/ip
    if (!cleanIp || cleanIp.includes("COLOQUE_SEU") || !token || token.includes("COLOQUE_SEU")) {
        console.warn("[HA WS] IP ou Token do Home Assistant não parecem estar configurados no .env. Aguardando...");
        jarvisState.homeAssistant.wsStatus = "disconnected";
        return;
    }

    const wsUrl = `ws://${cleanIp}:${port}/api/websocket`;
    console.log(`[HA WS] Tentando conectar ao Home Assistant em ${wsUrl}`);

    try {
        jarvisState.homeAssistant.wsStatus = "connecting";
        haWS = new WebSocket(wsUrl);

        haWS.on("open", () => {
            console.log(`[HA WS] Socket aberto com sucesso. Aguardando requerimento de autorização...`);
            jarvisState.homeAssistant.wsStatus = "authenticating";
        });

        haWS.on("message", (data: any) => {
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
            
            // Fallback automático para localhost se o IP de rede falhar com ECONNREFUSED
            if ((err?.code === "ECONNREFUSED" || err?.message?.includes("ECONNREFUSED")) && cleanIp !== "localhost" && cleanIp !== "127.0.0.1") {
                console.warn("[HA WS] Conexão recusada no IP configurado. Tentando fallback automático para 'localhost'...");
                jarvisState.homeAssistant.ip = "localhost";
            }
        });

    } catch (err: any) {
        console.error("[HA WS] Falha ao disparar o construtor WebSocket do Home Assistant:", err?.message || err);
        jarvisState.homeAssistant.wsStatus = "error";
        reconnectTimeout = setTimeout(connectHomeAssistantWS, haReconnectDelay);
        haReconnectDelay = Math.min(haReconnectDelay * 2, 120000);
    }
}

export function syncEntitiesWithDB(entities: any[]) {
    const filtered = entities.filter(e => {
        const id = e.entity_id;
        return id.startsWith("light.") ||
            id.startsWith("switch.") ||
            id.startsWith("climate.") ||
            (id.startsWith("sensor.") && (id.includes("temp") || id.includes("hum") || id.includes("sensor")) || e.attributes?.device_class === "temperature");
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

        const friendlyName = e.attributes?.friendly_name || e.entity_id;
        const currentState = e.state;
        const unit = e.attributes?.unit_of_measurement || "";

        let statusText = currentState === "on" ? "Ativo" : (currentState === "off" ? "Desativado" : currentState);
        if (unit) {
            statusText = `Medindo: ${currentState} ${unit}`;
        } else if (e.attributes?.brightness) {
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

    const manualDevices = jarvisState.homeAssistant.devices.filter((d: any) => !d.id.includes("."));
    jarvisState.homeAssistant.devices = [...manualDevices, ...updatedDevices];

}

export function updateEntityInDB(entity: any) {
    const id = entity.entity_id;
    if (!id.startsWith("light.") && !id.startsWith("switch.") && !id.startsWith("climate.") &&
        !(id.startsWith("sensor.") && (id.includes("temp") || id.includes("hum") || id.includes("sensor") || entity.attributes?.device_class === "temperature"))) {
        return;
    }

    const existingIdx = jarvisState.homeAssistant.devices.findIndex((d: any) => d.id === id);
    const friendlyName = entity.attributes?.friendly_name || id;
    const currentState = entity.state;
    const unit = entity.attributes?.unit_of_measurement || "";

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
    } else if (entity.attributes?.brightness) {
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

export function callHAService(entity_id: string, service: string, domain: string, service_data?: any) {
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
