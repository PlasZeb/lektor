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

    model = genai.GenerativeModel('gemma-3-27b')
    
    prompt = f"""
    Te egy szakmai lektor asszisztens vagy. A feladatod, hogy az alábbi kiadói irányelvekből 
    kinyerd a kért formai és tartalmi elvárásokat.
    
    A kért YAML struktúra:
    publisher_info:
      name: "Kiadó neve"
      guideline_url: "Forrás URL ha van"
    structural_requirements:
      word_count_min: szám
      word_count_max: szám
      abstract_required: true/false
      keywords_required: true/false
      sections_required: ["Introduction", "Methods", ...]
    citation_style:
      style_name: "APA/IEEE/etc"
      formatting_rules: "Rövid leírás"
    content_evaluation_criteria:
      - "Kritérium 1"
      - "Kritérium 2"
      
    Forrás tartalom:
    {source_content}
    
    Csak a YAML kódot add vissza, markdown blokk nélkül.
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
