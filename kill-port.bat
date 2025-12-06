@echo off
REM Batch script to kill process on port 3000
echo Looking for process using port 3000...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Found process ID: %%a
    taskkill /PID %%a /F
    echo Process %%a has been terminated.
    goto :done
)

echo No process found using port 3000
:done
pause

