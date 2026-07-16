import mss
import mss.tools
from PIL import Image
import base64
import io
import os
import requests
from typing import Dict, Any

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

class VisionCore:
    def __init__(self):
        self.sct = mss.mss()
        self.model = "llama-3.2-90b-vision-preview"

    def capture_and_encode(self, max_width=1280, max_height=720) -> str:
        # Pega o primeiro monitor (ou tela cheia fundida em sct.monitors[0])
        monitor = self.sct.monitors[1] # 1 é o monitor primário
        sct_img = self.sct.grab(monitor)
        
        # Converte a captação crua para o formato Pillow (RGB)
        img = Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")
        
        # Escala/comprime mantendo aspect ratio pro Llama Vision API nao estourar Token
        img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
        
        # Salva em memória como JPEG otimizado
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=85)
        
        # Codifica pra string base64 ASCII
        base64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return base64_str

    def analyze_screen(self, prompt: str) -> str:
        """
        Captura a tela instantaneamente e joga pro LLM Llama3.2 90B Vision no Groq.
        """
        if not GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY não definido no ambiente.")
            
        base64_img = self.capture_and_encode()
        
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_img}"}}
                    ]
                }
            ],
            "temperature": 0.1, # Extremamente determinístico para coordenadas GUI
            "max_tokens": 1024
        }
        
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        print(f"[Vision Core] Enviando captação otimizada para nuvem ({self.model})...")
        response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
        
        if response.status_code == 200:
            res_data = response.json()
            return res_data["choices"][0]["message"]["content"]
        else:
            raise Exception(f"Falha na Comunicação Groq Vision: {response.text}")
