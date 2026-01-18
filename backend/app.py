from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
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
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/extract-rules")
async def get_rules(source: str = Form(...), type: str = Form(...)):
    """
    Kibányássza a szabályokat egy URL-ből vagy szövegből.
    """
    try:
        rules_yaml = extract_requirements(source)
        if rules_yaml.startswith("Error"):
            raise HTTPException(status_code=400, detail=rules_yaml)
        return {"rules": rules_yaml}
    except Exception as e:
        print(f"Extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
async def run_analysis(
    file: UploadFile = File(...), 
    rules: str = Form(...),
    criterion: str = Form(None)
):
    """
    Feltöltött PDF elemzése a megadott YAML szabályok alapján. 
    Opcionálisan egy konkrét kritérium szerint.
    """
    try:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Szöveg kinyerése
        text = extract_text_from_pdf(file_path)
        
        # Elemzés
        report = analyze_paper(text, rules, criterion)
        
        return {
            "report": report,
            "filename": file.filename,
            "criterion": criterion
        }
    except Exception as e:
        print(f"Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
