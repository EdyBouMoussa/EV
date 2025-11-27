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
set VENV_EXISTS=0
if exist "backend\.venv\Scripts\python.exe" (
    set PYTHON_CMD=backend\.venv\Scripts\python.exe
    set VENV_EXISTS=1
    echo Using virtual environment Python...
) else if exist "backend\venv\Scripts\python.exe" (
    set PYTHON_CMD=backend\venv\Scripts\python.exe
    set VENV_EXISTS=1
    echo Using virtual environment Python...
) else (
    echo.
    echo ============================================================
    echo WARNING: No virtual environment found!
    echo ============================================================
    echo.
    echo The virtual environment has not been created yet.
    echo You need to run setup.bat first to initialize the project.
    echo.
    echo Would you like to:
    echo   1. Run setup.bat now (recommended)
    echo   2. Create venv and install dependencies automatically
    echo   3. Continue with system Python (not recommended)
    echo.
    set /p CHOICE="Enter choice (1/2/3): "
    
    if "%CHOICE%"=="1" (
        echo.
        echo Running setup.bat...
        call setup.bat
        if errorlevel 1 (
            echo Setup failed! Please run setup.bat manually.
            pause
            exit /b 1
        )
        REM Re-check for venv after setup
        if exist "backend\.venv\Scripts\python.exe" (
            set PYTHON_CMD=backend\.venv\Scripts\python.exe
            set VENV_EXISTS=1
        ) else if exist "backend\venv\Scripts\python.exe" (
            set PYTHON_CMD=backend\venv\Scripts\python.exe
            set VENV_EXISTS=1
        )
    ) else if "%CHOICE%"=="2" (
        echo.
        echo Creating virtual environment...
        cd backend
        python -m venv .venv
        if errorlevel 1 (
            echo Failed to create virtual environment!
            pause
            exit /b 1
        )
        cd ..
        echo Installing dependencies...
        call backend\.venv\Scripts\pip.exe install -r requirements.txt
        if errorlevel 1 (
            echo Failed to install dependencies!
            pause
            exit /b 1
        )
        set PYTHON_CMD=backend\.venv\Scripts\python.exe
        set VENV_EXISTS=1
        echo Virtual environment created and dependencies installed!
    ) else (
        echo.
        echo WARNING: Using system Python. This is not recommended!
        echo Make sure all dependencies are installed globally.
        echo.
        pause
    )
    echo.
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
if %VENV_EXISTS%==1 (
    if exist "backend\.venv\Scripts\activate.bat" (
        start "Backend Server" cmd /k "cd /d %CD% && call backend\.venv\Scripts\activate.bat && python -m backend.app"
    ) else (
        start "Backend Server" cmd /k "cd /d %CD% && call backend\venv\Scripts\activate.bat && python -m backend.app"
    )
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
