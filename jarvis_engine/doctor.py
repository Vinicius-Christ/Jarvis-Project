import os
import sqlite3
import requests
import logging
import time
from pathlib import Path

def print_result(check: str, status: bool, detail: str = ""):
    color = "\033[92m[OK]\033[0m" if status else "\033[91m[FALHA]\033[0m"
    print(f"{color} {check}" + (f" -> {detail}" if detail else ""))

def load_env():
    env_path = Path(".env")
    if env_path.exists():
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip()
        return True
    return False

def run_doctor():
    print("=" * 45)
    print(" 🩺 JARVIS DOCTOR - DIAGNÓSTICO DO SISTEMA")
    print("=" * 45)

    # 1. Check .env
    env_exists = load_env()
    print_result("Verificando arquivo .env", env_exists, "Encontrado e carregado." if env_exists else "Arquivo .env ausente (!)")

    # 2. Check GROQ API KEY
    groq_key = os.environ.get("GROQ_API_KEY", "")
    has_groq = bool(groq_key and len(groq_key) > 5)
    print_result("Chave GROQ_API_KEY", has_groq, "Configurada nas variáveis de ambiente." if has_groq else "Não encontrada ou incompleta.")

    # 3. Ping API Groq na nuvem
    if has_groq:
        try:
            start_time = time.time()
            res = requests.get("https://api.groq.com/openai/v1/models", headers={"Authorization": f"Bearer {groq_key}"}, timeout=5)
            latency = int((time.time() - start_time) * 1000)
            if res.ok:
                print_result("Ping API da Groq (LPU)", True, f"Latência Cloud: {latency}ms")
            else:
                print_result("Ping API da Groq (LPU)", False, f"Status Code: {res.status_code}")
        except Exception as e:
            print_result("Ping API da Groq (LPU)", False, f"Erro de conexão HTTPS: {str(e)}")
    else:
        print_result("Ping API da Groq (LPU)", False, "Ignorado, chave ausente.")

    # 4. Check SQLite
    db_path = "jarvis_memory.db"
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [t[0] for t in cursor.fetchall()]
        conn.close()
        print_result("Banco SQLite Local (Memória)", True, f"Acessível. Tabelas: {tables}")
    except Exception as e:
        print_result("Banco SQLite Local (Memória)", False, f"Erro ao acessar BD: {str(e)}")

    print("=" * 45)
    print(" Diagnóstico finalizado.")

if __name__ == "__main__":
    run_doctor()
