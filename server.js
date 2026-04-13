require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const nodemailer = require('nodemailer');
const https = require('https');

const app = express();
const server = http.createServer(app);

// ========== TELEGRAM SETTINGS ==========
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function sendTelegramMessage(message) {
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE' || 
      !TELEGRAM_CHAT_ID || TELEGRAM_CHAT_ID === 'YOUR_CHAT_ID_HERE') {
    console.log('[TELEGRAM] Not configured, skipping message');
    return;
  }
  
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const data = JSON.stringify({
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'HTML'
  });
  
  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };
  
  const req = https.request(options, (res) => {
    console.log('[TELEGRAM] Message sent, status:', res.statusCode);
  });
  
  req.on('error', (e) => {
    console.error('[TELEGRAM] Error:', e.message);
  });
  
  req.write(data);
  req.end();
}

// CORS cho phép tất cả origins
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Socket.IO
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Lưu trữ orders tạm thời (trong production nên dùng database)
const orders = [];
const reservations = [];

// ========== GMAIL SMTP NOTIFICATION ==========

// Tạo transporter cho Gmail (hỗ trợ cả env và request body)
function createGmailTransporter(gmailUser, gmailPassword) {
  const user = gmailUser || process.env.GMAIL_USER;
  const pass = gmailPassword || process.env.GMAIL_APP_PASSWORD;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass
    }
  });
}

// Sử dụng transporter với Gmail config từ request body
async function createGmailTransporterWithConfig(gmailConfig) {
  const user = gmailConfig?.gmailUser || process.env.GMAIL_USER;
  const pass = gmailConfig?.gmailPassword || process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
}

