import fitz  # PyMuPDF
import json
import os

def extract_text_from_pdf(pdf_path):
    """Extrahiert den gesamten Text aus einer PDF-Datei."""
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def extract_metadata_from_pdf(pdf_path):
    """Extrahiert Metadaten aus der PDF-Datei."""
    doc = fitz.open(pdf_path)
    metadata = doc.metadata
    return metadata

if __name__ == "__main__":
    # Test
    # test_pdf = "sample.pdf"
    # if os.path.exists(test_pdf):
    #     print(extract_text_from_pdf(test_pdf))
    pass
