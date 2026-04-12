#!/bin/bash

# ==========================================
# Sakura Restaurant System - Setup Script
# Ubuntu Server 22.04/24.04 LTS
# ==========================================

set -e

echo "============================================"
echo "Sakura Restaurant System - Setup"
echo "============================================"

# Update system
echo "[1/8] System aktualisieren..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
echo "[2/8] Node.js installieren..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
echo "[3/8] PostgreSQL installieren..."
sudo apt install -y postgresql postgresql-contrib

# Install PM2
echo "[4/8] PM2 installieren..."
sudo npm install -g pm2

# Install Certbot for SSL
echo "[5/8] Certbot installieren..."
sudo apt install -y certbot python3-certbot-nginx

# Start PostgreSQL
echo "[6/8] PostgreSQL konfigurieren..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
echo "[7/8] Datenbank einrichten..."
sudo -u postgres psql << EOF
CREATE DATABASE sakura_restaurant;
CREATE USER sakura_user WITH PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE sakura_restaurant TO sakura_user;
\c sakura_restaurant
GRANT ALL ON SCHEMA public TO sakura_user;
EOF

echo "[8/8] Installation abgeschlossen!"

echo ""
echo "============================================"
echo "Naechste Schritte:"
echo "============================================"
echo "1. Kopieren Sie .env.example nach .env und konfigurieren Sie es"
echo "2. npm install"
echo "3. npm run db:migrate"
echo "4. npm run db:seed"
echo "5. Konfigurieren Sie Nginx (deploy/nginx/sakura.conf)"
echo "6. pm2 start deploy/pm2/ecosystem.config.js"
echo "7. certbot --nginx -d your-domain.com"
echo ""
