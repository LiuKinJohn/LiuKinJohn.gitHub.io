@echo off
setlocal
cd /d "%~dp0"

set "NODE_EXE=node"
where node >nul 2>&1
if errorlevel 1 (
  if exist "C:\Users\15234\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
    set "NODE_EXE=C:\Users\15234\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  ) else (
    echo Node.js 20 or newer is required to run the local Portfolio Manager.
    echo Install it from https://nodejs.org/ and run this file again.
    pause
    exit /b 1
  )
)

powershell.exe -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:4310/api/projects' -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
if not errorlevel 1 goto open_manager

start "Portfolio Manager" /b "%NODE_EXE%" "manager\server.mjs" > "manager.log" 2>&1
timeout /t 2 /nobreak >nul

powershell.exe -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:4310/api/projects' -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  echo The manager did not start. Open manager.log in this folder to see the error.
  pause
  exit /b 1
)

:open_manager
start "" "http://127.0.0.1:4310/"
echo Portfolio Manager is running at http://127.0.0.1:4310/
echo Keep this window open while editing or publishing.
pause