// Hàm gửi email thông báo đơn hàng qua Gmail
async function sendGmailNotification(orderData, gmailConfig) {
  // DEBUG: Always log what we're receiving
  console.log('[GMAIL] Function called with gmailConfig:', JSON.stringify(gmailConfig));
  console.log('[GMAIL] process.env.GMAIL_ENABLED:', process.env.GMAIL_ENABLED);
  console.log('[GMAIL] process.env.GMAIL_USER:', process.env.GMAIL_USER ? 'SET' : 'NOT SET');

  const gmailUser = gmailConfig?.gmailUser || process.env.GMAIL_USER;
  const gmailNotifyEmail = gmailConfig?.gmailNotifyEmail || process.env.GMAIL_NOTIFY_EMAIL || gmailUser;
  const gmailEnabled = gmailConfig?.gmailEnabled || process.env.GMAIL_ENABLED === 'true';
  const gmailPassword = gmailConfig?.gmailPassword || process.env.GMAIL_APP_PASSWORD;

  console.log('[GMAIL] Final gmailEnabled:', gmailEnabled, '| gmailUser:', gmailUser ? 'SET' : 'NOT SET', '| gmailPassword:', gmailPassword ? 'SET' : 'NOT SET');

  if (!gmailEnabled || !gmailUser || !gmailPassword) {
    console.log('[GMAIL] Gmail not configured, skipping notification. gmailEnabled=', gmailEnabled, 'gmailUser=', !!gmailUser, 'gmailPassword=', !!gmailPassword);
    return { success: false, reason: 'Gmail not configured' };
  }

  const isReservation = orderData.orderType === 'reservation' || orderData.type === 'reservation';
  const items = orderData.items || [];
  const customerName = orderData.customerName || orderData.name || 'Khách hàng';
  const customerPhone = orderData.customerPhone || orderData.phone || '-';
  const customerEmail = orderData.customerEmail || orderData.email || '-';
  const pickupDateRaw = orderData.pickupDate || orderData.date || '-';
  const pickupTimeRaw = orderData.pickupTime || orderData.time || '-';
  const pickupDate = pickupDateRaw !== '-' ? pickupDateRaw : '-';
  const pickupTimeDisplay = pickupTimeRaw !== '-' ? `${pickupTimeRaw} Uhr` : '-';
  const total = orderData.total || '-';
  const deliveryFee = orderData.deliveryFee || '0';
  const address = orderData.address || '-';
  const method = orderData.method || '-';
  const notes = orderData.notes || orderData.remark || '-';
  const status = orderData.status || 'neu';
  const itemId = orderData.id || orderData.orderId || '-';
  const itemCount = orderData.itemCount || (orderData.guests ? `${orderData.guests} ${isReservation ? 'Gäste' : 'Personen'}` : '-');

  // DEBUG LOG - nhận được items gì?
  console.log('[GMAIL-BACKEND] Received items:', JSON.stringify(items));
  console.log('[GMAIL-BACKEND] Items count:', items.length);
  console.log('[GMAIL-BACKEND] Full orderData:', JSON.stringify(orderData));

  // Normalize price: "5,90 €" -> 5.90 (number)
  const normalizePrice = (p) => {
    if (typeof p === 'number') return p;
    if (!p) return 0;
    const cleaned = String(p).replace('€', '').replace(/\s/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  // Format price: 5.9 -> "5,90 €"
  const fmt = (n) => n.toFixed(2).replace('.', ',') + ' €';


  // Nội dung email thông báo
  const subject = isReservation
    ? `📅 Neue Tischreservierung - ${customerName} - ${new Date().toLocaleDateString('de-DE')}`
    : `Neue Bestellung - ${customerName} - ${new Date().toLocaleDateString('de-DE')}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: auto; border: 3px solid ${isReservation ? '#22c55e' : '#8B0000'}; padding: 24px; border-radius: 14px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: ${isReservation ? '#22c55e' : '#8B0000'}; font-size: 26px; margin: 0;">
          ${isReservation ? '🍣 Neue Tischreservierung' : '🍣 Neue Bestellung'}
        </h1>
        <p style="color: #888; margin: 8px 0 0 0; font-size: 13px;">
          ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}
        </p>
      </div>

      <div style="background: #f0f9ff; border-radius: 10px; padding: 16px; margin-bottom: 16px; border: 1px solid #dbeafe;">
        <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
          📋 Bestell-/Reservierungsdaten
        </h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px; width: 130px;"><strong>Nr.:</strong></td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: bold; color: #111;">${itemId}</td>
          </tr>
          ${isReservation ? `<tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px;"><strong>Personen:</strong></td>
            <td style="padding: 6px 0; font-size: 16px; font-weight: bold; color: #22c55e;">${itemCount}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px;"><strong>Datum:</strong></td>
            <td style="padding: 6px 0; font-size: 14px;">${pickupDate !== '-' ? pickupDate.split('-').reverse().join('.') : '-'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px;"><strong>Uhrzeit:</strong></td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: bold;">${pickupTimeDisplay}</td>
          </tr>
          ${!isReservation ? `<tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px;"><strong>Art:</strong></td>
            <td style="padding: 6px 0; font-size: 14px;">${method === 'delivery' ? '🚴 Lieferung' : method === 'Abholung / Vor Ort' ? '🏪 Abholung / Vor Ort' : method}</td>
          </tr>` : ''}
          ${notes && notes.trim() ? `<tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px; vertical-align: top;"><strong>⚠️ Allergien:</strong></td>
            <td style="padding: 6px 0; font-size: 14px; color: #b91c1c; font-weight: bold;">${notes}</td>
          </tr>` : ''}
        </table>
      </div>

      <div style="background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
        <h3 style="margin: 0 0 10px 0; color: #111; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
          👤 Kundendaten
        </h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px; width: 130px;"><strong>Name:</strong></td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: bold;">${customerName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px;"><strong>Telefon:</strong></td>
            <td style="padding: 6px 0; font-size: 14px;">${customerPhone}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px;"><strong>E-Mail:</strong></td>
            <td style="padding: 6px 0; font-size: 14px;">${customerEmail}</td>
          </tr>
          ${!isReservation && address && address !== 'Abholung / Vor Ort' ? `<tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px;"><strong>Adresse:</strong></td>
            <td style="padding: 6px 0; font-size: 14px;">${address}</td>
          </tr>` : ''}
        </table>
      </div>

      ${notes && notes !== '-' ? `
      <div style="background: #fffbeb; border-radius: 10px; padding: 16px; margin-bottom: 16px; border: 1px solid #fde68a;">
        <h3 style="margin: 0 0 6px 0; color: #92400e; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">📝 Anmerkung</h3>
        <p style="margin: 0; font-size: 14px; color: #333;">${notes}</p>
      </div>
      ` : ''}

      ${!isReservation && items.length > 0 ? `
      <div style="background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
        <h3 style="margin: 0 0 12px 0; color: #8B0000; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">🛒 Bestellte Artikel</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #8B0000;">
            <th style="padding: 9px 10px; text-align: left; color: white; font-size: 12px; border-bottom: 2px solid #a80000;">Gericht</th>
            <th style="padding: 9px 10px; text-align: center; color: white; font-size: 12px; border-bottom: 2px solid #a80000;">Menge</th>
            <th style="padding: 9px 10px; text-align: right; color: white; font-size: 12px; border-bottom: 2px solid #a80000;">Einzelpreis</th>
            <th style="padding: 9px 10px; text-align: right; color: white; font-size: 12px; border-bottom: 2px solid #a80000;">Gesamt</th>
          </tr>
          ${(() => {
            let orderSubtotal = 0;
            return items.map(item => {
              const unitPrice = normalizePrice(item.price);
              const qty = parseInt(item.quantity) || 1;
              const subtotal = unitPrice * qty;
              orderSubtotal += subtotal;
              return `<tr>
                <td style="padding: 9px 10px; border-bottom: 1px solid #f0f0f0; font-size: 13px;">${item.name || '-'}</td>
                <td style="padding: 9px 10px; text-align: center; border-bottom: 1px solid #f0f0f0; font-size: 13px;">x${qty}</td>
                <td style="padding: 9px 10px; text-align: right; border-bottom: 1px solid #f0f0f0; font-size: 13px;">${fmt(unitPrice)}</td>
                <td style="padding: 9px 10px; text-align: right; border-bottom: 1px solid #f0f0f0; font-size: 13px; font-weight: bold;">${fmt(subtotal)}</td>
              </tr>`;
            }).join('');
          })()}
          ${parseFloat(deliveryFee) > 0 ? `<tr>
            <td colspan="3" style="padding: 9px 10px; text-align: right; font-size: 13px; color: #666;">Liefergebühr:</td>
            <td style="padding: 9px 10px; text-align: right; font-size: 13px;">${parseFloat(deliveryFee).toFixed(2).replace('.', ',')} €</td>
          </tr>` : ''}
          <tr style="background: #fef3c7;">
            <td colspan="3" style="padding: 12px 10px; text-align: right; font-weight: bold; font-size: 16px;">Gesamtbetrag:</td>
            <td style="padding: 12px 10px; text-align: right; font-weight: bold; font-size: 20px; color: #8B0000;">
              ${(() => {
                const delFee = parseFloat(deliveryFee) || 0;
                const itemsTotal = items.reduce((s, i) => s + normalizePrice(i.price) * (parseInt(i.quantity) || 1), 0);
                return fmt(itemsTotal + delFee);
              })()}
            </td>
          </tr>
        </table>
      </div>
      ` : ''}

      <div style="background: #fef3c7; border-radius: 10px; padding: 14px; margin-bottom: 16px; border: 1px solid #fde68a;">
        <p style="margin: 0; color: #92400e; font-size: 13px; text-align: center;">
          ${isReservation ? 'Bitte diese Reservierung umgehend bestätigen!' : 'Bitte diese Bestellung umgehend bearbeiten!'}
        </p>
      </div>

      <div style="background: #f9fafb; border-radius: 8px; padding: 12px; margin-bottom: 8px;">
        <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
          <strong>Status:</strong> ${status.charAt(0).toUpperCase() + status.slice(1)} · ${isReservation ? 'Reservierung' : 'Bestellung'}
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0 12px;">
      <p style="font-size: 11px; color: #aaa; text-align: center; margin: 0;">Kimi Sushi — Automatisiertes Benachrichtigungssystem</p>
    </div>
  `;

  const transporter = gmailConfig?.gmailPassword
    ? await createGmailTransporterWithConfig(gmailConfig)
    : createGmailTransporter();

  if (!transporter) {
    console.log('[GMAIL] No valid transporter, skipping.');
    return { success: false, reason: 'No valid Gmail credentials' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Kimi Sushi" <${gmailUser}>`,
      to: gmailNotifyEmail,
      subject: subject,
      html: htmlContent
    });

    console.log('[GMAIL] Notification sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[GMAIL] Error sending notification:', error);
    return { success: false, error: error.message };
  }
}

// ========== API ROUTES ==========

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    gmail: {
      enabled: process.env.GMAIL_ENABLED === 'true',
      user: process.env.GMAIL_USER ? '***' + process.env.GMAIL_USER.slice(-10) : null,
      notifyEmail: process.env.GMAIL_NOTIFY_EMAIL
    },
    timestamp: new Date().toISOString()
  });
});

