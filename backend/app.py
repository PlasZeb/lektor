import os
import shutil
import yaml
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pdf_parser import extract_text_from_pdf
from requirement_extractor import extract_requirements
from analyzer import analyze_paper
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# CORS engedélyezése a frontend számára
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
GUIDELINES_DIR = "guidelines"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(GUIDELINES_DIR, exist_ok=True)

@app.get("/guidelines")
async def list_guidelines():
    """Listázza a mentett folyóirat irányelveket."""
    files = []
    for filename in os.listdir(GUIDELINES_DIR):
        if filename.endswith(".yaml"):
            path = os.path.join(GUIDELINES_DIR, filename)
            stats = os.stat(path)
            # Fájlnévből kinyerjük a nevet (pl: Nature_2024-01-18.yaml -> Nature)
            display_name = filename.rsplit("_", 1)[0] if "_" in filename else filename.replace(".yaml", "")
            files.append({
                "id": filename,
                "name": display_name,
                "date": datetime.fromtimestamp(stats.st_mtime).strftime("%Y-%m-%d %H:%M"),
                "filename": filename
            })
    return sorted(files, key=lambda x: x["date"], reverse=True)

@app.post("/save-guideline")
async def save_guideline(name: str = Form(...), content: str = Form(...)):
    """Elmenti a YAML irányelvet egy új fájlba."""
    try:
        # Tisztítjuk a nevet a fájlnévhez
        safe_name = "".join([c for c in name if c.isalnum() or c in (" ", "-", "_")]).strip().replace(" ", "_")
        timestamp = datetime.now().strftime("%Y-%m-%d")
        filename = f"{safe_name}_{timestamp}.yaml"
        file_path = os.path.join(GUIDELINES_DIR, filename)
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
            
        return {"status": "success", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/guideline/{filename}")
async def get_guideline(filename: str):
    """Beolvas egy konkrét irányelvet."""
    file_path = os.path.join(GUIDELINES_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Irányelv nem található")
    
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    return {"content": content}

from doc_parser import extract_text_from_docx
from typing import Optional

@app.post("/extract-rules")
async def get_rules(
    source: Optional[str] = Form(None), 
    file: Optional[UploadFile] = File(None)
):
    """
    Kibányássza a szabályokat, felismeri a folyóiratot és automatikusan elmenti.
    """
    try:
        content = ""
        if file:
            temp_path = os.path.join(UPLOAD_DIR, f"temp_{file.filename}")
            with open(temp_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            if file.filename.lower().endswith(".pdf"):
                content = extract_text_from_pdf(temp_path)
            elif file.filename.lower().endswith((".docx", ".doc")):
                content = extract_text_from_docx(temp_path)
            
            if os.path.exists(temp_path):
                os.remove(temp_path)
        else:
            content = source

        if not content:
            raise HTTPException(status_code=400, detail="Hiányzó forrás!")

        rules_yaml = extract_requirements(content)
        
        if rules_yaml.startswith("Error"):
            raise HTTPException(status_code=400, detail=rules_yaml)

        # PRÓBÁLJUK MEG KINYERNI A NEVET AZ AUTOMATIKUS MENTÉSHEZ
        journal_name = "Ismeretlen_Folyoirat"
        try:
            parsed = yaml.safe_load(rules_yaml)
            if 'publisher_info' in parsed and 'name' in parsed['publisher_info']:
                journal_name = parsed['publisher_info']['name']
        except:
            pass

        # AUTOMATIKUS MENTÉS
        safe_name = "".join([c for c in journal_name if c.isalnum() or c in (" ", "-", "_")]).strip().replace(" ", "_")
        timestamp = datetime.now().strftime("%Y-%m-%d")
        filename = f"{safe_name}_{timestamp}.yaml"
        file_path = os.path.join(GUIDELINES_DIR, filename)
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(rules_yaml)
            
        return {
            "rules": rules_yaml, 
            "journal_name": journal_name,
            "filename": filename
        }
    except Exception as e:
        print(f"Extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    rules_yaml: str = Form(...),
    criterion: str = Form("Összes szempont"),
    language: str = Form("magyar")
):
    """
    Elemzi a feltöltött PDF-et a megadott szabályok és nyelv alapján.
    """
    try:
        # Fájl mentése
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Szöveg kinyerése
        text = extract_text_from_pdf(file_path)
        
        # Elemzés indítása
        report = analyze_paper(text, rules_yaml, criterion, language)
        
        # Ideiglenes fájl törlése
        if os.path.exists(file_path):
            os.remove(file_path)
            
        return {"report": report}
    except Exception as e:
        print(f"Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
