import argparse
import sys
import logging

from jarvis_engine.memory import JarvisMemory
from jarvis_engine.daemon import run_daemon
from jarvis_engine.scheduler import run_scheduler

def run_ondemand(task: str):
    print(f"Executando modo on-demand. Tarefa requisitada: {task}")
    mem = JarvisMemory("jarvis_memory.db")
    print(f"Banco de memória local inicializado: {mem.db_path}")
    # Lógica de dispatch de agentes vai aqui
    print("Operação concluída.")

def main():
    parser = argparse.ArgumentParser(description="Jarvis Intelligence Backend Engine")
    parser.add_argument("--mode", choices=["daemon", "schedule", "on-demand", "doctor"], default="on-demand", help="Execution mode for the AI agent loop.")
    parser.add_argument("--task", type=str, help="Specify task content for on-demand mode", default="general")
    
    args = parser.parse_args()
    
    if args.mode == "daemon":
        run_daemon()
    elif args.mode == "schedule":
        run_scheduler()
    elif args.mode == "on-demand":
        run_ondemand(args.task)
    elif args.mode == "doctor":
        from jarvis_engine.doctor import run_doctor
        run_doctor()
    else:
        print("Modo de execução inválido.")
        sys.exit(1)

if __name__ == "__main__":
    main()
