#!/usr/bin/env pwsh
# Startup script for Durchex Games development environment
# Usage: .\start-dev.ps1

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Durchex Games Development Environment Startup" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# Check if we're in the correct directory
if (-not (Test-Path "server/package.json")) {
    Write-Host "❌ Error: Must run from project root directory" -ForegroundColor Red
    Write-Host "   Current directory: $(Get-Location)" -ForegroundColor Red
    exit 1
}

Write-Host "`n✓ Found project structure" -ForegroundColor Green

# Check CORS configuration
Write-Host "`n📋 Checking CORS configuration..." -ForegroundColor Yellow
$envFile = Get-Content "server/.env" -Raw
if ($envFile -match "CORS_ORIGINS.*localhost:5173") {
    Write-Host "✓ CORS correctly set to localhost:5173" -ForegroundColor Green
} else {
    Write-Host "⚠️  Warning: CORS might not be set to localhost:5173" -ForegroundColor Yellow
    Write-Host "   Run: npm run fix-cors" -ForegroundColor Yellow
}

# Create two new terminal windows for backend and frontend
Write-Host "`n🚀 Starting development servers..." -ForegroundColor Green
Write-Host "   Backend:  http://localhost:4000" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Cyan

# Start backend in new terminal
Write-Host "`n► Starting backend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "
    Set-Location '$((Get-Location).Path)\server'
    Write-Host 'Starting backend...' -ForegroundColor Green
    npm run dev
"

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start frontend in new terminal
Write-Host "► Starting frontend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "
    Set-Location '$((Get-Location).Path)'
    Write-Host 'Starting frontend...' -ForegroundColor Green
    npm run dev
"

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✓ Development servers starting in new terminals" -ForegroundColor Green
Write-Host "`n📚 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open http://localhost:5173 in your browser" -ForegroundColor White
Write-Host "  2. Open DevTools (F12) → Console tab" -ForegroundColor White
Write-Host "  3. Follow MANUAL_DEBUGGING_GUIDE.md for testing" -ForegroundColor White
Write-Host "`n📊 To inspect existing bets:" -ForegroundColor Yellow
Write-Host "  cd server && npx ts-node debug-bets.ts" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
