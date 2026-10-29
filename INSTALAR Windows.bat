@echo off
rem Dois cliques no Explorer: instala (ou atualiza) a extensao O PADEIRO no After Effects.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0extension\scripts\install-win.ps1"
echo.
pause
