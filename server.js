require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const nodemailer = require('nodemailer');
const https = require('https');
const crypto = require('crypto');
const { resolveAsapPickup } = require('./js/dateUtils');

const app = express();
const server = http.createServer(app);

// ==================== MONGODB ====================
const { connectDB, mongoose } = require('./db');

// ==================== MODELS ====================
const MenuItem = require('./models/MenuItem');
const Combo = require('./models/Combo');
const Table = require('./models/Table');
const Order = require('./models/Order');
const Settings = require('./models/Settings');
const FAQ = require('./models/FAQ');
const User = require('./models/User');
const ActivityLog = require('./models/ActivityLog');
const Analytics = require('./models/Analytics');

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ==================== SOCKET.IO ====================
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// ==================== TELEGRAM ====================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Build inline keyboard for order actions (Giai đoạn 2: inline buttons)
function buildOrderInlineKeyboard(orderId) {
  return {
    inline_keyboard: [
      [
        { text: '⏱ 10 Min', callback_data: `pk_10_${orderId}` },
        { text: '⏱ 15 Min', callback_data: `pk_15_${orderId}` },
        { text: '⏱ 20 Min', callback_data: `pk_20_${orderId}` }
      ],
      [
        { text: '⏱ 25 Min', callback_data: `pk_25_${orderId}` },
        { text: '⏱ 30 Min', callback_data: `pk_30_${orderId}` },
        { text: '🔔 Bereit!', callback_data: `pk_ready_${orderId}` }
      ],
      [
        { text: '✅ Erhalten', callback_data: `st_rcv_${orderId}` },
        { text: '🍳 Bereitet vor', callback_data: `st_prep_${orderId}` },
        { text: '❌ Stornieren', callback_data: `st_canc_${orderId}` }
      ]
    ]
  };
}

function sendTelegramMessage(message, replyMarkup) {
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE' ||
      !TELEGRAM_CHAT_ID || TELEGRAM_CHAT_ID === 'YOUR_CHAT_ID_HERE') {
    console.warn('[TELEGRAM] Config missing — skipping notification');
    return Promise.resolve(null);
  }

  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'HTML'
  };
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  const data = JSON.stringify(payload);

  return new Promise((resolve) => {
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
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.ok) {
            console.log('[TELEGRAM] Message sent. message_id:', parsed.result.message_id);
            resolve(parsed.result.message_id);
          } else {
            console.error('[TELEGRAM] API error — code:', parsed.error_code, '| description:', parsed.description);
            resolve(null);
          }
        } catch (e) {
          console.error('[TELEGRAM] Failed to parse response:', body);
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      console.error('[TELEGRAM] Network error:', e.message);
      resolve(null);
    });

    req.write(data);
    req.end();
  });
}

// ==================== GMAIL SMTP ====================
function createGmailTransporter(gmailUser, gmailPassword) {
  const user = gmailUser || process.env.GMAIL_USER;
  const pass = gmailPassword || process.env.GMAIL_APP_PASSWORD;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
}

function createGmailTransporterWithConfig(gmailConfig) {
  const user = gmailConfig?.gmailUser || process.env.GMAIL_USER;
  const pass = gmailConfig?.gmailPassword || process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
}

