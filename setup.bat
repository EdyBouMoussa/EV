@echo off
REM Setup script for EV Ports Application
REM This script will stay open even if there are errors

REM Change to script directory
cd /d "%~dp0"

REM Create a log file to see what's happening
set LOGFILE=setup_log.txt
echo Setup started at %DATE% %TIME% > "%LOGFILE%"
echo Current directory: %CD% >> "%LOGFILE%"

REM Redirect all output and errors
(
echo ============================================================
echo EV Ports Application - Setup Script
echo ============================================================
echo.
echo Current directory: %CD%
echo.
echo Step 1: Checking Prerequisites
echo.

REM Check Python
echo Checking Python...
python --version
if errorlevel 1 (
    echo ERROR: Python not found!
    echo Please install Python 3.11+
    goto :error
)
echo Python found!
echo.

REM Check Node.js
echo Checking Node.js...
node --version
if errorlevel 1 (
    echo ERROR: Node.js not found!
    echo Please install Node.js 18+
    goto :error
)
echo Node.js found!
echo.

REM Check npm
echo Checking npm...
npm --version
if errorlevel 1 (
    echo ERROR: npm not found!
    goto :error
)
echo npm found!
echo.

echo All prerequisites found!
echo.
echo Step 2: Database Setup
echo.
echo Database Setup Instructions:
echo 1. Start your MySQL server
echo 2. Open MySQL and run: SOURCE %CD%\database\init.sql;
echo.
set /p DB_SETUP="Have you set up the database? (y/n): "
if /i not "%DB_SETUP%"=="y" (
    echo.
    set /p CONTINUE="Continue anyway? (y/n): "
    if /i not "%CONTINUE%"=="y" (
        goto :error
    )
)
echo.

echo Step 3: Backend Setup
echo.

REM Create virtual environment
echo Creating virtual environment...
if not exist "backend\.venv\Scripts\python.exe" (
    if not exist "backend" (
        echo ERROR: backend directory not found!
        goto :error
    )
    
    cd backend
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment!
        cd ..
        goto :error
    )
    cd ..
    
    timeout /t 2 /nobreak >nul
    
    if not exist "backend\.venv\Scripts\python.exe" (
        echo ERROR: Virtual environment not created properly!
        goto :error
    )
    echo Virtual environment created!
) else (
    echo Virtual environment already exists!
)
echo.

REM Install dependencies
echo Installing Python dependencies...
if not exist "backend\.venv\Scripts\pip.exe" (
    echo ERROR: pip.exe not found!
    goto :error
)
call backend\.venv\Scripts\pip.exe install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies!
    goto :error
)
echo Dependencies installed!
echo.

REM Check cryptography
echo Checking cryptography...
backend\.venv\Scripts\python.exe -c "import cryptography" >nul 2>&1
if errorlevel 1 (
    echo Installing cryptography...
    call backend\.venv\Scripts\pip.exe install cryptography
    if errorlevel 1 (
        echo ERROR: Failed to install cryptography!
        goto :error
    )
)
echo.

REM Create database tables
echo Creating database tables...
backend\.venv\Scripts\python.exe -c "from backend.app import create_app; from backend.extensions import db; app = create_app(); app.app_context().push(); db.create_all()" 2>nul
if errorlevel 1 (
    echo WARNING: Could not create tables. Make sure MySQL is running!
    set /p CONTINUE="Continue anyway? (y/n): "
    if /i not "%CONTINUE%"=="y" (
        goto :error
    )
) else (
    echo Database tables created!
)

REM Seed database
echo.
echo Seeding database...
backend\.venv\Scripts\python.exe -m backend.seed 2>nul
if errorlevel 1 (
    echo WARNING: Could not seed database.
) else (
    echo Database seeded!
)
echo.

echo Step 4: Frontend Setup
echo.
echo Installing Node.js dependencies...
if not exist "frontend" (
    echo ERROR: frontend directory not found!
    goto :error
)
cd frontend
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install frontend dependencies!
    cd ..
    goto :error
)
cd ..
echo Frontend dependencies installed!
echo.

echo ============================================================
echo Setup Complete!
echo ============================================================
echo.
echo You can now run: run.bat
echo.
goto :end

:error
echo.
echo ============================================================
echo Setup Failed!
echo ============================================================
echo Check the errors above.
echo Log file: %LOGFILE%
echo.
goto :end

:end
echo.
echo Press any key to exit...
pause >nul
) >> "%LOGFILE%" 2>&1

REM Also show output on screen
type "%LOGFILE%"
echo.
echo Full log saved to: %LOGFILE%
pause
