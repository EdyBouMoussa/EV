@echo off
REM Setup script for EV Ports Application
REM Run this after cloning the repository to initialize everything.

echo ============================================================
echo EV Ports Application - Setup Script
echo ============================================================
echo.

REM Change to the directory where this batch file is located
cd /d "%~dp0"

REM Step 1: Check Prerequisites
echo ============================================================
echo Step 1: Checking Prerequisites
echo ============================================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found! Please install Python 3.11+
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version') do echo Python: %%i
)

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found! Please install Node.js 18+
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do echo Node.js: %%i
)

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm not found!
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version') do echo npm: %%i
)

echo.
echo All prerequisites found!
echo.

REM Step 2: Database Setup
echo ============================================================
echo Step 2: Database Setup
echo ============================================================
echo.
echo Database Setup Instructions:
echo 1. Start your MySQL server
echo 2. Open MySQL command line or MySQL Workbench
echo 3. Run the following command:
echo    SOURCE %CD%\database\init.sql;
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
if not exist "backend\.venv" (
    echo Creating virtual environment...
    cd backend
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment!
        pause
        exit /b 1
    )
    cd ..
    echo Virtual environment created successfully!
) else (
    echo Virtual environment already exists.
)

REM Install dependencies
echo.
echo Installing Python dependencies...
call backend\.venv\Scripts\pip.exe install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)
echo Dependencies installed successfully!

REM Check for cryptography
echo.
echo Checking for cryptography package...
backend\.venv\Scripts\python.exe -c "import cryptography" >nul 2>&1
if errorlevel 1 (
    echo Installing cryptography (required for MySQL)...
    call backend\.venv\Scripts\pip.exe install cryptography
    if errorlevel 1 (
        echo ERROR: Failed to install cryptography!
        pause
        exit /b 1
    )
    echo cryptography installed successfully!
) else (
    echo cryptography already installed.
)

REM Create database tables
echo.
echo Creating database tables...
backend\.venv\Scripts\python.exe -c "from backend.app import create_app; from backend.extensions import db; app = create_app(); app.app_context().push(); db.create_all()"
if errorlevel 1 (
    echo WARNING: Could not create tables. Make sure MySQL is running and database is set up!
    set /p CONTINUE="Continue anyway? (y/n): "
    if /i not "%CONTINUE%"=="y" (
        exit /b 1
    )
) else (
    echo Database tables created successfully!
)

REM Seed database
echo.
echo Seeding database with sample data...
backend\.venv\Scripts\python.exe -m backend.seed
if errorlevel 1 (
    echo WARNING: Could not seed database. You can run it manually later with: python -m backend.seed
) else (
    echo Database seeded successfully!
)

REM Step 4: Frontend Setup
echo.
echo ============================================================
echo Step 4: Frontend Setup
echo ============================================================
echo.

echo Installing Node.js dependencies...
cd frontend
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install frontend dependencies!
    pause
    exit /b 1
)
cd ..
echo Frontend dependencies installed successfully!

REM Success message
echo.
echo ============================================================
echo Setup Complete!
echo ============================================================
echo.
echo You can now run the application using:
echo   - Windows: run.bat
echo   - PowerShell: .\run.ps1
echo   - Python: python run.py
echo.
echo Or manually:
echo   Backend: cd backend ^&^& .venv\Scripts\activate ^&^& python -m backend.app
echo   Frontend: cd frontend ^&^& npm run dev
echo.
echo ============================================================
echo.

pause

