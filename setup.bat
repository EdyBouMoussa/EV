@echo off
setlocal enabledelayedexpansion
REM Setup script for EV Ports Application
REM Run this after cloning the repository to initialize everything.

REM Ensure we're in the right directory
cd /d "%~dp0" 2>nul
if errorlevel 1 (
    echo ERROR: Could not change to script directory!
    pause
    exit /b 1
)

echo ============================================================
echo EV Ports Application - Setup Script
echo ============================================================
echo.
echo Current directory: %CD%
echo.

REM Step 1: Check Prerequisites
echo ============================================================
echo Step 1: Checking Prerequisites
echo ============================================================
echo.

REM Check Python
echo [1/3] Checking Python...
python --version 2>nul
if errorlevel 1 (
    echo.
    echo ERROR: Python not found!
    echo Please install Python 3.11+ and make sure it's in your PATH.
    echo.
    pause
    exit /b 1
)
echo OK - Python found
echo.

REM Check Node.js
echo [2/3] Checking Node.js...
node --version 2>nul
if errorlevel 1 (
    echo.
    echo ERROR: Node.js not found!
    echo Please install Node.js 18+ and make sure it's in your PATH.
    echo.
    pause
    exit /b 1
)
echo OK - Node.js found
echo.

REM Check npm
echo [3/3] Checking npm...
npm --version 2>nul
if errorlevel 1 (
    echo.
    echo ERROR: npm not found!
    echo.
    pause
    exit /b 1
)
echo OK - npm found
echo.

echo All prerequisites found!
echo.
pause

REM Step 2: Database Setup
echo ============================================================
echo Step 2: Database Setup
echo ============================================================
echo.
echo Database Setup Instructions:
echo 1. Start your MySQL server
echo 2. Open MySQL command line or MySQL Workbench
echo 3. Run: SOURCE %CD%\database\init.sql;
echo.
echo Or manually run:
echo    CREATE DATABASE IF NOT EXISTS ev_db;
echo    CREATE USER IF NOT EXISTS 'ev_user'@'localhost' IDENTIFIED BY 'ev_password';
echo    GRANT ALL PRIVILEGES ON ev_db.* TO 'ev_user'@'localhost';
echo    FLUSH PRIVILEGES;
echo.
set /p DB_SETUP="Have you set up the database? (y/n): "
if /i not "%DB_SETUP%"=="y" (
    echo.
    echo Please set up the database before continuing.
    set /p CONTINUE="Continue anyway? (y/n): "
    if /i not "%CONTINUE%"=="y" (
        pause
        exit /b 1
    )
)
echo.

REM Step 3: Backend Setup
echo ============================================================
echo Step 3: Backend Setup
echo ============================================================
echo.

REM Create virtual environment
echo [1/4] Creating virtual environment...
if not exist "backend\.venv\Scripts\python.exe" (
    if not exist "backend" (
        echo ERROR: backend directory not found!
        pause
        exit /b 1
    )
    
    cd backend
    python -m venv .venv
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to create virtual environment!
        echo Make sure Python is installed correctly.
        cd ..
        pause
        exit /b 1
    )
    cd ..
    
    REM Wait and verify
    timeout /t 2 /nobreak >nul
    
    if not exist "backend\.venv\Scripts\python.exe" (
        echo.
        echo ERROR: Virtual environment was not created properly!
        echo Expected: %CD%\backend\.venv\Scripts\python.exe
        pause
        exit /b 1
    )
    echo OK - Virtual environment created
) else (
    echo OK - Virtual environment already exists
)
echo.

REM Install dependencies
echo [2/4] Installing Python dependencies...
if not exist "backend\.venv\Scripts\pip.exe" (
    echo ERROR: pip.exe not found in virtual environment!
    pause
    exit /b 1
)
call backend\.venv\Scripts\pip.exe install -r requirements.txt
if errorlevel 1 (
    echo.
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)
echo OK - Dependencies installed
echo.

REM Check for cryptography
echo [3/4] Checking cryptography package...
backend\.venv\Scripts\python.exe -c "import cryptography" >nul 2>&1
if errorlevel 1 (
    echo Installing cryptography...
    call backend\.venv\Scripts\pip.exe install cryptography
    if errorlevel 1 (
        echo ERROR: Failed to install cryptography!
        pause
        exit /b 1
    )
    echo OK - cryptography installed
) else (
    echo OK - cryptography already installed
)
echo.

REM Create database tables
echo [4/4] Creating database tables...
backend\.venv\Scripts\python.exe -c "from backend.app import create_app; from backend.extensions import db; app = create_app(); app.app_context().push(); db.create_all()" 2>nul
if errorlevel 1 (
    echo.
    echo WARNING: Could not create tables!
    echo Make sure MySQL is running and database is set up.
    set /p CONTINUE="Continue anyway? (y/n): "
    if /i not "%CONTINUE%"=="y" (
        pause
        exit /b 1
    )
) else (
    echo OK - Database tables created
)

REM Seed database
echo.
echo Seeding database with sample data...
backend\.venv\Scripts\python.exe -m backend.seed 2>nul
if errorlevel 1 (
    echo WARNING: Could not seed database. You can run it manually later.
) else (
    echo OK - Database seeded
)
echo.

REM Step 4: Frontend Setup
echo ============================================================
echo Step 4: Frontend Setup
echo ============================================================
echo.

echo Installing Node.js dependencies...
if not exist "frontend" (
    echo ERROR: frontend directory not found!
    pause
    exit /b 1
)
cd frontend
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install frontend dependencies!
    cd ..
    pause
    exit /b 1
)
cd ..
echo OK - Frontend dependencies installed
echo.

REM Success message
echo ============================================================
echo Setup Complete!
echo ============================================================
echo.
echo You can now run the application using:
echo   - Windows: run.bat
echo   - PowerShell: .\run.ps1
echo   - Python: python run.py
echo.
echo ============================================================
echo.

pause