async function sendGmailNotification(orderData, gmailConfig) {
  const gmailUser = gmailConfig?.gmailUser || process.env.GMAIL_USER;
  const gmailNotifyEmail = gmailConfig?.gmailNotifyEmail || process.env.GMAIL_NOTIFY_EMAIL || gmailUser;
  const gmailEnabled = gmailConfig?.gmailEnabled || process.env.GMAIL_ENABLED === 'true';
  const gmailPassword = gmailConfig?.gmailPassword || process.env.GMAIL_APP_PASSWORD;

  if (!gmailEnabled || !gmailUser || !gmailPassword) {
    console.log('[GMAIL] Gmail not configured, skipping notification.');
    return { success: false, reason: 'Gmail not configured' };
  }

  const isReservation = orderData.orderType === 'reservation' || orderData.type === 'reservation';
  const items = orderData.items || [];
  const customerName = orderData.customerName || orderData.name || 'Khách hàng';
  const customerPhone = orderData.customerPhone || orderData.phone || '-';
  const customerEmail = orderData.customerEmail || orderData.email || '-';
  const pickupDateRaw = orderData.pickupDate || orderData.date || '-';
  const pickupTimeRaw = orderData.pickupTime || orderData.time || '-';
  const pickupTimeDisplay = pickupTimeRaw === 'asap'
    ? 'So schnell wie möglich'
    : (pickupTimeRaw !== '-' ? `${pickupTimeRaw} Uhr` : '-');
  const total = orderData.total || '-';
  const deliveryFee = orderData.deliveryFee || '0';
  const address = orderData.address || '-';
  const method = orderData.method || '-';
  const notes = orderData.notes || orderData.remark || '-';
  const status = orderData.status || 'neu';
  const itemId = orderData.id || orderData.orderId || '-';
  const itemCount = orderData.itemCount || (orderData.guests ? `${orderData.guests} ${isReservation ? 'Gäste' : 'Personen'}` : '-');

  const normalizePrice = (p) => {
    if (typeof p === 'number') return p;
    if (!p) return 0;
    const cleaned = String(p).replace('€', '').replace(/\s/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const fmt = (n) => n.toFixed(2).replace('.', ',') + ' €';

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
        <h3 style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px; text-transform: uppercase;">📋 Bestell-/Reservierungsdaten</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px; width: 130px;"><strong>Nr.:</strong></td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: bold;">${itemId}</td>
          </tr>
          ${isReservation ? `<tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px;"><strong>Personen:</strong></td>
            <td style="padding: 6px 0; font-size: 16px; font-weight: bold; color: #22c55e;">${itemCount}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px;"><strong>Datum:</strong></td>
            <td style="padding: 6px 0; font-size: 14px;">${pickupDateRaw !== '-' ? pickupDateRaw.split('-').reverse().join('.') : '-'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px;"><strong>Uhrzeit:</strong></td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: bold;">${pickupTimeDisplay}</td>
          </tr>
          ${!isReservation ? `<tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px;"><strong>Art:</strong></td>
            <td style="padding: 6px 0; font-size: 14px;">${method === 'delivery' ? '🚴 Lieferung' : '🏪 Abholung / Vor Ort'}</td>
          </tr>` : ''}
          ${notes && notes.trim() ? `<tr>
            <td style="padding: 6px 0; color: #666; font-size: 13px; vertical-align: top;"><strong>⚠️ Allergien:</strong></td>
            <td style="padding: 6px 0; font-size: 14px; color: #b91c1c; font-weight: bold;">${notes}</td>
          </tr>` : ''}
        </table>
      </div>
      <div style="background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
        <h3 style="margin: 0 0 10px 0; color: #111; font-size: 14px; text-transform: uppercase;">👤 Kundendaten</h3>
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
      ${!isReservation && items.length > 0 ? `
      <div style="background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
        <h3 style="margin: 0 0 12px 0; color: #8B0000; font-size: 14px; text-transform: uppercase;">🛒 Bestellte Artikel</h3>
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
    return { success: false, reason: 'No valid Gmail credentials' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Kimi Sushi" <${gmailUser}>`,
      to: gmailNotifyEmail,
      subject: subject,
      html: htmlContent
    });
    console.log('[GMAIL] Notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[GMAIL] Error:', error);
    return { success: false, error: error.message };
  }
}

// ==================== HELPERS ====================
function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

async function logActivity(user, action, details) {
  try {
    await ActivityLog.create({
      id: 'log_' + Date.now(),
      user: user || 'system',
      action,
      details,
      ip: 'server',
      timestamp: new Date()
    });
  } catch (e) {
    console.error('[ACTIVITY_LOG] Error:', e.message);
  }
}

// ==================== API: HEALTH ====================
app.get('/api/health', async (req, res) => {
  res.json({
    status: 'ok',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    gmail: {
      enabled: process.env.GMAIL_ENABLED === 'true',
      user: process.env.GMAIL_USER ? '***' + process.env.GMAIL_USER.slice(-10) : null,
    },
    timestamp: new Date().toISOString()
  });
});

// ==================== API: GMAIL ====================
app.post('/api/gmail-notify', async (req, res) => {
  try {
    const orderData = req.body;
    if (!orderData) return res.status(400).json({ error: 'Missing order data' });

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

app.post('/api/gmail-test', async (req, res) => {
  try {
    const transporter = createGmailTransporter();
    await transporter.verify().then(() => {
      res.json({ success: true, message: 'Gmail SMTP connected successfully!' });
    }).catch(err => {
      res.status(500).json({ success: false, error: err.message });
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/gmail-test-send', async (req, res) => {
  const { gmailUser, gmailPassword } = req.body || {};
  const result = await sendGmailNotification({
    orderType: 'order',
    customerName: 'Test Customer',
    customerPhone: '+49 123 456789',
    customerEmail: 'test@example.com',
    pickupTime: '18:00',
    items: [
      { name: 'Sake Nigiri', quantity: 2, price: '5,90 €' },
      { name: 'Dragon Roll', quantity: 1, price: '14,90 €' }
    ],
    total: '26,70'
  }, { gmailUser, gmailPassword, gmailEnabled: true });
  res.json(result);
});

// ==================== API: MENU ====================
app.get('/api/menu', async (req, res) => {
  try {
    const items = await MenuItem.find({ isVisible: true }).sort({ category: 1, name: 1 });
    res.json(items);
  } catch (e) {
    console.error('[API] GET /api/menu error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/menu', async (req, res) => {
  try {
    const items = req.body;
    // Replace all: delete all then insert
    await MenuItem.deleteMany({});
    if (items && items.length > 0) {
      await MenuItem.insertMany(items.map(item => ({ ...item, updatedAt: new Date() })));
    }
    logActivity(req.body?._adminUser || 'admin', 'MENU_UPDATE', `Updated ${items?.length || 0} menu items`);
    const saved = await MenuItem.find({ isVisible: true });
    res.json({ success: true, count: saved.length, items: saved });
  } catch (e) {
    console.error('[API] POST /api/menu error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ==================== API: COMBOS ====================
app.get('/api/combos', async (req, res) => {
  try {
    const combos = await Combo.find({ isVisible: true }).sort({ name: 1 });
    res.json(combos);
  } catch (e) {
    console.error('[API] GET /api/combos error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/combos', async (req, res) => {
  try {
    const combos = req.body;
    await Combo.deleteMany({});
    if (combos && combos.length > 0) {
      await Combo.insertMany(combos.map(c => ({ ...c, updatedAt: new Date() })));
    }
    logActivity(req.body?._adminUser || 'admin', 'COMBOS_UPDATE', `Updated ${combos?.length || 0} combos`);
    const saved = await Combo.find({ isVisible: true });
    res.json({ success: true, count: saved.length, items: saved });
  } catch (e) {
    console.error('[API] POST /api/combos error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ==================== API: TABLES ====================
app.get('/api/tables', async (req, res) => {
  try {
    let tables = await Table.find({});
    if (!tables || tables.length === 0) {
      // Seed default tables
      const defaults = [
        { id: 'T1', name: 'Bàn 1', zone: 'Phòng 1', status: 'empty', orderItems: [], total: 0 },
        { id: 'T2', name: 'Bàn 2', zone: 'Phòng 1', status: 'empty', orderItems: [], total: 0 },
        { id: 'T3', name: 'Bàn 3', zone: 'Phòng 2', status: 'empty', orderItems: [], total: 0 },
        { id: 'T4', name: 'Bàn 4', zone: 'Phòng 2', status: 'empty', orderItems: [], total: 0 },
        { id: 'T5', name: 'Bàn 5 (Ngoài)', zone: 'Ngoài Trời', status: 'empty', orderItems: [], total: 0 },
        { id: 'T6', name: 'Bàn 6 (Ngoài)', zone: 'Ngoài Trời', status: 'empty', orderItems: [], total: 0 }
      ];
      await Table.insertMany(defaults);
      tables = defaults;
    }
    res.json(tables);
  } catch (e) {
    console.error('[API] GET /api/tables error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/tables', async (req, res) => {
  try {
    const tables = req.body;
    await Table.deleteMany({});
    if (tables && tables.length > 0) {
      await Table.insertMany(tables.map(t => ({ ...t, updatedAt: new Date() })));
    }
    logActivity(req.body?._adminUser || 'admin', 'TABLES_UPDATE', `Updated ${tables?.length || 0} tables`);
    const saved = await Table.find({});
    res.json({ success: true, count: saved.length, items: saved });
  } catch (e) {
    console.error('[API] POST /api/tables error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ==================== API: ORDERS / INBOX ====================
app.get('/api/inbox', async (req, res) => {
  try {
    const ordersList = await Order.find({ type: 'order' }).sort({ createdAt: -1 });
    const reservationsList = await Order.find({ type: 'reservation' }).sort({ createdAt: -1 });
    const all = [...ordersList, ...reservationsList].sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.json(all);
  } catch (e) {
    console.error('[API] GET /api/inbox error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/inbox', async (req, res) => {
  try {
    const item = req.body;

    if (!item.id) {
      item.id = (item.type === 'reservation' ? 'res_' : 'order_') + Date.now();
    }
    item.createdAt = new Date();
    item.updatedAt = new Date();

    // ASAP resolution — using shared dateUtils for consistent Europe/Berlin timezone
    if (item.type !== 'reservation' && item.pickupTime === 'asap') {
      const settings = await getSettingsObj();
      const resolved = resolveAsapPickup(settings);
      item.pickupDate = resolved.pickupDate;
      item.pickupTime = resolved.pickupTime;
      item.pickupTimeDisplay = resolved.pickupTimeDisplay;
    }

    // Upsert: update if exists, create if not
    await Order.findOneAndUpdate(
      { id: item.id },
      { $set: item },
      { upsert: true, new: true }
    );

    // Gmail notification
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

    // Telegram notification
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

      telegramMsg = `📅 NEUE TISCHRESERVIERUNG

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
      const orderDate = item.date || item.pickupDate || '-';
      const orderTime = item.time || item.pickupTime || item.pickupTimeDisplay || '-';
      const timeDisplay = orderTime === 'asap' ? 'So schnell wie möglich' : orderTime;

      let itemsDetail = '';
      const src = item.items || item.cart || [];
      if (src.length > 0) {
        src.forEach(i => {
          const qty = i.quantity || 1;
          const price = i.price ? ` — ${i.price}` : '';
          itemsDetail += `\n  ▸ ${i.name || '-'} x${qty}${price}`;
        });
      }

      telegramMsg = `🍣 NEUE BESTELLUNG

━━━━━━━━━━━━━━━
📋 BESTELL-NR.: ${item.id || '-'}
━━━━━━━━━━━━━━━
👤 Kunde: ${customerName}
📞 Telefon: ${phone}
📧 E-Mail: ${customerEmail}
━━━━━━━━━━━━━━━
🏪 Bestellart: ${method}
${item.method === 'delivery' ? `📍 Adresse: ${address}` : ''}
━━━━━━━━━━━━━━━
🗓 Datum: ${orderDate !== '-' ? orderDate.split('-').reverse().join('.') : '-'}
🕒 Abholzeit: ${timeDisplay}
━━━━━━━━━━━━━━━
${item.notes && item.notes.trim() ? `⚠️ ALLERGIEN / WÜNSCHE:
  ${item.notes.trim()}
━━━━━━━━━━━━━━━
` : ''}📋 Bestellte Artikel:${itemsDetail || '\n  (keine Details)'}
━━━━━━━━━━━━━━━
💰 Gesamtbetrag: ${total}
━━━━━━━━━━━━━━━
Status: ${status.toUpperCase()}`;
    }

    // Chỉ đơn hàng (không phải reservation) mới có inline buttons
    const replyMarkup = isReservation ? undefined : buildOrderInlineKeyboard(item.id);
    sendTelegramMessage(telegramMsg, replyMarkup);

    // Broadcast via Socket.IO
    io.emit(item.type === 'reservation' ? 'new_reservation' : 'new_order', item);

    res.json({ success: true, id: item.id });
  } catch (e) {
    console.error('[API] POST /api/inbox error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ==================== API: FAQ ====================
app.get('/api/faq', async (req, res) => {
  try {
    const faqs = await FAQ.find({ isVisible: true }).sort({ order: 1 });
    res.json(faqs);
  } catch (e) {
    console.error('[API] GET /api/faq error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/faq/all', async (req, res) => {
  try {
    const faqs = await FAQ.find({}).sort({ order: 1 });
    res.json(faqs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/faq', async (req, res) => {
  try {
    const faqs = req.body;
    await FAQ.deleteMany({});
    if (faqs && faqs.length > 0) {
      await FAQ.insertMany(faqs.map(f => ({ ...f, updatedAt: new Date() })));
    }
    logActivity(req.body?._adminUser || 'admin', 'FAQ_UPDATE', `Updated ${faqs?.length || 0} FAQ items`);
    const saved = await FAQ.find({}).sort({ order: 1 });
    res.json({ success: true, count: saved.length, items: saved });
  } catch (e) {
    console.error('[API] POST /api/faq error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ==================== API: SETTINGS ====================
async function getSettingsObj() {
  try {
    let settings = await Settings.findOne({});
    if (!settings) {
      settings = await Settings.create({
        brandName: 'Kimi Sushi',
        seoTitle: 'Kimi Sushi | Frisches Sushi & Authentische Japanische Küche',
        seoDescription: 'Genießen Sie frisches, hochwertiges Sushi bei Kimi Sushi in Filderstadt.',
        hoursSummary: 'Mo-Sa: 11:00-15:00 & 17:00-22:00 | So: 17:00-22:00',
        hoursMon1: '11:00 - 15:00', hoursMon2: '17:00 - 22:00',
        hoursTue1: '11:00 - 15:00', hoursTue2: '17:00 - 22:00',
        hoursWed1: '11:00 - 15:00', hoursWed2: '17:00 - 22:00',
        hoursThu1: '11:00 - 15:00', hoursThu2: '17:00 - 22:00',
        hoursFri1: '11:00 - 15:00', hoursFri2: '17:00 - 22:00',
        hoursSat1: '11:00 - 15:00', hoursSat2: '17:00 - 22:00',
        hoursSun1: '17:00 - 22:00', hoursSun2: '',
        deliveryEnabled: false,
        taxRate1: '19', taxRate2: '7'
      });
    }
    return settings.toObject();
  } catch (e) {
    console.error('[SETTINGS] getSettingsObj error:', e);
    return {};
  }
}

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getSettingsObj();
    res.json(settings);
  } catch (e) {
    console.error('[API] GET /api/settings error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const data = req.body;
    delete data._adminUser;
    data.updatedAt = new Date();
    await Settings.findOneAndUpdate({}, { $set: data }, { upsert: true, new: true });
    logActivity(req.body?._adminUser || 'admin', 'UPDATE_SETTINGS', { section: 'general' });
    const settings = await getSettingsObj();
    res.json({ success: true, settings });
  } catch (e) {
    console.error('[API] POST /api/settings error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/settings/seo', async (req, res) => {
  try {
    const { seoTitle, seoDescription, seoKeywords, seoTitleEn, seoDescriptionEn, seoKeywordsEn, seoAuthor, siteDomain } = req.body;
    await Settings.findOneAndUpdate({}, {
      $set: { seoTitle, seoDescription, seoKeywords, seoTitleEn, seoDescriptionEn, seoKeywordsEn, seoAuthor, siteDomain, updatedAt: new Date() }
    }, { upsert: true });
    logActivity(req.body?._adminUser || 'admin', 'UPDATE_SEO', {});
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/settings/geo', async (req, res) => {
  try {
    const { geoRegion, geoPosition, geoPlacename } = req.body;
    await Settings.findOneAndUpdate({}, { $set: { geoRegion, geoPosition, geoPlacename, updatedAt: new Date() } }, { upsert: true });
    logActivity(req.body?._adminUser || 'admin', 'UPDATE_GEO', {});
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/settings/hours', async (req, res) => {
  try {
    const keys = ['hoursMon1','hoursMon2','hoursTue1','hoursTue2','hoursWed1','hoursWed2','hoursThu1','hoursThu2','hoursFri1','hoursFri2','hoursSat1','hoursSat2','hoursSun1','hoursSun2','hoursSummary'];
    const updateData = {};
    keys.forEach(k => { if (req.body[k] !== undefined) updateData[k] = req.body[k]; });
    updateData.updatedAt = new Date();
    await Settings.findOneAndUpdate({}, { $set: updateData }, { upsert: true });
    logActivity(req.body?._adminUser || 'admin', 'UPDATE_HOURS', {});
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== API: ADMIN AUTH ====================
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, active: true });
    if (!user) return res.status(401).json({ success: false, message: 'Benutzer nicht gefunden' });

    const hash = sha256(password);
    if (user.passwordHash !== hash) return res.status(401).json({ success: false, message: 'Falsches Passwort' });

    user.lastLogin = new Date();
    await user.save();
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
    logActivity(user.username, 'LOGIN', { role: user.role });
    res.json({ success: true, token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/change-password', async (req, res) => {
  try {
    const { token, oldPassword, newPassword } = req.body;
    const parts = Buffer.from(token, 'base64').toString('utf8').split(':');
    const user = await User.findOne({ id: parts[0] });
    if (!user || user.passwordHash !== sha256(oldPassword)) return res.status(403).json({ success: false });

    user.passwordHash = sha256(newPassword);
    await user.save();
    logActivity(user.username, 'CHANGE_PASSWORD', {});
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/verify', async (req, res) => {
  try {
    const { token } = req.body;
    const parts = Buffer.from(token, 'base64').toString('utf8').split(':');
    const user = await User.findOne({ id: parts[0] });
    if (!user || !user.active) return res.status(401).json({ valid: false });
    res.json({ valid: true, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
  } catch (e) {
    res.status(401).json({ valid: false });
  }
});

// ==================== API: ANALYTICS ====================
app.get('/api/analytics', async (req, res) => {
  try {
    let analytics = await Analytics.findOne({});
    if (!analytics) {
      analytics = await Analytics.create({
        visits: [], pageviews: [], clicks: [],
        orders: [], reservations: [], products: [],
        hourlyDistribution: [], dailyOrders: [], dailyRevenue: [],
        topProducts: [], statusDistribution: [], lastReset: null
      });
    }
    res.json(analytics);
  } catch (e) {
    console.error('[API] GET /api/analytics error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/analytics/track', async (req, res) => {
  try {
    const { type, event, data } = req.body;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const hourStr = now.getHours();

    let analytics = await Analytics.findOne({});
    if (!analytics) {
      analytics = await Analytics.create({
        visits: [], pageviews: [], clicks: [],
        orders: [], reservations: [], products: [],
        hourlyDistribution: [], dailyOrders: [], dailyRevenue: [],
        topProducts: [], statusDistribution: []
      });
    }

    if (type === 'pageview') {
      analytics.pageviews.push({ date: dateStr, hour: hourStr, path: event, timestamp: now });
      analytics.visits.push({ date: dateStr, hour: hourStr, timestamp: now });
    } else if (type === 'click') {
      analytics.clicks.push({ date: dateStr, hour: hourStr, event, data, timestamp: now });
    } else if (type === 'order') {
      analytics.orders.push({ date: dateStr, hour: hourStr, ...data, timestamp: now });
      const dayIdx = analytics.dailyOrders.findIndex(d => d.date === dateStr);
      if (dayIdx >= 0) analytics.dailyOrders[dayIdx].count++;
      else analytics.dailyOrders.push({ date: dateStr, count: 1 });
      const revIdx = analytics.dailyRevenue.findIndex(d => d.date === dateStr);
      const amount = parseFloat(data.total) || 0;
      if (revIdx >= 0) analytics.dailyRevenue[revIdx].amount += amount;
      else analytics.dailyRevenue.push({ date: dateStr, amount });
      if (data.items) {
        data.items.forEach(it => {
          const prod = analytics.topProducts.find(p => p.name === it.name);
          if (prod) { prod.count++; prod.revenue += (parseFloat(it.unitPrice) || 0) * it.quantity; }
          else analytics.topProducts.push({ name: it.name, count: 1, revenue: (parseFloat(it.unitPrice) || 0) * it.quantity });
        });
        analytics.topProducts.sort((a, b) => b.count - a.count);
        analytics.topProducts = analytics.topProducts.slice(0, 20);
      }
    } else if (type === 'reservation') {
      analytics.reservations.push({ date: dateStr, hour: hourStr, ...data, timestamp: now });
    } else if (type === 'hourly') {
      const idx = analytics.hourlyDistribution.findIndex(h => h.hour === hourStr);
      if (idx >= 0) {
        analytics.hourlyDistribution[idx][event] = (analytics.hourlyDistribution[idx][event] || 0) + 1;
      } else {
        const entry = { hour: hourStr };
        entry[event] = 1;
        analytics.hourlyDistribution.push(entry);
      }
    }

    await analytics.save();
    res.json({ success: true });
  } catch (e) {
    console.error('[API] POST /api/analytics/track error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/analytics/reset', async (req, res) => {
  try {
    await Analytics.findOneAndUpdate({}, {
      visits: [], pageviews: [], clicks: [],
      orders: [], reservations: [], products: [],
      hourlyDistribution: [], dailyOrders: [], dailyRevenue: [],
      topProducts: [], statusDistribution: [], lastReset: new Date()
    });
    logActivity(req.body?.user || 'admin', 'RESET_ANALYTICS', {});
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== API: ACTIVITY LOG ====================
app.get('/api/admin/activity-log', async (req, res) => {
  try {
    const logs = await ActivityLog.find({}).sort({ timestamp: -1 }).limit(200);
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== API: TELEGRAM WEBHOOK (Giai đoạn 2) ====================
app.post('/api/telegram-webhook', async (req, res) => {
  try {
    const update = req.body;

    // Xử lý callback_query (khi bấm inline button)
    if (update.callback_query) {
      const { id: callback_id, data: callback_data, from: user, message } = update.callback_query;

      // Parse callback_data: format "pk_10_<orderId>" hoặc "st_rcv_<orderId>"
      const parts = (callback_data || '').split('_');
      const action = parts.slice(0, 2).join('_');  // e.g. "pk_10" or "st_rcv"
      const orderId = parts.slice(2).join('_');    // remaining = orderId

      console.log(`[TELEGRAM CB] action=${action} orderId=${orderId} from=${user?.first_name} ${user?.last_name || ''} (id=${user?.id})`);
      console.log(`[TELEGRAM CB] raw callback_data: "${callback_data}"`);
      console.log(`[TELEGRAM CB] parts: ${JSON.stringify(parts)}`);

      // Trả lời callback thành công cho Telegram (bắt buộc trong 30s)
      // Giai đoạn 2: chỉ log, chưa xử lý order hay gửi email
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callback_id,
          text: `✅ Action received: ${action} for order ${orderId}`,
          show_alert: false
        })
      });

      // Giai đoạn 3: sẽ update order status + gửi email cho khách ở đây
      console.log(`[TELEGRAM CB] >>> Giai đoạn 2: đã log, chờ Giai đoạn 3 xử lý tiếp`);

      return res.status(200).json({ ok: true });
    }

    // Các loại update khác (message, edited_message, etc.) — ignore
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[TELEGRAM WEBHOOK] Error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ==================== API: SEO FILES ====================
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

// ==================== SOCKET.IO ====================
io.on('connection', (socket) => {
  console.log('[SOCKET] Client connected:', socket.id);

  socket.on('submit_order', async (order) => {
    console.log('[SOCKET] New order received:', order.id);

    order.id = order.id || 'order_' + Date.now();
    order.createdAt = new Date();
    order.updatedAt = new Date();
    await Order.findOneAndUpdate({ id: order.id }, { $set: order }, { upsert: true, new: true });

    io.emit('admin_new_order', order);

    const customerName = order.customerName || order.name || '-';
    const phone = order.customerPhone || order.phone || '-';
    const email = order.customerEmail || order.email || '-';
    const orderId = order.id || '-';
    const pickupDate = order.pickupDate || '-';
    const pickupTime = order.pickupTime || order.pickupTimeDisplay || '-';
    const pickupDisplay = pickupTime === 'asap' ? 'So schnell wie möglich' : pickupTime;
    const method = order.method === 'delivery' ? '🚴 Lieferung' : '🏪 Abholung';
    const address = order.address && order.address !== 'Abholung / Vor Ort' ? order.address : null;
    const notes = (order.notes || '').trim();
    const total = order.total ? `${order.total.replace('.', ',')} €` : '-';
    const itemCount = order.itemCount || '-';
    const itemsSource = order.items || order.cart || [];
    let itemsDetail = '';
    if (itemsSource.length > 0) {
      itemsSource.forEach(i => {
        const qty = parseInt(i.quantity) || 1;
        const price = i.price ? ` — ${i.price}` : '';
        itemsDetail += `\n  ▸ ${i.name || '-'} x${qty}${price}`;
      });
    } else {
      itemsDetail = '\n  (keine Details)';
    }
    const formattedDate = pickupDate !== '-' ? pickupDate.split('-').reverse().join('.') : '-';

    const telegramMsg = `🍣 NEUE BESTELLUNG

━━━━━━━━━━━━━━━
📋 BESTELL-NR.: ${orderId}
━━━━━━━━━━━━━━━
👤 Kunde: ${customerName}
📞 Telefon: ${phone}
📧 E-Mail: ${email}
━━━━━━━━━━━━━━━
🏪 Bestellart: ${method}
${address ? `📍 Adresse: ${address}` : ''}
━━━━━━━━━━━━━━━
🗓 Datum: ${formattedDate}
🕒 Abholzeit: ${pickupDisplay}
━━━━━━━━━━━━━━━
${notes ? `⚠️ ALLERGIEN / WÜNSCHE:
  ${notes}
━━━━━━━━━━━━━━━
` : ''}📋 Bestellte Artikel:${itemsDetail}
━━━━━━━━━━━━━━━
🛒 Anzahl: ${itemCount} Gerichte
━━━━━━━━━━━━━━━
💰 Gesamtbetrag: ${total}
━━━━━━━━━━━━━━━
Status: NEU`;

    sendTelegramMessage(telegramMsg, buildOrderInlineKeyboard(orderId));
  });

  socket.on('submit_reservation', async (resv) => {
    console.log('[SOCKET] New reservation received:', resv.name);
    resv.id = resv.id || 'res_' + Date.now();
    resv.createdAt = new Date();
    await Order.findOneAndUpdate({ id: resv.id }, { $set: resv }, { upsert: true, new: true });
    io.emit('admin_new_reservation', resv);
  });

  socket.on('disconnect', () => {
    console.log('[SOCKET] Client disconnected:', socket.id);
  });
});

// ==================== STATIC FILES ====================
app.use(express.static('.'));

app.get('*', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;

async function start() {
  await connectDB();

  server.listen(PORT, () => {
    console.log('');
    console.log('===========================================');
    console.log('🍣 Kimi Sushi Server đang chạy!');
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '⚠️ Disconnected (offline mode)'}`);
    console.log('===========================================');
    console.log('');
    console.log('[CONFIG] Gmail Settings:');
    console.log(`  GMAIL_ENABLED: ${process.env.GMAIL_ENABLED === 'true' ? '✅ Bật' : '❌ Tắt'}`);
    console.log(`  GMAIL_USER: ${process.env.GMAIL_USER || '❌ Chưa cấu hình'}`);
    console.log(`  GMAIL_APP_PASSWORD: ${process.env.GMAIL_APP_PASSWORD ? '✅ Đã cấu hình' : '❌ Chưa cấu hình'}`);
  });
}

start();
