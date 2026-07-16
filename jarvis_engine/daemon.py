import asyncio
import logging
from jarvis_engine.memory import JarvisMemory

logger = logging.getLogger("JarvisDaemon")

class JarvisDaemon:
    def __init__(self, memory: JarvisMemory):
        self.memory = memory
        self.running = False
        
    async def _event_loop(self):
        while self.running:
            logger.info("Daemon is polling for background tasks in database or system events...")
            # Ponto onde orquestramos os agentes não-interativos continuos
            await asyncio.sleep(60) # Poll every 60 seconds

    async def start(self):
        logger.info("Starting Jarvis Background Daemon...")
        self.running = True
        try:
            await self._event_loop()
        except asyncio.CancelledError:
            self.stop()
            
    def stop(self):
        logger.info("Stopping Jarvis Background Daemon...")
        self.running = False

def run_daemon():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    memory = JarvisMemory("jarvis_memory.db")
    daemon = JarvisDaemon(memory)
    try:
        asyncio.run(daemon.start())
    except KeyboardInterrupt:
        daemon.stop()
        logging.info("Daemon shutdown gracefully.")
