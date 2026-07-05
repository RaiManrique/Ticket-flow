@echo off
setlocal
cd /d "%~dp0"
set TF_URL=http://localhost:8090
set TF_OUT=%~dp0output

echo ==^> App: %TF_URL%
curl -sf http://127.0.0.1:3000/api/health >nul 2>&1
if errorlevel 1 ( echo ERROR: API no responde & exit /b 1 )

if exist output rmdir /s /q output
mkdir output

echo ==^> Pruebas API...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-pruebas-api.ps1"
if errorlevel 1 exit /b 1

echo ==^> Capturas UI...
if not exist node_modules\playwright call npm install playwright --no-fund --no-audit --silent
node "%~dp0run-pruebas-ui.mjs"
if errorlevel 1 exit /b 1

set DEST=C:\Users\User\Desktop\Sistemas Operativos\TicketFlow-Pruebas
if not exist "%DEST%" mkdir "%DEST%"
powershell -NoProfile -Command "Copy-Item -Recurse -Force '%~dp0output\*' '%DEST%'"
if exist assets mkdir "%DEST%\medios-prueba" 2>nul & xcopy /Y assets\*.jpg "%DEST%\medios-prueba\" >nul 2>nul
echo ==^> Copiado a: %DEST%
echo Listo.
endlocal
