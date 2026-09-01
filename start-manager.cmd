@echo off
setlocal
cd /d "%~dp0"

set "MANAGER_URL=http://127.0.0.1:4310"
set "MANAGER_LOG=%CD%\manager.log"
set "MANAGER_ERROR_LOG=%CD%\manager-error.log"

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

set "PORTFOLIO_NODE=%NODE_EXE%"
powershell.exe -NoProfile -Command "$expected=[string][Math]::Truncate(([DateTimeOffset](Get-Item -LiteralPath '%CD%\manager\server.mjs').LastWriteTimeUtc).ToUnixTimeMilliseconds()); try { $health=Invoke-RestMethod -Uri '%MANAGER_URL%/api/health' -TimeoutSec 2; if ($health.service -eq 'portfolio-manager' -and $health.serverVersion -eq $expected) { exit 0 }; exit 1 } catch { exit 1 }"
if not errorlevel 1 goto open_manager

rem Stop only a stale Node process that is confirmed to be this manager.
powershell.exe -NoProfile -Command "$listener=Get-NetTCPConnection -LocalAddress '127.0.0.1' -LocalPort 4310 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($listener) { $process=Get-CimInstance Win32_Process -Filter ('ProcessId='+$listener.OwningProcess); if (-not $process -or $process.Name -notmatch '^node(\.exe)?$' -or $process.CommandLine -notmatch 'manager[\\/]server\.mjs') { Write-Host 'Port 4310 is occupied by another application. Close it and run this file again.'; exit 2 }; Stop-Process -Id $listener.OwningProcess -Force; Start-Sleep -Milliseconds 500 }; Start-Process -FilePath $env:PORTFOLIO_NODE -ArgumentList 'manager\server.mjs' -WorkingDirectory '%CD%' -WindowStyle Hidden -RedirectStandardOutput '%MANAGER_LOG%' -RedirectStandardError '%MANAGER_ERROR_LOG%'"
if errorlevel 2 (
  pause
  exit /b 1
)

set /a RETRIES=0
:wait_for_manager
powershell.exe -NoProfile -Command "$expected=[string][Math]::Truncate(([DateTimeOffset](Get-Item -LiteralPath '%CD%\manager\server.mjs').LastWriteTimeUtc).ToUnixTimeMilliseconds()); try { $health=Invoke-RestMethod -Uri '%MANAGER_URL%/api/health' -TimeoutSec 2; if ($health.service -eq 'portfolio-manager' -and $health.serverVersion -eq $expected) { exit 0 }; exit 1 } catch { exit 1 }"
if not errorlevel 1 goto open_manager
set /a RETRIES+=1
if %RETRIES% LSS 6 (
  timeout /t 1 /nobreak >nul
  goto wait_for_manager
)

echo The manager did not start. Open manager.log and manager-error.log in this folder to see the error.
pause
exit /b 1

:open_manager
start "" "%MANAGER_URL%/"
echo Portfolio Manager is running at %MANAGER_URL%/
echo You can close this window. The manager keeps running in the background.
timeout /t 2 /nobreak >nul
exit /b 0
