@echo off
setlocal
cd /d "%~dp0.."
where py >nul 2>nul
if %errorlevel%==0 (
  py scripts\build-zen.py
) else (
  python scripts\build-zen.py
)
if errorlevel 1 (
  echo.
  echo Zen-Build fehlgeschlagen. Siehe Fehlermeldung oben.
  pause
  exit /b 1
)
echo.
echo Zen-Testpaket und CSS liegen im Ordner dist.
start "" "%CD%\dist"
pause
