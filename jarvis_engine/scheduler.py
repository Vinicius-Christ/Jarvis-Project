import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from jarvis_engine.memory import JarvisMemory
import time

logger = logging.getLogger("JarvisScheduler")

class JarvisScheduler:
    def __init__(self, memory: JarvisMemory):
        self.memory = memory
        self.scheduler = BackgroundScheduler()
        self._init_jobs()

    def _init_jobs(self):
        # O Learning Loop para auto-aprimorar os arquivos SKILL.md será agendado aqui.
        self.scheduler.add_job(
            self.run_learning_loop,
            CronTrigger(day_of_week='fri', hour=23),
            id='weekly_learning_loop',
            replace_existing=True
        )
        
        # Ping de monitoramento de sistema ou testes cron básicos
        self.scheduler.add_job(
            self.health_ping,
            IntervalTrigger(minutes=60),
            id='hourly_health_ping',
            replace_existing=True
        )
        
    def health_ping(self):
        logger.info("[Scheduled Task] Jarvis Health Ping executed.")
        
    def run_learning_loop(self):
        logger.info("[Scheduled Task] Running Jarvis Learning Loop optimization over .evals directory.")
        try:
            from jarvis_engine.skills.learning_loop.agent import run_learning_engine
            run_learning_engine()
        except Exception as e:
            logger.error(f"Learning Loop agent failed: {e}")

    def start(self):
        logger.info("Starting Jarvis Scheduler Mode (APScheduler)...")
        self.scheduler.start()
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            self.stop()

    def stop(self):
        logger.info("Stopping Jarvis Scheduler...")
        self.scheduler.shutdown()

def run_scheduler():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    memory = JarvisMemory("jarvis_memory.db")
    JS = JarvisScheduler(memory)
    JS.start()
