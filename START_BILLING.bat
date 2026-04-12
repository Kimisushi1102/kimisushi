@echo off
TITLE Kimi Billing App Launcher
echo ---------------------------------------------------
echo 🌸 Kimi Billing App - Standalone POS
echo ---------------------------------------------------
echo.
cd Kimi_Billing_App
echo [*] Dang khoi dong ung dung...
echo Ung dung se mo tai: http://localhost:5173
echo.
echo [!] LUU Y: Vui long khong tat cua so nay khi dang su dung.
echo ---------------------------------------------------
cmd /c "npm run dev"
pause
