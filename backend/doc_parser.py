import docx

def extract_text_from_docx(file_path):
    """Kinyeri a szöveget egy .docx fájlból."""
    try:
        doc = docx.Document(file_path)
        full_text = []
        for para in doc.paragraphs:
            full_text.append(para.text)
        return "\n".join(full_text)
    except Exception as e:
        return f"Error extracting DOCX: {str(e)}"
