@echo off
chcp 65001 >nul
setlocal
title Lektor Indito

set "BACKEND_DIR=%~dp0backend"
set "UI_DIR=%~dp0ui"

echo ========================================
echo        LEKTOR ALKALMAZAS INDITO
echo ========================================

:: 1. Python ellenorzese
python --version >nul 2>&1
if errorlevel 1 goto no_python

:: 2. Backend elokeszitese (csak ha szukseges)
echo.
echo [1/3] Backend ellenorzese...
if exist "%BACKEND_DIR%\.venv" goto backend_ok

echo     - Backend kornyezet letrehozasa (elso inditas)...
echo     - requirements.txt letrehozasa...
(
    echo PyYAML
    echo google-generativeai
    echo requests
    echo beautifulsoup4
    echo python-dotenv
    echo fastapi
    echo uvicorn
    echo python-multipart
    echo PyMuPDF
) > "%BACKEND_DIR%\requirements.txt"

echo     - Virtualis kornyezet letrehozasa...
python -m venv "%BACKEND_DIR%\.venv"

echo     - Fuggosegek telepitese...
call "%BACKEND_DIR%\.venv\Scripts\activate.bat"
pip install -r "%BACKEND_DIR%\requirements.txt"

:backend_ok
echo     - Backend kornyezet keszen all.

:: 3. Frontend elokeszitese (csak ha szukseges)
echo.
echo [2/3] Frontend ellenorzese...
if exist "%UI_DIR%\node_modules" goto frontend_ok

echo     - Frontend fuggosegek telepitese (elso inditas)...
echo       Kerlek varj, ez sokaig tarthat!
cd /d "%UI_DIR%"
call npm install

:frontend_ok
echo     - Frontend kornyezet keszen all.

:run_app
:: 4. Inditas
echo.
echo [3/3] Alkalmazas inditasa...
echo.
echo     - Backend inditasa (FastAPI/Uvicorn) uj ablakban...
start "Lektor Backend" cmd /k "cd /d "%BACKEND_DIR%" && call .venv\Scripts\activate.bat && uvicorn app:app --reload --port 8000"

echo     - Frontend inditasa (Vite) uj ablakban...
start "Lektor Frontend" cmd /k "cd /d "%UI_DIR%" && npm run dev"

echo.
echo Minden kesz! Nyisd meg a bongeszoben a Vite altal kiirt cimet.
pause
exit /b

:no_python
echo [HIBA] A Python nincs telepitve!
pause
exit /b
