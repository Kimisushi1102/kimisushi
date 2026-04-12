# 🚀 Kimi Sushi POS - Deployment Helper
# This script helps you set up the POS system for online use.

$ErrorActionPreference = "Stop"

Write-Host "---------------------------------------------------" -ForegroundColor Cyan
Write-Host "🌸 Kimi Sushi POS - Deployment Helper" -ForegroundColor Magenta
Write-Host "---------------------------------------------------" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node.js
Write-Host "[*] Checking Node.js..." -NoNewline
try {
    $nodeVer = node -v
    Write-Host " OK ($nodeVer)" -ForegroundColor Green
} catch {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host "[!] Node.js is not installed. Please download it from https://nodejs.org/" -ForegroundColor Yellow
    exit
}

# 2. Install dependencies
Write-Host "[*] Installing project dependencies..."
npm install

# 3. Check for PM2
Write-Host "[*] Checking PM2..." -NoNewline
$pm2Exists = Get-Command pm2 -ErrorAction SilentlyContinue
if ($pm2Exists) {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " Missing. Installing PM2 globally..." -ForegroundColor Yellow
    npm install pm2 -g
}

# 4. Ask for Tunnel Token
Write-Host ""
Write-Host "--- Cloudflare Tunnel Setup ---" -ForegroundColor Cyan
Write-Host "If you have a Cloudflare Tunnel Token, enter it below to set up SSL instantly."
$token = Read-Host "Token (Leave blank to skip)"

if ($token) {
    Write-Host "[*] Installing Cloudflare Tunnel Service..."
    # Check if cloudflared is installed
    $cfExists = Get-Command cloudflared -ErrorAction SilentlyContinue
    if (-not $cfExists) {
        Write-Host "[!] cloudflared not found. Downloading..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.msi" -OutFile "cloudflared_setup.msi"
        Start-Process msiexec.exe -ArgumentList "/i cloudflared_setup.msi /quiet /norestart" -Wait
        Remove-Item "cloudflared_setup.msi"
    }
    
    # Run the install command
    Write-Host "[*] Activating Tunnel..."
    & cloudflared service install $token
    Write-Host "[SUCCESS] Tunnel service installed and starting!" -ForegroundColor Green
}

# 5. Start the System with PM2
Write-Host ""
Write-Host "[*] Starting the POS system with PM2..."
pm2 start ecosystem.config.js --name "kimi-sushi"
pm2 save

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "🌸 SUCCESS! Your Kimi Sushi POS is now online." -ForegroundColor Green
Write-Host "Application: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Admin Dashboard: http://localhost:3000/admin.html" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Green
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
