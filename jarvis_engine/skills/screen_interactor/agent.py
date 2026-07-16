import pyautogui
import json
import re
from typing import Dict, Any
from jarvis_engine.vision_core import VisionCore
import os

# Suprimir mecanismo de defesa de cantos de GUI caso a resolução falhe no mapeamento
pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0.5 

class ScreenInteractorAgent:
    def __init__(self):
        self.vision = VisionCore()
        
        # Pega a documentação do prompt injetando-a em runtime
        base_dir = os.path.dirname(os.path.abspath(__file__))
        skill_path = os.path.join(base_dir, "SKILL.md")
        try:
            with open(skill_path, "r", encoding="utf-8") as f:
                self.system_prompt = f.read()
        except FileNotFoundError:
            self.system_prompt = "Agente restrito JSON. Outputs: action, x, y, text_to_type, confidence."
        
    def execute_goal(self, goal: str) -> Dict[str, Any]:
        """
        Inicia a orquestração: Fotografa a tela -> Pergunta a Groove -> Parse JSON -> Controla Pyautogui
        """
        print(f"[Screen Interactor] Começando pipeline visual: '{goal}'")
        
        full_prompt = f"{self.system_prompt}\n\n[OBJETIVO DO USUÁRIO PARA NAVEGAÇÃO]: {goal}"
        
        try:
            # Envia p/ IA
            response = self.vision.analyze_screen(full_prompt)
            print(f"[Screen Interactor] Llama Vision Resposta:\n{response}")
            
            # Limpa ruídos markdown ou markdown-json que a LLM possa inserir no content
            json_response = re.sub(r'```(?:json)?|```', '', response).strip()
            
            # Robustez extra pra JSONDecode
            try:
                data = json.loads(json_response)
            except json.JSONDecodeError:
                json_match = re.search(r'\{(.*?)\}', json_response, re.DOTALL)
                if json_match:
                    data = json.loads(json_match.group(0))
                else:
                    return {"status": "error", "error": "LLM Vison não exportou JSON decodável"}
            
            action = data.get("action", "none")
            x = data.get("x", 0)
            y = data.get("y", 0)
            text_to_type = data.get("text_to_type", "")
            
            if action != "none":
                # Pyautogui move baseado na DPI real do PC (ex 1920x1080)
                # O LlamaVision calculou as matrizes X e Y em 1280x720 porque ele leu o frame encolhido.
                real_width, real_height = pyautogui.size()
                
                scale_x = real_width / 1280.0
                scale_y = real_height / 720.0
                
                # Interpola linearmente de volta
                scaled_x = int(x * scale_x)
                scaled_y = int(y * scale_y)
                
                print(f"[Screen Interactor] Mapeamento Linear DPI LLM ({x},{y}) -> Resolucao Fisica HW ({scaled_x},{scaled_y})")
                pyautogui.moveTo(scaled_x, scaled_y, duration=0.45, tween=pyautogui.easeInOutQuad)
                
                # Executa UI Hook
                if action == "click":
                    pyautogui.click()
                elif action == "double_click":
                    pyautogui.doubleClick()
                elif action == "right_click":
                    pyautogui.rightClick()
                elif action == "type":
                    if text_to_type:
                        pyautogui.click() # Assegurar foco de input no campo clicado antes de teclar
                        pyautogui.write(text_to_type, interval=0.03)
                        
            return {"status": "success", "executed_action": data}
            
        except Exception as e:
            print(f"[ERROR UI Loop] Exception Fatal capturada no VisionCore: {str(e)}")
            return {"status": "error", "error": str(e)}

if __name__ == '__main__':
    # Local Testing Module para Debugging de OCR UI e Coordinates
    agent = ScreenInteractorAgent()
    agent.execute_goal("Identifique o botão de Iniciar do Windows na barra de tarefas inferior e efetue um click.")
