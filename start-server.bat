@echo off
echo Checking for existing Node.js processes on port 3000...

REM Kill any existing Node.js processes
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo Starting server...
npm start

