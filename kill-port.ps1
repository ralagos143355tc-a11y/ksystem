# PowerShell script to kill process on port 3000
# Usage: .\kill-port.ps1

$port = 3000
Write-Host "Looking for process using port $port..." -ForegroundColor Yellow

$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($process) {
    Write-Host "Found process ID: $process" -ForegroundColor Red
    Stop-Process -Id $process -Force
    Write-Host "Process $process has been terminated." -ForegroundColor Green
} else {
    Write-Host "No process found using port $port" -ForegroundColor Green
}

