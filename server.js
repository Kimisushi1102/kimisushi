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

  const isReservation = orderData.orderType === 'reservation';
  let items = orderData.items || [];
  const customerName = orderData.customerName || orderData.name || 'Khách hàng';
  const customerPhone = orderData.customerPhone || orderData.phone || '-';
  const customerEmail = orderData.customerEmail || orderData.email || '-';
  // Use display-friendly pickup time (set by frontend), fallback to raw value
  const pickupTime = orderData.pickupTimeDisplay || orderData.pickupTime || '-';

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

  // Tạo bảng items HTML - FIX: luôn hiển thị đủ thông tin
  let itemsHtml = '';
  if (!isReservation && items.length > 0) {
    let orderSubtotal = 0;
    itemsHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-family: Arial, sans-serif;">
        <tr style="background: #8B0000;">
          <th style="padding: 10px; text-align: left; color: white; border-bottom: 2px solid #ddd;">Gericht</th>
          <th style="padding: 10px; text-align: center; color: white; border-bottom: 2px solid #ddd;">Menge</th>
          <th style="padding: 10px; text-align: right; color: white; border-bottom: 2px solid #ddd;">Einzelpreis</th>
          <th style="padding: 10px; text-align: right; color: white; border-bottom: 2px solid #ddd;">Gesamt</th>
        </tr>
    `;
    items.forEach(item => {
      const unitPrice = normalizePrice(item.price);
      const qty = parseInt(item.quantity) || 1;
      const subtotal = unitPrice * qty;
      orderSubtotal += subtotal;
      itemsHtml += `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name || '-'}</td>
          <td style="padding: 10px; text-align: center; border-bottom: 1px solid #eee;">x${qty}</td>
          <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${fmt(unitPrice)}</td>
          <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee; font-weight: bold;">${fmt(subtotal)}</td>
        </tr>
      `;
    });
    // Tổng cộng
    itemsHtml += `
        <tr style="background: #fef3c7;">
          <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold; font-size: 16px;">Gesamtbetrag:</td>
          <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px; color: #8B0000;">${fmt(orderSubtotal)}</td>
        </tr>
    `;
    itemsHtml += '</table>';
  } else if (!isReservation) {
    itemsHtml = '<p style="color: #999; font-style: italic;">Keine Bestelldetails vorhanden.</p>';
  }

  // Nội dung email thông báo
  const subject = isReservation
    ? `Neue Tischreservierung - ${customerName}`
    : `Neue Bestellung - ${customerName} - ${new Date().toLocaleDateString('de-DE')}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 3px solid ${isReservation ? '#22c55e' : '#8B0000'}; padding: 20px; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: ${isReservation ? '#22c55e' : '#8B0000'}; font-size: 24px; margin: 0;">
          ${isReservation ? 'Neue Tischreservierung' : 'Neue Bestellung'}
        </h1>
        <p style="color: #666; margin: 5px 0 0 0;">${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}</p>
      </div>

      <div style="background: #f0f9ff; border-radius: 10px; padding: 15px; margin-bottom: 15px;">
        <h3 style="margin: 0 0 10px 0; color: #1e40af;">Kundendaten</h3>
        <p style="margin: 5px 0;"><strong>Name:</strong> ${customerName}</p>
        <p style="margin: 5px 0;"><strong>Telefon:</strong> ${customerPhone}</p>
        <p style="margin: 5px 0;"><strong>E-Mail:</strong> ${customerEmail}</p>
        ${orderData.address ? `<p style="margin: 5px 0;"><strong>Adresse:</strong> ${orderData.address}</p>` : ''}
        ${orderData.method ? `<p style="margin: 5px 0;"><strong>Art:</strong> ${orderData.method === 'delivery' ? 'Lieferung' : 'Abholung'}</p>` : ''}
      </div>

      ${pickupTime && pickupTime !== '-' ? `
      <div style="background: #fef9c3; border-radius: 10px; padding: 15px; margin-bottom: 15px;">
        <h3 style="margin: 0 0 5px 0; color: #a16207;">Abholzeit</h3>
        <p style="margin: 0; font-size: 18px; font-weight: bold; color: #333;">${pickupTime}</p>
      </div>
      ` : ''}

      ${itemsHtml ? `
      <div style="background: #fff; border-radius: 10px; padding: 15px; margin-bottom: 15px; border: 1px solid #e5e7eb;">
        <h3 style="margin: 0 0 10px 0; color: #8B0000;">Bestelldetails</h3>
        ${itemsHtml}
        ${orderData.deliveryFee && parseFloat(orderData.deliveryFee) > 0 ? `<p style="margin: 5px 0; text-align: right;"><strong>Liefergebühr:</strong> ${orderData.deliveryFee} €</p>` : ''}
        ${orderData.total ? `<p style="margin: 15px 0 0 0; text-align: right; font-size: 18px;"><strong>Gesamtbetrag: <span style="color: #8B0000; font-size: 20px;">${orderData.total.replace('.', ',')} €</span></strong></p>` : ''}
      </div>
      ` : ''}

      <div style="background: #fef3c7; border-radius: 10px; padding: 15px; margin-bottom: 15px;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          Bitte diese Bestellung umgehend bearbeiten!
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
      <p style="font-size: 11px; color: #999; text-align: center;">Sakura Sushi - Automatisiertes System</p>
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
      from: `"Sakura Sushi" <${gmailUser}>`,
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
  item.time = new Date().toISOString();

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
  if (item.type !== 'reservation' && gmailCfg.gmailEnabled && gmailCfg.gmailUser && gmailCfg.gmailPassword) {
    sendGmailNotification(item, gmailCfg).catch(err => {
      console.error('[AUTO-GMAIL] Error:', err);
    });
  }

  // Gửi thông báo Telegram tự động khi có đơn mới
  const isReservation = item.type === 'reservation';
  const customerName = item.name || item.customerName || '-';
  const phone = item.phone || item.customerPhone || '-';
  const customerEmail = item.email || item.customerEmail || '-';
  const pickupDate = item.pickupDate || '-';
  const pickupDisplay = item.pickupTimeDisplay || item.pickupTime || '-';
  const status = item.status || 'neu';

  let telegramMsg;

  if (isReservation) {
    telegramMsg =
`📅 NEUE TISCHRESERVIERUNG

━━━━━━━━━━━━━━━
👤 Kunde: ${customerName}
📞 Telefon: ${phone}
📧 E-Mail: ${customerEmail}
━━━━━━━━━━━━━━━
🗓 Datum: ${pickupDate}
🕒 Uhrzeit: ${pickupDisplay}
👥 Gäste: ${item.guests || '-'}
📝 Anmerkung: ${item.notes || '-'}
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

    telegramMsg =
`🍣 NEUE BESTELLUNG

━━━━━━━━━━━━━━━
👤 Kunde: ${customerName}
📞 Telefon: ${phone}
📧 E-Mail: ${customerEmail}
━━━━━━━━━━━━━━━
📦 Bestellnummer: ${item.id || '-'}
🗓 Datum: ${pickupDate}
🕒 Abholzeit: ${pickupDisplay}
━━━━━━━━━━━━━━━
${method}
${item.method === 'delivery' ? `📍 Adresse: ${address}` : ''}
━━━━━━━━━━━━━━━
📋 Bestellte Artikel:${itemsDetail || '\n  (keine Details)'}
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

if (fs.existsSync(SETTINGS_FILE)) {
    try { settingsData = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); } catch(e) {}
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

// Settings API
app.get('/api/settings', (req, res) => res.json(settingsData));
app.post('/api/settings', (req, res) => {
  settingsData = req.body;
  try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsData, null, 2)); } catch(e) {}
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
  console.log('🍣 Sakura Sushi Server đang chạy!');
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
