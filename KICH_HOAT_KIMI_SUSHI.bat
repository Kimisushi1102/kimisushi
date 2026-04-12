@echo off
TITLE 🌸 Kimi Sushi - Kich Hoat He Thong
echo ---------------------------------------------------
echo 🌸 DANG KIEM TRA VA KICH HOAT QUAN KIMI SUSHI...
echo ---------------------------------------------------
echo.

:: Tim kiem file node.exe trong cac thu muc xung quanh
set "NODE_EXE="

if exist "..\node-v16.20.2-win-x64\node.exe" set "NODE_EXE=..\node-v16.20.2-win-x64\node.exe"
if exist "node-v16.20.2-win-x64\node.exe" set "NODE_EXE=node-v16.20.2-win-x64\node.exe"
if exist "..\node-v12.22.12-win-x64\node.exe" set "NODE_EXE=..\node-v12.22.12-win-x64\node.exe"
if exist "node-v12.22.12-win-x64\node.exe" set "NODE_EXE=node-v12.22.12-win-x64\node.exe"
if exist "C:\node-v12.22.12-win-x64\node.exe" set "NODE_EXE=C:\node-v12.22.12-win-x64\node.exe"
if exist "C:\node-v16.20.2-win-x64\node.exe" set "NODE_EXE=C:\node-v16.20.2-win-x64\node.exe"

:: Neu van khong thay, thi thu dung lenh node mac dinh
if "%NODE_EXE%"=="" (
    node -v >nul 2>&1
    if %errorlevel% equ 0 set "NODE_EXE=node"
)

if "%NODE_EXE%"=="" (
    echo [LOI] Khong tim thay file node.exe ban vua giai nen!
    echo Vui long dam bao ban da giai nen thu muc node vao canh thu muc sakura-sushi.
    pause
    exit
)

echo [+] Dang khoi dong quan...
echo.
echo Website cua ban dang chay tai: http://localhost:3000
echo (Ban co the vao Admin -> Cài đặt de dien ten mien cua ban)
echo (Dung chu y den port 3000 neu ban da setup IP/Domain nha)
echo.
echo ---------------------------------------------------
"%NODE_EXE%" backend/server.js
pause
