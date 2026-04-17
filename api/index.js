'use strict';
const mongoose = require('mongoose');
const dns = require('dns');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// ─── MongoDB DNS fix & cached connection ──────────────────────────────────────
const googleResolver = new dns.promises.Resolver();
googleResolver.setServers(['8.8.8.8']);
dns.promises.resolveSrv = async (hostname) => {
  if (hostname && hostname.includes && hostname.includes('dwxwnkm.mongodb.net')) {
    return googleResolver.resolveSrv(hostname);
  }
  return dns.promises.Resolver.prototype.resolveSrv.call(dns.promises, hostname);
};
dns.promises.resolveTxt = async (hostname) => {
  if (hostname && hostname.includes && hostname.includes('dwxwnkm.mongodb.net')) {
    try { return await googleResolver.resolveTxt(hostname); } catch { return []; }
  }
  return dns.promises.Resolver.prototype.resolveTxt.call(dns.promises, hostname);
};
dns.promises.resolve4 = async (hostname) => {
  if (hostname && hostname.includes && hostname.includes('dwxwnkm.mongodb.net')) {
    return googleResolver.resolve4(hostname);
  }
  return dns.promises.Resolver.prototype.resolve4.call(dns.promises, hostname);
};

let _cached = null;
async function getConnection() {
  if (_cached) return _cached;
  const mongoUrl = process.env.MONGODB_URL;
  if (!mongoUrl) throw new Error('[MongoDB] MONGODB_URL not set');
  await mongoose.connect(mongoUrl, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
  });
  _cached = mongoose.connection;
  return _cached;
}

// ─── Mongoose schemas ──────────────────────────────────────────────────────────
const schemas = {
  MenuItem: mongoose.models.MenuItem || mongoose.model('MenuItem', new mongoose.Schema({
    id: String, name: String, category: String, price: String, image: String,
    description: String, tag: String, pieces: String, code: String,
    isVisible: { type: Boolean, default: true }, updatedAt: { type: Date, default: Date.now }
  }, { strict: false })),

  Combo: mongoose.models.Combo || mongoose.model('Combo', new mongoose.Schema({
    id: String, name: String, subtitle: String, price: String, oldPrice: String,
    tag: String, items: String, isVisible: { type: Boolean, default: true },
    updatedAt: { type: Date, default: Date.now }
  }, { strict: false })),

  Table: mongoose.models.Table || mongoose.model('Table', new mongoose.Schema({
    id: String, name: String, zone: String, status: { type: String, default: 'empty' },
    orderItems: Array, total: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
  }, { strict: false })),

  Order: mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({
    id: String, type: String, name: String, phone: String, email: String,
    date: String, time: String, pickupDate: String, pickupTime: String,
    pickupTimeDisplay: String, guests: String, persons: String, notes: String,
    remark: String, status: String, method: String, address: String,
    floor: String, bell: String, deliveryFee: String, distance: String,
    total: String, totalItemCount: String, cart: Array, items: Array,
    customerName: String, customerPhone: String, customerEmail: String,
    orderType: String, gmailEnabled: Boolean, adminReplied: Boolean,
    repliedAt: String, waitMinutes: Number,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }, { strict: false })),

  FAQ: mongoose.models.FAQ || mongoose.model('FAQ', new mongoose.Schema({
    id: String, question: String, answer: String,
    order: { type: Number, default: 0 },
    isVisible: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }, { strict: false })),

  Settings: mongoose.models.Settings || mongoose.model('Settings', new mongoose.Schema({}, { strict: false })),

  User: mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    id: String, username: String, passwordHash: String, name: String,
    role: String, active: { type: Boolean, default: true }, lastLogin: Date
  }, { strict: false })),

  ActivityLog: mongoose.models.ActivityLog || mongoose.model('ActivityLog', new mongoose.Schema({
    id: String, user: String, action: String,
    details: mongoose.Schema.Types.Mixed, ip: String,
    timestamp: { type: Date, default: Date.now }
  }, { strict: false })),

  Analytics: mongoose.models.Analytics || mongoose.model('Analytics', new mongoose.Schema({
    visits: Array, pageviews: Array, clicks: Array, orders: Array,
    reservations: Array, products: Array, hourlyDistribution: Array,
    dailyOrders: Array, dailyRevenue: Array, topProducts: Array,
    statusDistribution: Array, lastReset: Date
  }, { strict: false })),
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

function sendCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function getSettingsObj() {
  let settings = await schemas.Settings.findOne({});
  if (!settings) {
    settings = await schemas.Settings.create({
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
      deliveryEnabled: false, taxRate1: '19', taxRate2: '7'
    });
  }
  return settings.toObject ? settings.toObject() : Object.assign({}, settings);
}

