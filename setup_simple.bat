@echo off
echo ============================================================
echo TEST - Setup Script
echo ============================================================
echo.
echo If you can see this, the batch file is working!
echo.
echo Current directory: %CD%
echo.
pause
echo.
echo Now checking prerequisites...
echo.

REM Check Python
python --version
if errorlevel 1 (
    echo ERROR: Python not found!
    pause
    exit /b 1
)

REM Check Node.js
node --version
if errorlevel 1 (
    echo ERROR: Node.js not found!
    pause
    exit /b 1
)

REM Check npm
npm --version
if errorlevel 1 (
    echo ERROR: npm not found!
    pause
    exit /b 1
)

echo.
echo All checks passed!
pause