// Gmail notification endpoint (hỗ trợ Gmail config từ request body)
app.post('/api/gmail-notify', async (req, res) => {
  try {
    const orderData = req.body;

    if (!orderData) {
      return res.status(400).json({ error: 'Missing order data' });
    }

    // Lấy Gmail config từ request body (từ frontend settings)
    const gmailConfig = {
      gmailEnabled: orderData.gmailEnabled,
      gmailUser: orderData.gmailUser,
      gmailPassword: orderData.gmailPassword,
      gmailNotifyEmail: orderData.gmailNotifyEmail
    };

    const result = await sendGmailNotification(orderData, gmailConfig);

    if (result.success) {
      res.json({ success: true, message: 'Email sent successfully', messageId: result.messageId });
    } else {
      res.json({ success: false, message: result.reason || result.error });
    }
  } catch (error) {
    console.error('[API] Gmail notify error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test Gmail connection
app.post('/api/gmail-test', async (req, res) => {
  try {
    const transporter = createGmailTransporter();

    await transporter.verify().then(() => {
      console.log('[GMAIL] SMTP connection verified');
      res.json({ success: true, message: 'Gmail SMTP connected successfully!' });
    }).catch(err => {
      console.error('[GMAIL] SMTP verification failed:', err);
      res.status(500).json({ success: false, error: err.message });
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test Gmail send (hỗ trợ credentials từ request body)
app.post('/api/gmail-test-send', async (req, res) => {
  const { gmailUser, gmailPassword, testMode } = req.body || {};

  const result = await sendGmailNotification({
    orderType: 'order',
    customerName: 'Test Customer',
    customerPhone: '+49 123 456789',
    customerEmail: 'test@example.com',
    pickupTime: '18:00 Uhr',
    items: [
      { name: 'Sake Nigiri', quantity: 2, price: '5,90 €' },
      { name: 'Dragon Roll', quantity: 1, price: '14,90 €' }
    ],
    total: '26,70'
  }, {
    gmailUser: gmailUser,
    gmailPassword: gmailPassword,
    gmailEnabled: true
  });

  res.json(result);
});

// ========== RESTAURANT API (đồng bộ với frontend) ==========

// Inbox - Lưu trữ đơn hàng/đặt bàn
app.get('/api/inbox', (req, res) => {
  const all = [...orders, ...reservations].sort((a, b) =>
    new Date(b.time || b.createdAt) - new Date(a.time || a.createdAt)
  );
  res.json(all);
});

app.post('/api/inbox', (req, res) => {
  const item = req.body;

  // DEBUG: Log incoming data
  console.log('[API/INBOX] Received item type:', item?.type);
  console.log('[API/INBOX] Items field:', JSON.stringify(item?.items));
  console.log('[API/INBOX] Items count:', Array.isArray(item?.items) ? item.items.length : 'NOT_ARRAY');
  if (item?.items) {
    item.items.forEach((it, idx) => {
      console.log(`[API/INBOX] Item[${idx}]:`, JSON.stringify(it));
    });
  }

  if (!item.id) {
    item.id = (item.type === 'reservation' ? 'res_' : 'order_') + Date.now();
  }
  item.createdAt = new Date().toISOString();

  // === ASAP RESOLUTION: wenn "asap" außerhalb der Öffnungszeiten liegt → nächste Öffnungszeit ===
  if (item.type !== 'reservation' && item.pickupTime === 'asap') {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const dayNames = ['sun','mon','tue','wed','thu','fri','sat'];
    const todayKey = dayNames[now.getDay()];
    const nextKey = dayNames[(now.getDay() + 1) % 7];

    const parseHours = (str) => {
      if (!str || !str.includes('-')) return null;
      const parts = str.split('-').map(s => s.trim());
      return {
        start: parseInt(parts[0].split(':')[0]) * 60 + parseInt(parts[0].split(':')[1]),
        end: parseInt(parts[1].split(':')[0]) * 60 + parseInt(parts[1].split(':')[1])
      };
    };

    const getSlotsForDay = (key, offsetDays) => {
      const h1 = settings[key + '1'] || '11:00 - 15:00';
      const h2 = settings[key + '2'] || '17:00 - 22:00';
      return [parseHours(h1), parseHours(h2)].filter(Boolean);
    };

    const todaySlots = getSlotsForDay('hours' + todayKey.charAt(0).toUpperCase() + todayKey.slice(1));
    const isStoreOpen = todaySlots.some(s => nowMin >= s.start && nowMin < s.end - 20);

    if (isStoreOpen) {
      // Store offen → earliest slot heute + 30min
      const allSlots = [...todaySlots].sort((a, b) => a.start - b.start);
      let earliest = allSlots[0].start;
      if (nowMin >= earliest) earliest = Math.ceil((nowMin + 30) / 30) * 30;
      const nextHh = String(Math.floor(earliest / 60)).padStart(2, '0');
      const nextMm = String(earliest % 60).padStart(2, '0');
      item.pickupDate = now.toISOString().split('T')[0];
      item.pickupTime = `${nextHh}:${nextMm}`;
      item.pickupTimeDisplay = `Schnellstmöglich (ca. ${nextHh}:${nextMm} Uhr)`;
      console.log(`[ASAP] Store offen → nächste Zeit: ${item.pickupTime}`);
    } else {
      // Store geschlossen → erste Öffnungszeit morgen
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextDayKey = dayNames[tomorrow.getDay()];
      const nextSlots = getSlotsForDay('hours' + nextDayKey.charAt(0).toUpperCase() + nextDayKey.slice(1));
      if (nextSlots.length > 0) {
        const earliest = Math.min(...nextSlots.map(s => s.start));
        const nextHh = String(Math.floor(earliest / 60)).padStart(2, '0');
        const nextMm = String(earliest % 60).padStart(2, '0');
        item.pickupDate = tomorrow.toISOString().split('T')[0];
        item.pickupTime = `${nextHh}:${nextMm}`;
        item.pickupTimeDisplay = `${tomorrow.toLocaleDateString('de-DE')} um ${nextHh}:${nextMm} Uhr`;
        console.log(`[ASAP] Store geschlossen → nächste Öffnung: ${item.pickupDate} ${item.pickupTime}`);
      }
    }
  }

  if (item.type === 'reservation') {
    const idx = reservations.findIndex(r => r.id === item.id);
    if (idx >= 0) {
      reservations[idx] = item;
    } else {
      reservations.unshift(item);
    }
  } else {
    const idx = orders.findIndex(o => o.id === item.id);
    if (idx >= 0) {
      orders[idx] = item;
    } else {
      orders.unshift(item);
    }
  }

  // Gửi thông báo Gmail tự động khi có đơn mới
  // Always use env vars as fallback (they are reliably set from .env)
  const gmailCfg = {
    gmailEnabled: item.gmailEnabled || process.env.GMAIL_ENABLED === 'true',
    gmailUser: item.gmailUser || process.env.GMAIL_USER,
    gmailPassword: item.gmailPassword || process.env.GMAIL_APP_PASSWORD,
    gmailNotifyEmail: item.gmailNotifyEmail || process.env.GMAIL_NOTIFY_EMAIL || process.env.GMAIL_USER
  };
  if (gmailCfg.gmailEnabled && gmailCfg.gmailUser && gmailCfg.gmailPassword) {
    sendGmailNotification(item, gmailCfg).catch(err => {
      console.error('[AUTO-GMAIL] Error:', err);
    });
  }

  // Gửi thông báo Telegram tự động khi có đơn mới
  const isReservation = item.type === 'reservation';
  const customerName = item.name || item.customerName || '-';
  const phone = item.phone || item.customerPhone || '-';
  const customerEmail = item.email || item.customerEmail || '-';
  const status = item.status || 'neu';

  let telegramMsg;

  if (isReservation) {
    const guests = item.guests || item.persons || '-';
    const notes = item.notes || item.remark || '-';
    const resDate = item.date || '-';
    const resTime = item.time || '-';

    const fmtDate = resDate !== '-' ? resDate.split('-').reverse().join('.') : '-';
    const fmtTime = resTime !== '-' ? `${resTime} Uhr` : '-';

    telegramMsg =
`📅 NEUE TISCHRESERVIERUNG

━━━━━━━━━━━━━━━
🔖 Nr.: ${item.id || '-'}
👤 Kunde: ${customerName}
📞 Telefon: ${phone}
📧 E-Mail: ${customerEmail}
━━━━━━━━━━━━━━━
🗓 Datum: ${fmtDate}
🕒 Uhrzeit: ${fmtTime}
👥 Personen: ${guests}
━━━━━━━━━━━━━━━
📝 Anmerkung: ${notes}
━━━━━━━━━━━━━━━
Status: ${status.toUpperCase()}`;
  } else {
    const total = item.total ? `${item.total.replace('.', ',')} €` : '-';
    const method = item.method === 'delivery' ? '🚴 Lieferung' : '🏪 Abholung';
    const address = item.address && item.address !== 'Abholung / Vor Ort' ? item.address : '-';

    let itemsDetail = '';
    if (item.items && item.items.length > 0) {
      item.items.forEach(i => {
        const price = i.price ? ` (${i.price})` : '';
        itemsDetail += `\n  ▸ ${i.name} x${i.quantity}${price}`;
      });
    }

    const orderDate = item.date || item.pickupDate || '-';
    const orderTime = item.time || item.pickupTime || item.pickupTimeDisplay || '-';

    telegramMsg =
`🍣 NEUE BESTELLUNG

━━━━━━━━━━━━━━━
👤 Kunde: ${customerName}
📞 Telefon: ${phone}
📧 E-Mail: ${customerEmail}
━━━━━━━━━━━━━━━
📦 Bestellnummer: ${item.id || '-'}
🗓 Datum: ${orderDate !== '-' ? orderDate.split('-').reverse().join('.') : '-'}
🕒 Abholzeit: ${orderTime}
━━━━━━━━━━━━━━━
${method}
${item.method === 'delivery' ? `📍 Adresse: ${address}` : ''}
━━━━━━━━━━━━━━━
${item.notes && item.notes.trim() ? `⚠️ ALLERGIEN / WÜNSCHE:\n${item.notes.trim()}\n━━━━━━━━━━━━━━━\n` : ''}📋 Bestellte Artikel:${itemsDetail || '\n  (keine Details)'}
━━━━━━━━━━━━━━━
💰 Gesamtbetrag: ${total}
━━━━━━━━━━━━━━━
Status: ${status.toUpperCase()}`;
  }
  
  sendTelegramMessage(telegramMsg);

  // Broadcast qua Socket.IO
  io.emit(item.type === 'reservation' ? 'new_reservation' : 'new_order', item);

  res.json({ success: true, id: item.id });
});

const fs = require('fs');
const path = require('path');

// Menu API - Lưu vào file để không mất khi restart
const MENU_FILE = path.join(__dirname, 'data', 'menu.json');
const COMBOS_FILE = path.join(__dirname, 'data', 'combos.json');
const SETTINGS_FILE = path.join(__dirname, 'data', 'settings.json');

// Đảm bảo thư mục data tồn tại
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Load menu từ file
function loadMenuData() {
    try {
        if (fs.existsSync(MENU_FILE)) {
            return JSON.parse(fs.readFileSync(MENU_FILE, 'utf8'));
        }
    } catch (e) { console.log('[DATA] Load menu error:', e.message); }
    return [];
}

// Save menu vào file
function saveMenuData(data) {
    try {
        fs.writeFileSync(MENU_FILE, JSON.stringify(data, null, 2));
    } catch (e) { console.log('[DATA] Save menu error:', e.message); }
}

// Load combos từ file
function loadCombosData() {
    try {
        if (fs.existsSync(COMBOS_FILE)) {
            return JSON.parse(fs.readFileSync(COMBOS_FILE, 'utf8'));
        }
    } catch (e) { console.log('[DATA] Load combos error:', e.message); }
    return [];
}

// Save combos vào file
function saveCombosData(data) {
    try {
        fs.writeFileSync(COMBOS_FILE, JSON.stringify(data, null, 2));
    } catch (e) { console.log('[DATA] Save combos error:', e.message); }
}

const menuData = loadMenuData();
const combosData = loadCombosData();
let settingsData = {};

// Default settings if no file exists
const defaultSettings = {
    brandName: "Kimi Sushi",
    logoImage: "",
    heroImage: "images/hero_sushi.png",
    aboutImage: "images/gallery-1.jpg",
    phone: "+49 123 4567890",
    email: "hallo@kimisushi.de",
    address: "Bernhäuser Hauptstraße 27, 70794 Filderstadt",
    seoTitle: "Kimi Sushi | Frisches Sushi & Authentische Japanische Küche",
    seoDescription: "Genießen Sie frisches, hochwertiges Sushi bei Kimi Sushi in Filderstadt.",
    seoKeywords: "Kimi Sushi, Sushi Filderstadt, japanisches Restaurant",
    hoursSummary: "Mo-Sa: 11:00-15:00 & 17:00-22:00 | So: 17:00-22:00",
    hoursMon1: "11:00 - 15:00", hoursMon2: "17:00 - 22:00",
    hoursTue1: "11:00 - 15:00", hoursTue2: "17:00 - 22:00",
    hoursWed1: "11:00 - 15:00", hoursWed2: "17:00 - 22:00",
    hoursThu1: "11:00 - 15:00", hoursThu2: "17:00 - 22:00",
    hoursFri1: "11:00 - 15:00", hoursFri2: "17:00 - 22:00",
    hoursSat1: "11:00 - 15:00", hoursSat2: "17:00 - 22:00",
    hoursSun1: "17:00 - 22:00", hoursSun2: "",
    deliveryEnabled: false,
    taxRate1: "19", taxRate2: "7"
};

if (fs.existsSync(SETTINGS_FILE)) {
    try { 
        const loaded = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        if (loaded && typeof loaded === 'object') {
            settingsData = { ...defaultSettings, ...loaded };
        }
    } catch(e) {
        settingsData = defaultSettings;
    }
} else {
    settingsData = defaultSettings;
}

// Menu API
app.get('/api/menu', (req, res) => res.json(menuData));
app.post('/api/menu', (req, res) => {
  menuData.length = 0;
  menuData.push(...req.body);
  saveMenuData(menuData);
  res.json({ success: true, count: menuData.length });
});

// Combos API
app.get('/api/combos', (req, res) => res.json(combosData));
app.post('/api/combos', (req, res) => {
  combosData.length = 0;
  combosData.push(...req.body);
  saveCombosData(combosData);
  res.json({ success: true, count: combosData.length });
});

// ========== ADMIN AUTH API ==========
const crypto = require('crypto');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

let usersData = {};
try { usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch(e) {}

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function logActivity(user, action, details) {
  try {
    let log = [];
    try { log = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'activity_log.json'), 'utf8')); } catch(e) {}
    log.unshift({
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      user: user || 'system',
      action,
      details,
      ip: req ? req.ip : 'unknown'
    });
    if (log.length > 1000) log = log.slice(0, 1000);
    fs.writeFileSync(path.join(__dirname, 'data', 'activity_log.json'), JSON.stringify(log, null, 2));
  } catch(e) { console.error('[ACTIVITY_LOG] Error:', e.message); }
}

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const user = usersData.users.find(u => u.username === username && u.active);
  if (!user) return res.status(401).json({ success: false, message: 'Benutzer nicht gefunden' });
  const hash = sha256(password);
  if (user.passwordHash !== hash) return res.status(401).json({ success: false, message: 'Falsches Passwort' });
  user.lastLogin = new Date().toISOString();
  fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2));
  const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
  logActivity(user.username, 'LOGIN', { role: user.role });
  res.json({ success: true, token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
});

app.post('/api/admin/change-password', (req, res) => {
  const { token, oldPassword, newPassword } = req.body;
  const parts = Buffer.from(token, 'base64').toString('utf8').split(':');
  const user = usersData.users.find(u => u.id === parts[0]);
  if (!user || user.passwordHash !== sha256(oldPassword)) return res.status(403).json({ success: false });
  user.passwordHash = sha256(newPassword);
  fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2));
  logActivity(user.username, 'CHANGE_PASSWORD', {});
  res.json({ success: true });
});

app.post('/api/admin/verify', (req, res) => {
  const { token } = req.body;
  try {
    const parts = Buffer.from(token, 'base64').toString('utf8').split(':');
    const user = usersData.users.find(u => u.id === parts[0]);
    if (!user || !user.active) return res.status(401).json({ valid: false });
    res.json({ valid: true, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
  } catch(e) { res.status(401).json({ valid: false }); }
});

// ========== ANALYTICS API ==========
const ANALYTICS_FILE = path.join(__dirname, 'data', 'analytics.json');
let analyticsData = {};
try { analyticsData = JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8')); } catch(e) {}

function saveAnalytics() {
  try { fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(analyticsData, null, 2)); } catch(e) {}
}

app.get('/api/analytics', (req, res) => res.json(analyticsData));

app.post('/api/analytics/track', (req, res) => {
  const { type, event, data } = req.body;
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const hourStr = now.getHours();

  if (type === 'pageview') {
    analyticsData.pageviews.push({ date: dateStr, hour: hourStr, path: event, timestamp: now.toISOString() });
    analyticsData.visits.push({ date: dateStr, hour: hourStr, timestamp: now.toISOString() });
  } else if (type === 'click') {
    analyticsData.clicks.push({ date: dateStr, hour: hourStr, event, data, timestamp: now.toISOString() });
  } else if (type === 'order') {
    analyticsData.orders.push({ date: dateStr, hour: hourStr, ...data, timestamp: now.toISOString() });
    // update daily orders
    const dayIdx = analyticsData.dailyOrders.findIndex(d => d.date === dateStr);
    if (dayIdx >= 0) analyticsData.dailyOrders[dayIdx].count++;
    else analyticsData.dailyOrders.push({ date: dateStr, count: 1 });
    // update revenue
    const revIdx = analyticsData.dailyRevenue.findIndex(d => d.date === dateStr);
    const amount = parseFloat(data.total) || 0;
    if (revIdx >= 0) analyticsData.dailyRevenue[revIdx].amount += amount;
    else analyticsData.dailyRevenue.push({ date: dateStr, amount });
    // update top products
    if (data.items) {
      data.items.forEach(it => {
        const prod = analyticsData.topProducts.find(p => p.name === it.name);
        if (prod) { prod.count++; prod.revenue += (parseFloat(it.unitPrice) || 0) * it.quantity; }
        else analyticsData.topProducts.push({ name: it.name, count: 1, revenue: (parseFloat(it.unitPrice) || 0) * it.quantity });
      });
      analyticsData.topProducts.sort((a, b) => b.count - a.count);
      analyticsData.topProducts = analyticsData.topProducts.slice(0, 20);
    }
  } else if (type === 'reservation') {
    analyticsData.reservations.push({ date: dateStr, hour: hourStr, ...data, timestamp: now.toISOString() });
  } else if (type === 'hourly') {
    const idx = analyticsData.hourlyDistribution.findIndex(h => h.hour === hourStr);
    if (idx >= 0) analyticsData.hourlyDistribution[idx][event] = (analyticsData.hourlyDistribution[idx][event] || 0) + 1;
    else {
      const entry = { hour: hourStr };
      entry[event] = 1;
      analyticsData.hourlyDistribution.push(entry);
    }
  }

  saveAnalytics();
  res.json({ success: true });
});

app.post('/api/analytics/reset', (req, res) => {
  analyticsData = { visits: [], pageviews: [], clicks: [], orders: [], reservations: [], products: [], hourlyDistribution: [], dailyOrders: [], dailyRevenue: [], topProducts: [], statusDistribution: [], lastReset: new Date().toISOString() };
  saveAnalytics();
  logActivity(req.body?.user || 'admin', 'RESET_ANALYTICS', {});
  res.json({ success: true });
});

// ========== ACTIVITY LOG API ==========
app.get('/api/admin/activity-log', (req, res) => {
  try { res.json(JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'activity_log.json'), 'utf8'))); }
  catch(e) { res.json([]); }
});

// ========== SEO FILES API ==========
const SEO_DIR = path.join(__dirname, 'public');
const SITEMAP_FILE = path.join(SEO_DIR, 'sitemap.xml');
const ROBOTS_FILE = path.join(SEO_DIR, 'robots.txt');

app.get('/sitemap.xml', (req, res) => {
  const baseUrl = process.env.VPS_DOMAIN || 'https://kimisushi.de';
  const today = new Date().toISOString().split('T')[0];
  let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  sitemap += `  <url><loc>${baseUrl}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n`;
  sitemap += `  <url><loc>${baseUrl}/#menu</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
  sitemap += `  <url><loc>${baseUrl}/#about</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
  sitemap += `  <url><loc>${baseUrl}/#contact</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>\n`;
  sitemap += '</urlset>';
  res.type('application/xml').send(sitemap);
});

app.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.VPS_DOMAIN || 'https://kimisushi.de';
  res.type('text').send(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\nSitemap: ${baseUrl}/sitemap.xml\n`);
});

// Settings API
app.get('/api/settings', (req, res) => res.json(settingsData));
app.post('/api/settings', (req, res) => {
  settingsData = req.body;
  try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsData, null, 2)); } catch(e) {}
  logActivity(req.body?._adminUser || 'admin', 'UPDATE_SETTINGS', { section: 'general' });
  res.json({ success: true });
});

app.post('/api/admin/settings/seo', (req, res) => {
  const { seoTitle, seoDescription, seoKeywords, seoTitleEn, seoDescriptionEn, seoKeywordsEn, seoAuthor, siteDomain } = req.body;
  settingsData.seoTitle = seoTitle;
  settingsData.seoDescription = seoDescription;
  settingsData.seoKeywords = seoKeywords;
  settingsData.seoTitleEn = seoTitleEn;
  settingsData.seoDescriptionEn = seoDescriptionEn;
  settingsData.seoKeywordsEn = seoKeywordsEn;
  settingsData.seoAuthor = seoAuthor;
  settingsData.siteDomain = siteDomain;
  try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsData, null, 2)); } catch(e) {}
  logActivity(req.body?._adminUser || 'admin', 'UPDATE_SEO', {});
  res.json({ success: true });
});

app.post('/api/admin/settings/geo', (req, res) => {
  settingsData.geoRegion = req.body.geoRegion;
  settingsData.geoPosition = req.body.geoPosition;
  settingsData.geoPlacename = req.body.geoPlacename;
  try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsData, null, 2)); } catch(e) {}
  logActivity(req.body?._adminUser || 'admin', 'UPDATE_GEO', {});
  res.json({ success: true });
});

app.post('/api/admin/settings/hours', (req, res) => {
  const keys = ['hoursMon1','hoursMon2','hoursTue1','hoursTue2','hoursWed1','hoursWed2','hoursThu1','hoursThu2','hoursFri1','hoursFri2','hoursSat1','hoursSat2','hoursSun1','hoursSun2','hoursSummary'];
  keys.forEach(k => { if (req.body[k] !== undefined) settingsData[k] = req.body[k]; });
  try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsData, null, 2)); } catch(e) {}
  logActivity(req.body?._adminUser || 'admin', 'UPDATE_HOURS', {});
  res.json({ success: true });
});

// ========== SOCKET.IO ==========
io.on('connection', (socket) => {
  console.log('[SOCKET] Client connected:', socket.id);

  socket.on('submit_order', (order) => {
    console.log('[SOCKET] New order received:', order.id);
    // Broadcast to all admins
    io.emit('admin_new_order', order);
  });

  socket.on('submit_reservation', (res) => {
    console.log('[SOCKET] New reservation received:', res.name);
    io.emit('admin_new_reservation', res);
  });

  socket.on('disconnect', () => {
    console.log('[SOCKET] Client disconnected:', socket.id);
  });
});

// ========== STATIC FILES ==========
app.use(express.static('.'));

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('');
  console.log('===========================================');
  console.log('🍣 Kimi Sushi Server đang chạy!');
  console.log(`🌐 http://localhost:${PORT}`);
  console.log('===========================================');
  console.log('');
  console.log('[CONFIG] Gmail Settings:');
  console.log(`  GMAIL_ENABLED: ${process.env.GMAIL_ENABLED === 'true' ? '✅ Bật' : '❌ Tắt'}`);
  console.log(`  GMAIL_USER: ${process.env.GMAIL_USER || '❌ Chưa cấu hình'}`);
  console.log(`  GMAIL_NOTIFY_EMAIL: ${process.env.GMAIL_NOTIFY_EMAIL || '(same as GMAIL_USER)'}`);
  console.log(`  GMAIL_APP_PASSWORD: ${process.env.GMAIL_APP_PASSWORD ? '✅ Đã cấu hình' : '❌ Chưa cấu hình'}`);
  console.log('');
  console.log('📝 Để bật Gmail, hãy tạo file .env với:');
  console.log('   GMAIL_ENABLED=true');
  console.log('   GMAIL_USER=your-email@gmail.com');
  console.log('   GMAIL_APP_PASSWORD=your-16-char-app-password');
  console.log('   GMAIL_NOTIFY_EMAIL=notify@example.com (optional)');
  console.log('');
});
