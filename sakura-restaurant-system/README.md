# Sakura Restaurant System

Ein vollstaendiges Restaurant-Bestell- und Reservierungssystem mit Telegram-Bot-Integration.

## Funktionen

- **Online-Bestellung**: Kunden koennen Speisen auswaehlen und online bestellen
- **Tischreservierung**: Kunden koennen Tische reservieren
- **Telegram-Bot**: Interne Benachrichtigungen und Schnellaktionen
- **E-Mail-Bestaetigungen**: Automatische E-Mails auf Deutsch
- **PostgreSQL-Datenbank**: Sichere Datenspeicherung

## Tech Stack

- **Frontend**: Next.js 14
- **Backend**: Express.js
- **Datenbank**: PostgreSQL
- **Telegram**: node-telegram-bot-api
- **E-Mail**: Nodemailer (SMTP)
- **Deployment**: Docker Compose / PM2 + Nginx

## Projektstruktur

```
sakura-restaurant-system/
├── backend/                 # Express.js Backend
│   ├── src/
│   │   ├── index.js        # Haupteinstiegspunkt
│   │   ├── database/       # Datenbank-Operationen
│   │   ├── routes/         # API-Routen
│   │   ├── services/       # Telegram & E-Mail
│   │   └── middleware/     # Fehlerbehandlung
│   └── Dockerfile
├── frontend/               # Next.js Frontend
│   ├── src/
│   │   ├── app/           # Pages
│   │   │   ├── bestellen/ # Bestellung
│   │   │   └── reservieren/# Reservierung
│   │   └── lib/           # API-Client
│   └── Dockerfile
├── deploy/                 # Deployment-Dateien
│   ├── nginx/             # Nginx-Konfiguration
│   ├── pm2/               # PM2-Konfiguration
│   ├── docker/            # Docker Compose
│   └── scripts/           # Setup-Skripte
├── .env.example           # Umgebungsvariablen
└── README.md
```

## Installation

### Voraussetzungen

- Node.js 20+
- PostgreSQL 14+
- Ubuntu 22.04/24.04 LTS ( fuer Server )

### Lokale Entwicklung

1. Repository klonen:
```bash
git clone <repository-url>
cd sakura-restaurant-system
```

2. Umgebungsvariablen konfigurieren:
```bash
cp .env.example .env
# .env bearbeiten mit Ihren Werten
```

3. Abhaengigkeiten installieren:
```bash
npm install
```

4. Datenbank einrichten:
```bash
npm run db:migrate
npm run db:seed
```

5. Entwicklung starten:
```bash
npm run dev
```

## API Dokumentation

### Bestellungen

#### POST /api/orders
Neue Bestellung erstellen.

**Request Body:**
```json
{
  "customerName": "Max Mustermann",
  "customerEmail": "max@example.de",
  "customerPhone": "+49 123 456789",
  "pickupTime": "30:00",
  "pickupDate": "2024-01-15",
  "notes": "Kein Sesam",
  "items": [
    {
      "menuItemId": "uuid",
      "name": "Dragon Roll",
      "price": "14.90",
      "quantity": 2
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "orderNumber": "ORD-240115-A1B2",
  "message": "Bestellung erfolgreich erstellt"
}
```

#### GET /api/orders/:id
Bestellung abrufen.

#### GET /api/orders
Alle Bestellungen auflisten (mit optionalen Filtern).

#### PUT /api/orders/:id/status
Bestellstatus aktualisieren.

### Reservierungen

#### POST /api/reservations
Neue Reservierung erstellen.

**Request Body:**
```json
{
  "customerName": "Max Mustermann",
  "customerEmail": "max@example.de",
  "customerPhone": "+49 123 456789",
  "reservationDate": "2024-01-15",
  "reservationTime": "19:00",
  "partySize": 4,
  "notes": "Fensterplatz wuensche"
}
```

#### GET /api/reservations/:id
Reservierung abrufen.

#### GET /api/reservations
Alle Reservierungen auflisten.

### Sonstige Endpunkte

#### GET /api/menu
Speisekarte abrufen.

