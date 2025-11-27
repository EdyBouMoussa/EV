@echo off
REM Batch script to run both backend and frontend servers
REM Usage: run.bat

REM Change to the directory where this batch file is located
cd /d "%~dp0"
if errorlevel 1 (
    echo ERROR: Could not change to script directory!
    pause
    exit /b 1
)

echo ==================================================
echo Starting EV Ports Application
echo ==================================================
echo Current directory: %CD%
echo.

REM Check if node_modules exists in frontend
if not exist "frontend\node_modules" (
    echo node_modules not found. Running 'npm install' first...
    cd frontend
    call npm install
    if errorlevel 1 (
        echo npm install failed!
        pause
        exit /b 1
    )
    cd ..
)

REM Determine Python command based on venv
set PYTHON_CMD=python
if exist "backend\.venv\Scripts\python.exe" (
    set PYTHON_CMD=backend\.venv\Scripts\python.exe
    echo Using virtual environment Python...
) else if exist "backend\venv\Scripts\python.exe" (
    set PYTHON_CMD=backend\venv\Scripts\python.exe
    echo Using virtual environment Python...
) else (
    echo No virtual environment found. Using system Python...
)

REM Check if cryptography is installed (required for MySQL)
echo Checking if cryptography is installed...
%PYTHON_CMD% -c "import cryptography" 2>nul
if errorlevel 1 (
    echo.
    echo cryptography package is missing! Installing...
    %PYTHON_CMD% -m pip install cryptography
    if errorlevel 1 (
        echo.
        echo Failed to install cryptography!
        echo Please run manually: %PYTHON_CMD% -m pip install cryptography
        pause
        exit /b 1
    )
    echo cryptography installed successfully!
    echo.
)

REM Start backend server in a new window
echo Starting backend server...
if exist "backend\.venv\Scripts\activate.bat" (
    start "Backend Server" cmd /k "cd /d %CD% && call backend\.venv\Scripts\activate.bat && python -m backend.app"
) else if exist "backend\venv\Scripts\activate.bat" (
    start "Backend Server" cmd /k "cd /d %CD% && call backend\venv\Scripts\activate.bat && python -m backend.app"
) else (
    start "Backend Server" cmd /k "cd /d %CD% && python -m backend.app"
)

REM Wait a moment for backend to start
timeout /t 2 /nobreak >nul

REM Start frontend server in a new window
echo Starting frontend server...
start "Frontend Server" cmd /k "cd /d %CD%\frontend && npm run dev"

echo.
echo ==================================================
echo Both servers are running!
echo ==================================================
echo Backend: http://127.0.0.1:5000
echo Frontend: http://localhost:5173
echo.
echo Close the command windows to stop the servers.
echo ==================================================
echo.

pause