// ─── Router ───────────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  sendCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end('');

  const url = req.url || '';
  const pathname = url.split('?')[0];
  const method = (req.method || 'GET').toUpperCase();
  const query = {};
  try {
    const u = new URL(url, 'https://x');
    for (const [k, v] of u.searchParams) query[k] = v;
  } catch {}

  try {
    // ── GET /api/health ───────────────────────────────────────
    if (pathname === '/api/health') {
      return res.status(200).json({
        status: 'ok',
        mongodb: process.env.MONGODB_URL ? 'configured' : 'not_configured',
        gmail: { enabled: process.env.GMAIL_ENABLED === 'true', user: process.env.GMAIL_USER ? '***' + process.env.GMAIL_USER.slice(-10) : null },
        timestamp: new Date().toISOString()
      });
    }

    // ── GET/POST /api/menu ─────────────────────────────────────
    if (pathname === '/api/menu') {
      if (method === 'GET') {
        await getConnection();
        const items = await schemas.MenuItem.find({ isVisible: true }).sort({ category: 1, name: 1 });
        return res.status(200).json(items);
      }
      if (method === 'POST') {
        await getConnection();
        const items = req.body;
        await schemas.MenuItem.deleteMany({});
        if (items && items.length > 0) {
          await schemas.MenuItem.insertMany(items.map(item => {
            const obj = item && typeof item.toObject === 'function' ? item.toObject() : Object.assign({}, item);
            obj.updatedAt = new Date();
            return obj;
          }));
        }
        const saved = await schemas.MenuItem.find({ isVisible: true });
        return res.status(200).json({ success: true, count: saved.length, items: saved });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── GET/POST /api/combos ────────────────────────────────────
    if (pathname === '/api/combos') {
      if (method === 'GET') {
        await getConnection();
        const combos = await schemas.Combo.find({ isVisible: true }).sort({ name: 1 });
        return res.status(200).json(combos);
      }
      if (method === 'POST') {
        await getConnection();
        const combos = req.body;
        await schemas.Combo.deleteMany({});
        if (combos && combos.length > 0) {
          await schemas.Combo.insertMany(combos.map(c => {
            const obj = c && typeof c.toObject === 'function' ? c.toObject() : Object.assign({}, c);
            obj.updatedAt = new Date();
            return obj;
          }));
        }
        const saved = await schemas.Combo.find({ isVisible: true });
        return res.status(200).json({ success: true, count: saved.length, items: saved });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── GET/POST /api/tables ────────────────────────────────────
    if (pathname === '/api/tables') {
      if (method === 'GET') {
        await getConnection();
        let tables = await schemas.Table.find({});
        if (!tables || tables.length === 0) {
          const defaults = [
            { id: 'T1', name: 'B\u00e0n 1', zone: 'Ph\u00f2ng 1', status: 'empty', orderItems: [], total: 0 },
            { id: 'T2', name: 'B\u00e0n 2', zone: 'Ph\u00f2ng 1', status: 'empty', orderItems: [], total: 0 },
            { id: 'T3', name: 'B\u00e0n 3', zone: 'Ph\u00f2ng 2', status: 'empty', orderItems: [], total: 0 },
            { id: 'T4', name: 'B\u00e0n 4', zone: 'Ph\u00f2ng 2', status: 'empty', orderItems: [], total: 0 },
            { id: 'T5', name: 'B\u00e0n 5 (Ngo\u00e0i)', zone: 'Ngo\u00e0i Tr\u1eddi', status: 'empty', orderItems: [], total: 0 },
            { id: 'T6', name: 'B\u00e0n 6 (Ngo\u00e0i)', zone: 'Ngo\u00e0i Tr\u1eddi', status: 'empty', orderItems: [], total: 0 }
          ];
          await schemas.Table.insertMany(defaults);
          tables = defaults;
        }
        return res.status(200).json(tables);
      }
      if (method === 'POST') {
        await getConnection();
        const tables = req.body;
        await schemas.Table.deleteMany({});
        if (tables && tables.length > 0) {
          await schemas.Table.insertMany(tables.map(t => {
            const obj = t && typeof t.toObject === 'function' ? t.toObject() : Object.assign({}, t);
            obj.updatedAt = new Date();
            return obj;
          }));
        }
        const saved = await schemas.Table.find({});
        return res.status(200).json({ success: true, count: saved.length, items: saved });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── GET/POST /api/inbox ─────────────────────────────────────
    if (pathname === '/api/inbox') {
      if (method === 'GET') {
        await getConnection();
        const type = query.type;
        if (type === 'orders') {
          const list = await schemas.Order.find({ type: 'order' }).sort({ createdAt: -1 });
          return res.status(200).json(list);
        }
        if (type === 'reservations') {
          const list = await schemas.Order.find({ type: 'reservation' }).sort({ createdAt: -1 });
          return res.status(200).json(list);
        }
        const ordersList = await schemas.Order.find({ type: 'order' }).sort({ createdAt: -1 });
        const reservationsList = await schemas.Order.find({ type: 'reservation' }).sort({ createdAt: -1 });
        return res.status(200).json([...ordersList, ...reservationsList].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      }
      if (method === 'POST') {
        await getConnection();
        let item = req.body;
        if (!item.id) item.id = (item.type === 'reservation' ? 'res_' : 'order_') + Date.now();
        item.createdAt = new Date();
        item.updatedAt = new Date();
        if (item.type !== 'reservation' && item.pickupTime === 'asap') {
          const now = new Date();
          const nowMin = now.getHours() * 60 + now.getMinutes();
          const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
          const todayKey = dayNames[now.getDay()];
          const settings = await getSettingsObj();
          const parseHours = (str) => {
            if (!str || !str.includes('-')) return null;
            const parts = str.split('-').map(s => s.trim());
            return { start: parseInt(parts[0].split(':')[0]) * 60 + parseInt(parts[0].split(':')[1]), end: parseInt(parts[1].split(':')[0]) * 60 + parseInt(parts[1].split(':')[1]) };
          };
          const todayKeyCap = todayKey.charAt(0).toUpperCase() + todayKey.slice(1);
          const todaySlots = [parseHours(settings['hours' + todayKeyCap + '1']), parseHours(settings['hours' + todayKeyCap + '2'])].filter(Boolean);
          const isStoreOpen = todaySlots.some(s => nowMin >= s.start && nowMin < s.end - 20);
          if (isStoreOpen) {
            const allSlots = [...todaySlots].sort((a, b) => a.start - b.start);
            let earliest = allSlots[0].start;
            if (nowMin >= earliest) earliest = Math.ceil((nowMin + 30) / 30) * 30;
            const nextHh = String(Math.floor(earliest / 60)).padStart(2, '0');
            const nextMm = String(earliest % 60).padStart(2, '0');
            item.pickupDate = now.toISOString().split('T')[0];
            item.pickupTime = nextHh + ':' + nextMm;
            item.pickupTimeDisplay = 'Schnellstm\u00f6glich (ca. ' + nextHh + ':' + nextMm + ' Uhr)';
          } else {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const nextDayKey = dayNames[tomorrow.getDay()];
            const nextDayKeyCap = nextDayKey.charAt(0).toUpperCase() + nextDayKey.slice(1);
            const nextSlots = [parseHours(settings['hours' + nextDayKeyCap + '1']), parseHours(settings['hours' + nextDayKeyCap + '2'])].filter(Boolean);
            if (nextSlots.length > 0) {
              const earliest = Math.min(...nextSlots.map(s => s.start));
              const nextHh = String(Math.floor(earliest / 60)).padStart(2, '0');
              const nextMm = String(earliest % 60).padStart(2, '0');
              item.pickupDate = tomorrow.toISOString().split('T')[0];
              item.pickupTime = nextHh + ':' + nextMm;
              item.pickupTimeDisplay = tomorrow.toLocaleDateString('de-DE') + ' um ' + nextHh + ':' + nextMm + ' Uhr';
            }
          }
        }
        await schemas.Order.findOneAndUpdate({ id: item.id }, { $set: item }, { upsert: true, new: true });
        return res.status(200).json({ success: true, id: item.id });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── GET/POST /api/faq ───────────────────────────────────────
    if (pathname === '/api/faq') {
      if (method === 'GET') {
        await getConnection();
        const faqs = await schemas.FAQ.find({ isVisible: true }).sort({ order: 1 });
        return res.status(200).json(faqs);
      }
      if (method === 'POST') {
        await getConnection();
        const faqs = req.body;
        await schemas.FAQ.deleteMany({});
        if (faqs && faqs.length > 0) {
          await schemas.FAQ.insertMany(faqs.map(f => {
            const obj = f && typeof f.toObject === 'function' ? f.toObject() : Object.assign({}, f);
            obj.updatedAt = new Date();
            return obj;
          }));
        }
        const saved = await schemas.FAQ.find({}).sort({ order: 1 });
        return res.status(200).json({ success: true, count: saved.length, items: saved });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── GET /api/faq/all ────────────────────────────────────────
    if (pathname === '/api/faq/all') {
      await getConnection();
      const faqs = await schemas.FAQ.find({}).sort({ order: 1 });
      return res.status(200).json(faqs);
    }

    // ── GET/POST /api/settings ──────────────────────────────────
    if (pathname === '/api/settings') {
      if (method === 'GET') {
        await getConnection();
        const settings = await getSettingsObj();
        return res.status(200).json(settings);
      }
      if (method === 'POST') {
        await getConnection();
        const data = req.body;
        delete data._adminUser;
        data.updatedAt = new Date();
        await schemas.Settings.findOneAndUpdate({}, { $set: data }, { upsert: true, new: true });
        const settings = await getSettingsObj();
        return res.status(200).json({ success: true, settings });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── GET/POST /api/reservations ──────────────────────────────
    if (pathname === '/api/reservations') {
      if (method === 'GET') {
        await getConnection();
        const reservations = await schemas.Order.find({ type: 'reservation' }).sort({ createdAt: -1 });
        return res.status(200).json(reservations);
      }
      if (method === 'POST') {
        await getConnection();
        let item = req.body;
        if (!item.id) item.id = 'res_' + Date.now();
        item.type = 'reservation';
        item.createdAt = new Date();
        item.updatedAt = new Date();
        await schemas.Order.findOneAndUpdate({ id: item.id }, { $set: item }, { upsert: true, new: true });
        return res.status(200).json({ success: true, id: item.id });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── GET/POST /api/transactions & /api/history ───────────────
    if (pathname === '/api/transactions' || pathname === '/api/history') {
      if (method === 'GET') {
        await getConnection();
        const transactions = await schemas.Order.find({
          type: 'order',
          status: { $in: ['abgeschlossen', 'fertig', 'in_bearbeitung', 'neu'] }
        }).sort({ createdAt: -1 }).limit(500);
        return res.status(200).json(transactions.map(t => ({
          id: t.id, tableId: t.tableId || 'APP',
          items: t.cart || t.items || [],
          subtotal: t.subtotal || 0, tax: t.tax || 0,
          discount: t.discount || 0, discountPercent: t.discountPercent || 0,
          total: parseFloat(t.total) || 0,
          paymentMethod: t.paymentMethod || 'cash',
          timestamp: t.createdAt,
          name: t.name || t.customerName || '',
          phone: t.phone || t.customerPhone || '',
          email: t.email || t.customerEmail || ''
        })));
      }
      if (method === 'POST') {
        await getConnection();
        let item = req.body;
        if (!item.id) item.id = 'tx_' + Date.now();
        item.type = 'order';
        item.createdAt = item.timestamp ? new Date(item.timestamp) : new Date();
        item.updatedAt = new Date();
        await schemas.Order.findOneAndUpdate({ id: item.id }, { $set: item }, { upsert: true, new: true });
        return res.status(200).json({ success: true });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── GET /api/analytics ──────────────────────────────────────
    if (pathname === '/api/analytics') {
      await getConnection();
      let analytics = await schemas.Analytics.findOne({});
      if (!analytics) {
        analytics = await schemas.Analytics.create({
          visits: [], pageviews: [], clicks: [], orders: [], reservations: [], products: [],
          hourlyDistribution: [], dailyOrders: [], dailyRevenue: [],
          topProducts: [], statusDistribution: [], lastReset: null
        });
      }
      return res.status(200).json(analytics);
    }

    // ── POST /api/analytics/track ───────────────────────────────
    if (pathname === '/api/analytics/track') {
      await getConnection();
      const { type, event, data } = req.body;
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const hourStr = now.getHours();

      let analytics = await schemas.Analytics.findOne({});
      if (!analytics) {
        analytics = await schemas.Analytics.create({
          visits: [], pageviews: [], clicks: [], orders: [], reservations: [], products: [],
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
        if (idx >= 0) analytics.hourlyDistribution[idx][event] = (analytics.hourlyDistribution[idx][event] || 0) + 1;
        else { const entry = { hour: hourStr }; entry[event] = 1; analytics.hourlyDistribution.push(entry); }
      }
      await analytics.save();
      return res.status(200).json({ success: true });
    }

    // ── POST /api/analytics/reset ────────────────────────────────
    if (pathname === '/api/analytics/reset') {
      await getConnection();
      await schemas.Analytics.findOneAndUpdate({}, {
        visits: [], pageviews: [], clicks: [], orders: [], reservations: [], products: [],
        hourlyDistribution: [], dailyOrders: [], dailyRevenue: [],
        topProducts: [], statusDistribution: [], lastReset: new Date()
      });
      return res.status(200).json({ success: true });
    }

    // ── POST /api/gmail-notify ──────────────────────────────────
    if (pathname === '/api/gmail-notify') {
      const orderData = req.body;
      const gmailUser = orderData.gmailUser || process.env.GMAIL_USER;
      const gmailPassword = orderData.gmailPassword || process.env.GMAIL_APP_PASSWORD;
      const gmailNotifyEmail = orderData.gmailNotifyEmail || process.env.GMAIL_NOTIFY_EMAIL || gmailUser;
      const gmailEnabled = orderData.gmailEnabled || process.env.GMAIL_ENABLED === 'true';
      if (!gmailEnabled || !gmailUser || !gmailPassword) return res.status(200).json({ success: false, reason: 'Gmail not configured' });

      const isReservation = orderData.orderType === 'reservation' || orderData.type === 'reservation';
      const items = orderData.items || [];
      const customerName = orderData.customerName || orderData.name || 'Khách hàng';
      const customerPhone = orderData.customerPhone || orderData.phone || '-';
      const customerEmail = orderData.customerEmail || orderData.email || '-';
      const pickupTime = orderData.pickupTime || orderData.time || '-';
      const pickupTimeDisplay = pickupTime === 'asap' ? 'So schnell wie möglich' : (pickupTime !== '-' ? pickupTime + ' Uhr' : '-');
      const total = orderData.total || '-';
      const method = orderData.method || '-';
      const notes = orderData.notes || orderData.remark || '-';
      const itemId = orderData.id || orderData.orderId || '-';
      const itemCount = orderData.itemCount || (orderData.guests ? orderData.guests + ' ' + (isReservation ? 'Gäste' : 'Personen') : '-');
      const address = orderData.address || '-';
      const normalizePrice = (p) => { if (typeof p === 'number') return p; if (!p) return 0; return parseFloat(String(p).replace('€', '').replace(/\s/g, '').replace(',', '.')) || 0; };
      const fmt = (n) => n.toFixed(2).replace('.', ',') + ' €';

      let itemsHtml = '';
      if (!isReservation && items.length > 0) {
        itemsHtml = '<table style="width:100%;border-collapse:collapse;margin:15px 0;"><tr style="background:#f8f9fa;"><th style="padding:8px;text-align:left;">Gericht</th><th style="padding:8px;text-align:center;">Menge</th><th style="padding:8px;text-align:right;">Preis</th><th style="padding:8px;text-align:right;">Summe</th></tr>';
        items.forEach(item => {
          const unitPrice = normalizePrice(item.price);
          const qty = parseInt(item.quantity) || 1;
          const subtotal = unitPrice * qty;
          itemsHtml += '<tr><td style="padding:8px;border-bottom:1px solid #eee;">' + (item.name || '-') + '</td><td style="padding:8px;text-align:center;border-bottom:1px solid #eee;">' + qty + '</td><td style="padding:8px;text-align:right;border-bottom:1px solid #eee;">' + fmt(unitPrice) + '</td><td style="padding:8px;text-align:right;border-bottom:1px solid #eee;font-weight:bold;">' + fmt(subtotal) + '</td></tr>';
        });
        itemsHtml += '</table>';
      }

      const subject = isReservation ? '📅 Neue Tischreservierung - ' + customerName : 'Neue Bestellung - ' + customerName;
      const color = isReservation ? '#22c55e' : '#8B0000';
      const label = isReservation ? '📅 Neue Tischreservierung' : '🍣 Neue Bestellung';

      const htmlContent = '<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;border:3px solid ' + color + ';padding:24px;border-radius:14px;">' +
        '<div style="text-align:center;margin-bottom:24px;"><h1 style="color:' + color + ';font-size:26px;margin:0;">' + label + '</h1><p style="color:#888;margin:8px 0 0 0;font-size:13px;">' + new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }) + '</p></div>' +
        '<div style="background:#f0f9ff;border-radius:10px;padding:16px;margin-bottom:16px;border:1px solid #dbeafe;">' +
        '<h3 style="margin:0 0 10px 0;color:#1e40af;font-size:14px;text-transform:uppercase;">Bestell-/Reservierungsdaten</h3>' +
        '<table style="width:100%;border-collapse:collapse;">' +
        '<tr><td style="padding:6px 0;color:#666;font-size:13px;width:130px;"><strong>Nr.:</strong></td><td style="padding:6px 0;font-size:14px;font-weight:bold;">' + itemId + '</td></tr>' +
        (isReservation ? '<tr><td style="padding:6px 0;color:#666;font-size:13px;"><strong>Personen:</strong></td><td style="padding:6px 0;font-size:16px;font-weight:bold;color:' + color + ';">' + itemCount + '</td></tr>' : '') +
        '<tr><td style="padding:6px 0;color:#666;font-size:13px;"><strong>Uhrzeit:</strong></td><td style="padding:6px 0;font-size:14px;font-weight:bold;">' + pickupTimeDisplay + '</td></tr>' +
        (!isReservation ? '<tr><td style="padding:6px 0;color:#666;font-size:13px;"><strong>Art:</strong></td><td style="padding:6px 0;font-size:14px;">' + (method === 'delivery' ? '🚴 Lieferung' : '🏪 Abholung / Vor Ort') + '</td></tr>' : '') +
        (notes && notes.trim() ? '<tr><td style="padding:6px 0;color:#666;font-size:13px;vertical-align:top;"><strong>⚠️ Allergien:</strong></td><td style="padding:6px 0;font-size:14px;color:#b91c1c;font-weight:bold;">' + notes + '</td></tr>' : '') +
        '</table></div>' +
        '<div style="background:#fff;border-radius:10px;padding:16px;margin-bottom:16px;border:1px solid #e5e7eb;">' +
        '<h3 style="margin:0 0 10px 0;color:#111;font-size:14px;text-transform:uppercase;">Kundendaten</h3>' +
        '<table style="width:100%;border-collapse:collapse;">' +
        '<tr><td style="padding:6px 0;color:#666;font-size:13px;width:130px;"><strong>Name:</strong></td><td style="padding:6px 0;font-size:14px;font-weight:bold;">' + customerName + '</td></tr>' +
        '<tr><td style="padding:6px 0;color:#666;font-size:13px;"><strong>Telefon:</strong></td><td style="padding:6px 0;font-size:14px;">' + customerPhone + '</td></tr>' +
        '<tr><td style="padding:6px 0;color:#666;font-size:13px;"><strong>E-Mail:</strong></td><td style="padding:6px 0;font-size:14px;">' + customerEmail + '</td></tr>' +
        (!isReservation && address && address !== 'Abholung / Vor Ort' ? '<tr><td style="padding:6px 0;color:#666;font-size:13px;"><strong>Adresse:</strong></td><td style="padding:6px 0;font-size:14px;">' + address + '</td></tr>' : '') +
        '</table></div>' + itemsHtml +
        '<div style="background:#fef3c7;border-radius:10px;padding:14px;margin-bottom:16px;border:1px solid #fde68a;">' +
        '<p style="margin:0;color:#92400e;font-size:13px;text-align:center;">' + (isReservation ? 'Bitte diese Reservierung umgehend bestätigen!' : 'Bitte diese Bestellung umgehend bearbeiten!') + '</p></div></div>';

      const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailPassword } });
      const info = await transporter.sendMail({ from: '"Sakura Sushi" <' + gmailUser + '>', to: gmailNotifyEmail, subject: subject, html: htmlContent });
      return res.status(200).json({ success: true, messageId: info.messageId });
    }

    // ── POST /api/gmail-test ─────────────────────────────────────
    if (pathname === '/api/gmail-test') {
      const transporter = nodemailer.createTransport({
        service: 'gmail', auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
      });
      try {
        await transporter.verify();
        return res.status(200).json({ success: true, message: 'Gmail SMTP connected successfully!' });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    // ── POST /api/gmail-test-send ────────────────────────────────
    if (pathname === '/api/gmail-test-send') {
      const { gmailUser: gU, gmailPassword: gP } = req.body || {};
      const user = gU || process.env.GMAIL_USER;
      const pass = gP || process.env.GMAIL_APP_PASSWORD;
      if (!user || !pass) return res.status(400).json({ success: false, error: 'Gmail credentials required' });
      const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
      const result = await transporter.sendMail({
        from: '"Sakura Sushi" <' + user + '>', to: user,
        subject: '✅ Sakura Sushi - Test Email',
        html: '<h1>Test erfolgreich!</h1><p>Dies ist eine Test-E-Mail von Sakura Sushi System.</p>'
      });
      return res.status(200).json({ success: true, messageId: result.messageId });
    }

    // ── POST /api/test-telegram ─────────────────────────────────
    if (pathname === '/api/test-telegram') {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (!botToken || !chatId) return res.status(400).json({ success: false, message: 'Telegram not configured' });
      const response = await fetch('https://api.telegram.org/bot' + botToken + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: '✅ Sakura Sushi BOT - Kết nối thành công! Bạn sẽ nhận được thông báo khi có khách đặt hàng.' })
      });
      const result = await response.json();
      return res.status(200).json({ success: result.ok });
    }

    // ── POST /api/notify-admin ──────────────────────────────────
    if (pathname === '/api/notify-admin') {
      const data = req.body;
      const botToken = data.botToken || process.env.TELEGRAM_BOT_TOKEN;
      const chatId = data.chatId || process.env.TELEGRAM_CHAT_ID;
      if (!botToken || !chatId) return res.status(400).json({ success: false, message: 'Missing Telegram config' });

      const isReservation = data.orderType === 'reservation';
      const emoji = isReservation ? '📅' : '🍣';
      const typeLabel = isReservation ? 'NEUE RESERVIERUNG' : 'NEUE BESTELLUNG';
      const src = data.items || data.cart || [];
      let itemsText = '';
      if (!isReservation && src && src.length > 0) {
        itemsText = '━━━━━━━━━━━━━━━━━━\n🍽️ <b>Bestellung:</b>\n';
        src.forEach(item => { itemsText += '  • ' + (item.quantity || 1) + 'x ' + (item.name || '') + '\n'; });
        itemsText += '━━━━━━━━━━━━━━━━━━\n';
      }

      const name = data.customerName || data.name || '-';
      const phone = data.customerPhone || data.phone || '-';
      const email = data.customerEmail || data.email || '-';
      const time = data.pickupTime || data.time || '-';
      const fmtTime = data.pickupDate && time !== '-' ? data.pickupDate.split('-').reverse().join('.') + ' um ' + time + ' Uhr' : time + ' Uhr';

      let telegramText = emoji + ' ' + typeLabel + '\n━━━━━━━━━━━━━━━━━━\n👤 Kunde: ' + name + '\n📱 Tel: ' + phone + '\n📧 Email: ' + email + '\n';
      if (data.pickupTime || data.time) telegramText += '🕒 Zeit: ' + fmtTime + '\n';
      if (data.itemCount) telegramText += '📦 Anzahl: ' + data.itemCount + (isReservation ? ' Gäste' : ' Gerichte') + '\n';
      if (!isReservation && data.notes && data.notes.trim()) telegramText += '⚠️ ALLERGIEN: ' + data.notes.trim() + '\n';
      if (itemsText) telegramText += itemsText;
      if (data.total) telegramText += '💰 <b>SUMME: ' + data.total + '€</b>\n';
      telegramText += '━━━━━━━━━━━━━━━━━━\n⏰ ' + new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });

      const response = await fetch('https://api.telegram.org/bot' + botToken + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: telegramText, parse_mode: 'HTML' })
      });
      const result = await response.json();
      return res.status(200).json({ success: result.ok, data: result });
    }

    // ── POST /api/notify-order ──────────────────────────────────
    if (pathname === '/api/notify-order') {
      await getConnection();
      const { id, type, name, phone, email, date, time, guests, items, total, cart, notes, method, address, deliveryFee, distance, customerName, customerPhone, customerEmail } = req.body;
      const itemData = {
        id: id || 'order_' + Date.now(),
        type: type || 'order',
        name: name || customerName || '',
        phone: phone || customerPhone || '',
        email: email || customerEmail || '',
        date: date || '', time: time || '',
        pickupDate: date || '', pickupTime: time || '',
        guests: guests || '', persons: guests || '',
        notes: notes || '', remark: notes || '',
        status: 'neu',
        method: method || '',
        address: address || '',
        deliveryFee: deliveryFee || '0',
        distance: distance || '',
        total: total || '',
        cart: cart || items || [],
        items: items || cart || [],
        customerName: customerName || name || '',
        customerPhone: customerPhone || phone || '',
        customerEmail: customerEmail || email || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await schemas.Order.findOneAndUpdate({ id: itemData.id }, { $set: itemData }, { upsert: true, new: true });
      return res.status(200).json({ success: true, id: itemData.id });
    }

    // ── POST /api/send-reply ────────────────────────────────────
    if (pathname === '/api/send-reply') {
      const { customerEmail, customerName, replyType, waitMinutes, orderTotal } = req.body;
      if (!customerEmail) return res.status(400).json({ error: 'customerEmail required' });

      const apiKey = process.env.RESEND_API_KEY;
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;

      const escapeHtml = (str) => { if (!str) return ''; return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

      const templates = {
        reservation_confirmed: {
          subject: "✅ Ihre Reservierung bei Sakura Sushi - Bestätigung",
          html: '<div style="font-family:sans-serif;max-width:600px;margin:auto;border:2px solid #22c55e;padding:30px;border-radius:16px;"><div style="text-align:center;margin-bottom:30px;"><h1 style="color:#22c55e;font-size:28px;margin:0;">✅ Reservierung Bestätigt!</h1></div><div style="background:#f0fdf4;border-radius:12px;padding:20px;margin-bottom:20px;"><p style="margin:0 0 10px 0;">Sehr geehrte/r <strong>' + escapeHtml(customerName) + '</strong>,</p><p style="margin:0;color:#333;">Ihre Reservierung wurde erfolgreich bestätigt.</p></div><p style="color:#22c55e;font-weight:bold;font-size:18px;text-align:center;">Wir freuen uns auf Ihren Besuch!</p></div>'
        },
        reservation_declined: {
          subject: "Ihre Reservierungsanfrage bei Sakura Sushi",
          html: '<div style="font-family:sans-serif;max-width:600px;margin:auto;border:2px solid #ef4444;padding:30px;border-radius:16px;"><div style="text-align:center;margin-bottom:30px;"><h1 style="color:#ef4444;font-size:28px;margin:0;">Reservierungsanfrage</h1></div><div style="background:#fef2f2;border-radius:12px;padding:20px;margin-bottom:20px;"><p style="margin:0 0 10px 0;">Sehr geehrte/r <strong>' + escapeHtml(customerName) + '</strong>,</p><p style="margin:0;color:#333;">Leider müssen wir Ihnen mitteilen, dass wir für den gewünschten Zeitpunkt bereits ausgebucht sind.</p></div></div>'
        },
        order_ready: {
          subject: '✅ Ihre Bestellung bei Sakura Sushi - Bereit in ' + (waitMinutes || 15) + ' Minuten!',
          html: '<div style="font-family:sans-serif;max-width:600px;margin:auto;border:2px solid #f59e0b;padding:30px;border-radius:16px;"><div style="text-align:center;margin-bottom:30px;"><h1 style="color:#f59e0b;font-size:28px;margin:0;">🍣 Ihre Bestellung ist auf dem Weg!</h1></div><div style="background:#fffbeb;border-radius:12px;padding:20px;margin-bottom:20px;"><p style="margin:0 0 10px 0;">Hallo <strong>' + escapeHtml(customerName) + '</strong>,</p><p style="margin:15px 0 0 0;color:#333;">Ihre Bestellung wird in ca. <strong style="font-size:24px;color:#f59e0b;">' + (waitMinutes || 15) + ' Minuten</strong> fertig zubereitet sein.</p>' + (orderTotal ? '<p style="margin:15px 0 0 0;"><strong>Gesamtbetrag:</strong> <span style="font-size:20px;font-weight:bold;color:#e63946;">' + escapeHtml(orderTotal) + '€</span></p>' : '') + '</div></div>'
        },
        order_declined: {
          subject: "Ihre Bestellung bei Sakura Sushi",
          html: '<div style="font-family:sans-serif;max-width:600px;margin:auto;border:2px solid #ef4444;padding:30px;border-radius:16px;"><div style="text-align:center;margin-bottom:30px;"><h1 style="color:#ef4444;font-size:28px;margin:0;">Zu Ihrer Bestellung</h1></div><div style="background:#fef2f2;border-radius:12px;padding:20px;margin-bottom:20px;"><p style="margin:0 0 10px 0;">Hallo <strong>' + escapeHtml(customerName) + '</strong>,</p><p style="margin:0;color:#333;">Leider müssen wir Ihre Bestellung im Moment ablehnen. Bitte versuchen Sie es später erneut.</p></div></div>'
        }
      };

      const template = templates[replyType];
      if (!template) return res.status(400).json({ error: 'Unknown reply type' });

      let emailSuccess = false;
      let telegramSuccess = false;

      if (apiKey && customerEmail) {
        try {
          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: "Sakura Sushi <onboarding@resend.dev>", to: [customerEmail], subject: template.subject, html: template.html })
          });
          emailSuccess = emailRes.ok;
        } catch (e) { console.error('Email error:', e); }
      }

      if (botToken && chatId) {
        const replyLabels = { reservation_confirmed: "✅ RESERVIERUNG BESTÄTIGT", reservation_declined: "❌ RESERVIERUNG ABGESAGT", order_ready: "✅ BESTELLUNG BESTÄTIGT", order_declined: "❌ BESTELLUNG ABGESAGT" };
        const label = replyLabels[replyType] || "ANTWORT GESENDET";
        let telegramText = '📩 ' + label + '\n━━━━━━━━━━━━━━━\n👤 Kunde: ' + escapeHtml(customerName) + '\n📧 Email: ' + escapeHtml(customerEmail) + '\n';
        if (replyType === 'order_ready') telegramText += '⏰ Bereit in: ' + (waitMinutes || 15) + ' Minuten\n';
        telegramText += '━━━━━━━━━━━━━━━\n✅ Email ' + (emailSuccess ? 'gesendet' : 'FEHLGESCHLAGEN') + ' an Kunden';
        try {
          await fetch('https://api.telegram.org/bot' + botToken + '/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: telegramText })
          });
          telegramSuccess = true;
        } catch (e) { console.error('Telegram error:', e); }
      }

      return res.status(200).json({ success: emailSuccess || telegramSuccess, emailSent: emailSuccess, telegramSent: telegramSuccess });
    }

    // ── POST /api/admin/login ────────────────────────────────────
    if (pathname === '/api/admin/login') {
      await getConnection();
      const { username, password } = req.body;
      const user = await schemas.User.findOne({ username, active: true });
      if (!user) return res.status(401).json({ success: false, message: 'Benutzer nicht gefunden' });
      const hash = crypto.createHash('sha256').update(password).digest('hex');
      if (user.passwordHash !== hash) return res.status(401).json({ success: false, message: 'Falsches Passwort' });
      user.lastLogin = new Date();
      await user.save();
      const token = Buffer.from(user.id + ':' + Date.now()).toString('base64');
      await schemas.ActivityLog.create({ id: 'log_' + Date.now(), user: user.username, action: 'LOGIN', details: { role: user.role }, ip: 'vercel', timestamp: new Date() });
      return res.status(200).json({ success: true, token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
    }

    // ── POST /api/admin/verify ──────────────────────────────────
    if (pathname === '/api/admin/verify') {
      await getConnection();
      const { token } = req.body;
      if (!token) return res.status(400).json({ valid: false });
      try {
        const parts = Buffer.from(token, 'base64').toString('utf8').split(':');
        const user = await schemas.User.findOne({ id: parts[0] });
        if (!user || !user.active) return res.status(401).json({ valid: false });
        return res.status(200).json({ valid: true, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
      } catch { return res.status(401).json({ valid: false }); }
    }

    // ── POST /api/admin/change-password ─────────────────────────
    if (pathname === '/api/admin/change-password') {
      await getConnection();
      const { token, oldPassword, newPassword } = req.body;
      try {
        const parts = Buffer.from(token, 'base64').toString('utf8').split(':');
        const user = await schemas.User.findOne({ id: parts[0] });
        if (!user) return res.status(403).json({ success: false });
        const oldHash = crypto.createHash('sha256').update(oldPassword).digest('hex');
        if (user.passwordHash !== oldHash) return res.status(403).json({ success: false });
        user.passwordHash = crypto.createHash('sha256').update(newPassword).digest('hex');
        await user.save();
        await schemas.ActivityLog.create({ id: 'log_' + Date.now(), user: user.username, action: 'CHANGE_PASSWORD', details: {}, ip: 'vercel', timestamp: new Date() });
        return res.status(200).json({ success: true });
      } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
    }

    // ── POST /api/admin/settings/seo ─────────────────────────────
    if (pathname === '/api/admin/settings/seo') {
      await getConnection();
      const { seoTitle, seoDescription, seoKeywords, seoTitleEn, seoDescriptionEn, seoKeywordsEn, seoAuthor, siteDomain } = req.body;
      await schemas.Settings.findOneAndUpdate({}, { $set: { seoTitle, seoDescription, seoKeywords, seoTitleEn, seoDescriptionEn, seoKeywordsEn, seoAuthor, siteDomain, updatedAt: new Date() } }, { upsert: true });
      return res.status(200).json({ success: true });
    }

    // ── POST /api/admin/settings/geo ─────────────────────────────
    if (pathname === '/api/admin/settings/geo') {
      await getConnection();
      const { geoRegion, geoPosition, geoPlacename } = req.body;
      await schemas.Settings.findOneAndUpdate({}, { $set: { geoRegion, geoPosition, geoPlacename, updatedAt: new Date() } }, { upsert: true });
      return res.status(200).json({ success: true });
    }

    // ── POST /api/admin/settings/hours ───────────────────────────
    if (pathname === '/api/admin/settings/hours') {
      await getConnection();
      const keys = ['hoursMon1', 'hoursMon2', 'hoursTue1', 'hoursTue2', 'hoursWed1', 'hoursWed2', 'hoursThu1', 'hoursThu2', 'hoursFri1', 'hoursFri2', 'hoursSat1', 'hoursSat2', 'hoursSun1', 'hoursSun2', 'hoursSummary'];
      const updateData = {};
      keys.forEach(k => { if (req.body[k] !== undefined) updateData[k] = req.body[k]; });
      updateData.updatedAt = new Date();
      await schemas.Settings.findOneAndUpdate({}, { $set: updateData }, { upsert: true });
      return res.status(200).json({ success: true });
    }

    // ── GET /api/admin/activity-log ──────────────────────────────
    if (pathname === '/api/admin/activity-log') {
      await getConnection();
      const logs = await schemas.ActivityLog.find({}).sort({ timestamp: -1 }).limit(200);
      return res.status(200).json(logs);
    }

    // ── GET /sitemap.xml ──────────────────────────────────────
    if (pathname === '/sitemap.xml') {
      const baseUrl = process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'https://kimisushi.de';
      const today = new Date().toISOString().split('T')[0];
      const sitemap = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>' + baseUrl + '/</loc><lastmod>' + today + '</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url><url><loc>' + baseUrl + '/#menu</loc><lastmod>' + today + '</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url><url><loc>' + baseUrl + '/#about</loc><lastmod>' + today + '</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url><url><loc>' + baseUrl + '/#contact</loc><lastmod>' + today + '</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url></urlset>';
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(200).send(sitemap);
    }

    // ── GET /robots.txt ────────────────────────────────────────
    if (pathname === '/robots.txt') {
      const baseUrl = process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'https://kimisushi.de';
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send('User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\nSitemap: ' + baseUrl + '/sitemap.xml\n');
    }

    // ── 404 ─────────────────────────────────────────────────────
    return res.status(404).json({ error: 'Not found', path: pathname });

  } catch (e) {
    console.error('[API Router] Error:', e);
    return res.status(500).json({ error: e.message });
  }
};
