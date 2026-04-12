@echo off
TITLE Kimi Sushi POS System Launcher
echo ---------------------------------------------------
echo 🌸 Kimi Sushi POS - Production Launcher
echo ---------------------------------------------------
echo.
echo [*] Kiem tra Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI] Node.js chua duoc cai dat! Vui long cai Node.js truoc.
    pause
    exit
)

echo [*] Dang cai dat cac thu vien can thiet (npm install)...
call npm install

echo [*] Dang khoi dong Server...
echo Ung dung se chay tai: http://localhost:3000
echo.
echo [!] LUU Y: De chay vinh vien, hay dung lenh: npm run prod
echo ---------------------------------------------------
node backend/server.js
pause
