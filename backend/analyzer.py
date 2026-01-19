import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def get_demo_report(criterion=None):
    criterion_msg = f" a(z) '{criterion}' szempont" if criterion else ""
    return f"""
# Demo Lektori Riport (Várakozás az API kulcsra)

Ez egy **szimulált lektori vélemény**{criterion_msg}.

## Állapot
A rendszer készen áll az éles tesztelésre a **Gemini 1.5 Pro** modellel.

**Teendő:** Másold be az API kulcsodat a `backend/.env` fájlba a `GEMINI_API_KEY` változóhoz!
"""

def analyze_paper(paper_text, rules_yaml, criterion=None, language="magyar"):
    """
    Elemzi a tanulmányt az LLM segítségével a megadott YAML szabályok alapján.
    """
    if not os.getenv("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY") == "your_key_here":
        return get_demo_report(criterion)

    model = genai.GenerativeModel('gemini-1.5-flash')
    
    criterion_focus = f"SZIGORÚ FÓKUSZ: Csak és kizárólag a(z) '{criterion}' szempontot vizsgáld, de azt a legnagyobb részletességgel." if criterion and criterion != "Összes szempont" else "TELJES ELEMZÉS: Vizsgáld meg a tanulmányt a YAML-ben található ÖSSZES kritérium alapján."
    
    prompt = f"""
    Te egy elit tudományos folyóirat vezető lektora vagy. A feladatod a mellékelt tanulmány kimerítően pontos és szigorú ellenőrzése.
    
    AZ ELEMZÉS ALAPJÁUL SZOLGÁLÓ IRÁNYELVEK (YAML):
    {rules_yaml}
    
    KONKRÉT FELADAT:
    {criterion_focus}
    
    TANULMÁNY SZÖVEGE:
    {paper_text[:30000]}  # Increased limit for pro model
    
    SZIGORÚ KÖVETELMÉNYEK A LEKTORI VÉLEMÉNYHEZ:
    1. A jelentés nyelve: {language}
    2. PONTOSSÁG: Minden egyes formai követelményt (szószám, szekciók, hivatkozási stílus) vess össze a YAML-ben megadott pontos értékekkel.
    3. TÁRGYILAGOSSÁG: Ne csak általánosságokat írj. Ha valami nem felel meg, idézz vagy mutass rá a tanulmány konkrét pontjára.
    4. JAVÍTÁSI JAVASLATOK: Minden hibához rendelj egy konkrét, megvalósítható javítási tanácsot.
    5. STRUKTÚRA:
       - Vezetői összefoglaló (Megfelelés/Nem felelés státusza)
       - Részletes észrevételek (pontokba szedve, fókuszálva a kért kritériumra)
       - Erősségek
       - Fejlesztendő területek
    6. NYELVHELYESSÉG: Ha a nyelvhelyességet vizsgálod, a {language} nyelv tudományos stílusregiszterét vedd alapul.
    
    Kimenet formátuma: Professzionális Markdown.
    """
    
    response = model.generate_content(prompt)
    return response.text

if __name__ == "__main__":
    pass
