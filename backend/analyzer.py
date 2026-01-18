import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def analyze_paper(paper_text, requirements_yaml, criterion=None):
    """
    Elemzi a tanulmányt a kért YAML követelmények alapján, 
    vagy egy konkrét kritérium szerint.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_key_here":
        criterion_msg = f" a(z) '{criterion}' szempont" if criterion else ""
        return f"""
# Demo Lektori Riport (Várakozás az API kulcsra)

Ez egy **szimulált lektori vélemény**{criterion_msg}.

## Állapot
A rendszer készen áll az éles tesztelésre a **gemma-3-27b** modellel.

**Teendő:** Másold be az API kulcsodat a `backend/.env` fájlba a `GEMINI_API_KEY` változóhoz!
"""

    model = genai.GenerativeModel('gemma-3-27b')
    
    scope = f"Kifejezetten az alábbi szempontot vizsgáld: {criterion}" if criterion else "Végezz teljes körű elemzést az összes kritérium alapján."
    
    prompt = f"""
    Te egy szigorú szakmai lektor vagy. Az alábbi tanulmányt kell elemezned 
    a megadott YAML követelményrendszer alapján.
    
    FONTOS: {scope}
    
    KÖVETELMÉNYEK (YAML):
    {requirements_yaml}
    
    TANULMÁNY SZÖVEGE:
    {paper_text}
    
    FELADAT:
    1. Koncentrálj a kért szempontra (ha van).
    2. Ellenőrizd a formai és tartalmi megfelelést.
    3. Adj konkrét példákat a szövegből a hibákra.
    4. Adj javítási javaslatot.
    
    Kimenet formátuma: Markdown riport.
    """
    
    response = model.generate_content(prompt)
    return response.text

if __name__ == "__main__":
    pass
