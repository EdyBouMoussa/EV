# PowerShell script to run both backend and frontend servers
# Usage: .\run.ps1

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "🚀 Starting EV Ports Application" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Function to handle cleanup on exit
function Cleanup {
    Write-Host "`n🛑 Shutting down servers..." -ForegroundColor Yellow
    if ($backendJob) {
        Stop-Job $backendJob -ErrorAction SilentlyContinue
        Remove-Job $backendJob -ErrorAction SilentlyContinue
    }
    if ($frontendJob) {
        Stop-Job $frontendJob -ErrorAction SilentlyContinue
        Remove-Job $frontendJob -ErrorAction SilentlyContinue
    }
    Write-Host "✅ Servers stopped." -ForegroundColor Green
}

# Register cleanup function
Register-EngineEvent PowerShell.Exiting -Action { Cleanup } | Out-Null

# Check if node_modules exists in frontend
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "⚠️  node_modules not found. Running 'npm install' first..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ npm install failed!" -ForegroundColor Red
        exit 1
    }
    Set-Location ..
}

# Start backend server
Write-Host "🚀 Starting backend server..." -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location backend
    python -m backend.app
}

# Wait a moment for backend to start
Start-Sleep -Seconds 2

# Start frontend server
Write-Host "🚀 Starting frontend server..." -ForegroundColor Green
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location frontend
    npm run dev
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "✅ Both servers are running!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "📡 Backend: http://127.0.0.1:5000" -ForegroundColor Cyan
Write-Host "🌐 Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers..." -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Monitor jobs and wait for user interrupt
try {
    while ($true) {
        # Check if jobs are still running
        $backendState = (Get-Job $backendJob).State
        $frontendState = (Get-Job $frontendJob).State
        
        if ($backendState -eq "Failed" -or $backendState -eq "Completed") {
            Write-Host "`n⚠️  Backend server stopped!" -ForegroundColor Red
            break
        }
        if ($frontendState -eq "Failed" -or $frontendState -eq "Completed") {
            Write-Host "`n⚠️  Frontend server stopped!" -ForegroundColor Red
            break
        }
        
        Start-Sleep -Seconds 1
    }
} catch {
    Write-Host "`n⚠️  Error occurred: $_" -ForegroundColor Red
} finally {
    Cleanup
}

