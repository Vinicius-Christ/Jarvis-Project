import os
import json
import time
from functools import wraps
from datetime import datetime

EVALS_DIR = ".evals"

def init_evals():
    if not os.path.exists(EVALS_DIR):
        os.makedirs(EVALS_DIR)

def track_eval(skill_name: str):
    """Decorator to measure agent execution and auto-generate evaluation JSONs for the Learning Loop."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            init_evals()
            start_time = time.time()
            status = "success"
            error_msg = ""
            result = None
            try:
                result = func(*args, **kwargs)
            except Exception as e:
                status = "failed"
                error_msg = str(e)
                raise e
            finally:
                latency = time.time() - start_time
                eval_data = {
                    "skill": skill_name,
                    "timestamp": datetime.now().isoformat(),
                    "latency_seconds": latency,
                    "status": status,
                    "error": error_msg,
                    "input_args": str(args),
                    "input_kwargs": str(kwargs),
                    "output_preview": str(result)[:500] if result else None
                }
                
                # Previne erros de charset e lida com caracteres especiais nos dumps JSON
                filename = f"{EVALS_DIR}/{skill_name}_{int(time.time())}.json"
                with open(filename, "w", encoding='utf-8') as f:
                    json.dump(eval_data, f, indent=2, ensure_ascii=False)
            return result
        return wrapper
    return decorator
