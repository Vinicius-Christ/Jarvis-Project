import os
import json
import glob
import requests

class LearningLoopAgent:
    def __init__(self):
        self.evals_dir = ".evals"
        self.groq_api_key = os.environ.get("GROQ_API_KEY", "")

    def pull_evals(self) -> list:
        if not os.path.exists(self.evals_dir):
            return []
        
        json_files = glob.glob(f"{self.evals_dir}/*.json")
        evals = []
        for file in json_files:
            with open(file, 'r', encoding='utf-8') as f:
                try:
                    evals.append(json.load(f))
                except json.JSONDecodeError:
                    pass
        return evals

    def analyze_patterns_and_optimize(self):
        print(f"[Learning Loop] Iniciando otimização baseada no diretório {self.evals_dir}...")
        evals = self.pull_evals()
        if not evals:
            print("[Learning Loop] Nenhum JSON de avaliação encontrado. Nada a otimizar no momento.")
            return

        failed_evals = [e for e in evals if e.get("status") == "failed"]
        if not failed_evals:
            print("[Learning Loop] Nenhuma falha identificada. Taxa de sucesso 100%. Nenhuma reescrita necessária.")
            return

        print(f"[Learning Loop] Identificadas {len(failed_evals)} execuções falhas dentre o ecossistema.")
        
        if self.groq_api_key:
            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": "Você é o Otimizador Neural Interno do Sistema Jarvis. Sua missão é ler logs de erros de skills (arquivos python) e inferir quais regras faltantes devem ser adicionadas a força no arquivo SKILL.md para precaver esse erro no modelo RAG futuro."},
                    {"role": "user", "content": f"Aponte a restrição exata de sistema faltando para evitar estas falhas: {failed_evals[:5]}"}
                ]
            }
            try:
                res = requests.post("https://api.groq.com/openai/v1/chat/completions", headers={"Authorization": f"Bearer {self.groq_api_key}"}, json=payload, timeout=15)
                if res.ok:
                    feedback = res.json()["choices"][0]["message"]["content"]
                    print("\n[AI Feedback / Rewriting Module Generated]:\n", feedback)
                    # Exemplo: self.apply_skill_patches(feedback) será injetado num pipeline que abre o *.md target e empurra o payload.
                else:
                    print(f"Status Code falhou na GROQ: {res.status_code}")
            except Exception as e:
                print(f"[Learning Loop] Erro na ponte LLM Groq (HTTPS Timeout/Fail): {str(e)}")
        else:
            print("[Learning Loop] Skipping AI inferencing on errors. GROQ_API_KEY_MISSING")

def run_learning_engine():
    agent = LearningLoopAgent()
    agent.analyze_patterns_and_optimize()
