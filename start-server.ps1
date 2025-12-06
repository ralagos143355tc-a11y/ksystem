# PowerShell script to start server after killing any process on port 3000
Write-Host "Starting server on port 3000..." -ForegroundColor Cyan

# Kill any process using port 3000
$port = 3000
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($process) {
    Write-Host "Found existing process on port $port (PID: $process), killing it..." -ForegroundColor Yellow
    Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Start the server
Write-Host "Starting Node.js server..." -ForegroundColor Green
node server.js