#### GET /api/config
Oeffnungszeiten und Restaurant-Info abrufen.

#### GET /api/health
Server-Status abrufen.

## Telegram-Bot Integration

### Button-Aktionen fuer Bestellungen

| Button | Aktion | E-Mail |
|--------|--------|--------|
| Bestaetigt | Status: bestaetigt | Bestaetigung |
| 15 Min | Status: bestaetigt | Zeit: 15 Minuten |
| 20 Min | Status: bestaetigt | Zeit: 20 Minuten |
| 30 Min | Status: bestaetigt | Zeit: 30 Minuten |
| 45 Min | Status: bestaetigt | Zeit: 45 Minuten |
| In Zubereitung | Status: in_zubereitung | In Zubereitung |
| Abholbereit | Status: abholbereit | Abholbereit |
| Abgeschlossen | Status: abgeschlossen | Abgeschlossen |
| Stornieren | Status: storniert | Storniert |
| Ablehnen | Status: abgelehnt | Abgelehnt |

### Button-Aktionen fuer Reservierungen

| Button | Aktion | E-Mail |
|--------|--------|--------|
| Bestaetigen | Status: bestaetigt | Reservierung bestaetigt |
| Tisch reserviert | Status: tisch_reserviert | Reservierung bestaetigt |
| Bitte spaeter | Status: bitte_spaeter | Bitte spaeter kommen |
| Abgelehnt | Status: abgelehnt | Reservierung abgelehnt |
| Storniert | Status: storniert | Reservierung storniert |

## E-Mail-Templates (Deutsch)

Alle E-Mails sind vollstaendig auf Deutsch verfasst:

1. **Bestellung erhalten** - Bestaetigung des Eingangs
2. **Bestellung bestaetigt** - Mit Zeitangabe
3. **In Zubereitung** - Statusupdate
4. **Abholbereit** - Abholung moeglich
5. **Abgeschlossen** - Bestellung abgeschlossen
6. **Storniert** - Bestellung storniert
7. **Abgelehnt** - Bestellung abgelehnt
8. **Reservierung erhalten** - Bestaetigung des Eingangs
9. **Reservierung bestaetigt** - Reservierung bestaetigt
10. **Bitte spaeter** - Zeit nicht verfuegbar
11. **Abgelehnt** - Reservierung abgelehnt
12. **Storniert** - Reservierung storniert

## Deployment auf Ubuntu Server

### Option 1: PM2 + Nginx (Empfohlen)

1. Server einrichten:
```bash
chmod +x deploy/scripts/setup-server.sh
sudo ./deploy/scripts/setup-server.sh
```

2. Anwendung deployen:
```bash
npm install
npm run build
pm2 start deploy/pm2/ecosystem.config.js
pm2 save
pm2 startup
```

3. Nginx konfigurieren:
```bash
sudo cp deploy/nginx/sakura.conf /etc/nginx/sites-available/sakura
sudo ln -s /etc/nginx/sites-available/sakura /etc/nginx/sites-enabled/
sudo certbot --nginx -d your-domain.com
sudo nginx -t
sudo systemctl reload nginx
```

### Option 2: Docker Compose

1. Umgebungsvariablen:
```bash
cd deploy/docker
cp .env.example .env
# .env bearbeiten
```

2. Starten:
```bash
docker-compose up -d
```

## Sicherheit

- Server-seitige Validierung aller Eingaben
- Rate Limiting (100 Anfragen / 15 Minuten)
- Helmet.js Security Headers
- CORS-Konfiguration
- Sichere .env-Datei (nie in Git einchecken)
- PostgreSQL Injection Protection

## Datenbankstruktur

### Tabellenvorschau

- **customers**: Kundendaten
- **orders**: Bestellungen
- **order_items**: Bestellpositionen
- **reservations**: Reservierungen
- **status_history**: Statusverlauf
- **telegram_actions**: Telegram-Aktionen
- **email_logs**: E-Mail-Protokoll
- **menu_items**: Speisekarte

## Lizenz

MIT License

## Autor

Sakura Restaurant Team
