import os
import yaml
import google.generativeai as genai
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def fetch_url_content(url):
    """Lekéri a weboldal szöveges tartalmát."""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        # Eltávolítjuk a szkripteket és stílusokat
        for script in soup(["script", "style"]):
            script.decompose()
        return soup.get_text(separator=' ', strip=True)
    except Exception as e:
        return f"Error fetching URL: {str(e)}"

def extract_requirements(source_content, is_url=False):
    """
    Kinyeri a kiadói elvárásokat az adott tartalomból (szöveg vagy URL) 
    és YAML formátumban adja vissza.
    """
    if is_url or (source_content.startswith("http://") or source_content.startswith("https://")):
        source_content = fetch_url_content(source_content)
        if source_content.startswith("Error"):
            return source_content

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_key_here":
        return """
publisher_info:
  name: "DEMO MOD (Nincs API kulcs)"
structural_requirements:
  word_count_min: 3000
  word_count_max: 5000
  abstract_required: true
  keywords_required: true
  sections_required: ["Bevezetés", "Módszertan", "Eredmények", "Diszkusszió"]
citation_style:
  style_name: "APA"
  formatting_rules: "Standard APA 7. kiadás"
content_evaluation_criteria:
  - "Tudományos újdonság"
  - "Módszertani alaposság"
"""

    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = f"""
    Te egy precíz tudományos adatelemző vagy. A feladatod, hogy az alábbi forrásdokumentumból kinyerj MINDEN egyes publikációs követelményt és irányelvet. 
    A kimenetnek egy szigorúan érvényes YAML struktúrának kell lennie.

    SZIGORÚ SZABÁLYOK:
    1. Ne hagyj ki semmilyen formai vagy tartalmi követelményt!
    2. Az értéket (számok, igaz/hamis) pontosan a szövegből vedd át.
    3. A 'content_evaluation_criteria' lista legyen kimerítő: minden olyan szempontot tartalmazzon, ami alapján a bírálók a tanulmányt értékelik (pl. nyelvhelyesség, hivatkozások pontossága, ábrák minősége, tudományos nóvum stb.).
    4. Ha a szövegben speciális utasítások vannak (pl. "a képeket külön fájlban", "a szerzők neve nem szerepelhet"), ezeket is foglald bele a YAML-be a megfelelő kategória alatt vagy egy 'special_notes' szekcióba.
    5. A megfogalmazások tükrözzék az eredeti dokumentum szigorát és stílusát.

    ELVÁRT STRUKTÚRA (Példa, de bővítsd bátran):
    publisher_info:
      name: "..."
      guideline_url: "..."
    structural_requirements:
      word_count_min: szám
      word_count_max: szám
      abstract_required: true/false
      keywords_required: true/false
      sections_required: ["...", "..."]
      formatting_details: "Betűtípus, margó, sortávolság stb."
    citation_style:
      style_name: "..."
      formatting_rules: "..."
      citation_frequency_note: "Speciális megjegyzés hivatkozásokról"
    content_evaluation_criteria:
      - "Kritérium 1: pontos leírás a dokumentumból"
      - "Kritérium 2: pontos leírás a dokumentumból"
      - ... (MINDEN szempontot sorolj fel!)
    special_notes:
      - "Speciális utasítás 1"
      - ...

    FORRÁS TARTALOM:
    ---
    {source_content}
    ---

    Kimenet: Csak a tiszta YAML kód, markdown blokk nélkül.
    """
    
    response = model.generate_content(prompt)
    try:
        # A válasz tisztítása és YAML-sé alakítása
        content = response.text.strip()
        if content.startswith("```yaml"):
            content = content.replace("```yaml", "").replace("```", "").strip()
        elif content.startswith("```"):
            content = content.replace("```", "").strip()
            
        # Validálás
        yaml.safe_load(content)
        return content
    except Exception as e:
        return f"Error parsing requirements: {str(e)}"

if __name__ == "__main__":
    # Test with a dummy text
    sample_text = "The paper must be between 3000 and 5000 words. APA style is required. Keywords are mandatory."
    # print(extract_requirements(sample_text))
    pass
