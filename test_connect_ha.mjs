import { connectHomeAssistantWS } from './src/server/homeAssistant.ts';
import { jarvisState } from './src/server/database.ts';

console.log("Initial state before connect:", {
    ip: jarvisState.homeAssistant.ip,
    tokenLength: jarvisState.homeAssistant.token?.length,
    envIp: process.env.HOME_ASSISTANT_IP,
    envTokenLength: process.env.HOME_ASSISTANT_TOKEN?.length
});

connectHomeAssistantWS();

setTimeout(() => {
    console.log("State after 3 seconds:", jarvisState.homeAssistant.wsStatus);
    process.exit(0);
}, 3000);
