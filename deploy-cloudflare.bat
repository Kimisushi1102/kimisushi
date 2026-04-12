@echo off
chcp 65001 >nul
echo ==========================================
echo    SAKURA SUSHI - CLOUDFLARE PAGES
echo           DEPLOY SCRIPT
echo ==========================================
echo.

echo [LƯU Ý] Đây là Cloudflare PAGES.
echo Backend APIs tự động chạy qua functions/api/[[path]].js
echo Không cần chạy server riêng!
echo.

echo [1/3] Dang build React POS App...
call npm run build:pos
if %errorlevel% neq 0 (
    echo [LOI] Build React that bai!
    pause
    exit /b 1
)
echo [OK] Build React thanh cong!
echo.

echo [2/3] Kiem tra cu phap wrangler...
call npx wrangler --version
if %errorlevel% neq 0 (
    echo [CANH BAO] Chua cai Wrangler. Dang cai dat...
    call npm install -g wrangler
)
echo.

echo [3/3] Kiem tra cau hinh KV Namespace...
echo.
echo [QUAN TRONG] Ban can cau hinh cac bien moi truong TRUOC KHI deploy:
echo.
echo 1. Vao Cloudflare Dashboard ^> Workers ^& Pages ^> Du an cua ban
echo 2. Settings ^> Environment Variables ^> Add variables:
echo.
echo    TEN                    GIA TRI                         LOAI
echo    --------------------- ------------------------------- --------
echo    RESEND_API_KEY        re_xxxxx                        Secret
echo    TELEGRAM_BOT_TOKEN    7xxxxx:AAxxxxx                 Secret
echo    TELEGRAM_CHAT_ID      5xxxxx                         Secret
echo.
echo 3. Sau khi them bien, nhan "Save" va "Redeploy"
echo.
echo Hoac chay lenh nay de tao KV Namespace (neu chua co):
echo   npx wrangler kv:namespace create SAKURA_KV
echo.
echo Bay gio ban co the deploy bang cach:
echo.
echo   Cach 1 - GitHub (TU DONG):
echo   1. Day code len GitHub repository
echo   2. Vao Cloudflare Pages ^> Connect GitHub
echo   3. Chon repo va branch ^> Deploy!
echo.
echo   Cach 2 - Wrangler (THU CONG):
echo   1. npx wrangler pages deploy .
echo   2. Chon project hoac tao moi
echo.
echo ==========================================
echo.
echo Da xong! Chuc ban deploy thanh cong!
pause
