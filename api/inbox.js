const { getConnection } = require('./db');
const { Order, Settings } = require('./models');

async function getSettingsObj() {
  let settings = await Settings.findOne({});
  if (!settings) {
    settings = await Settings.create({
      brandName: 'Kimi Sushi',
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
}

module.exports = async (req, res) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return res.status(200).set(headers).send('');
  }

  try {
    if (req.method === 'GET') {
      await getConnection();
      const type = req.query.type;
      if (type === 'orders' || !type) {
        const ordersList = await Order.find({ type: 'order' }).sort({ createdAt: -1 });
        return res.status(200).set(headers).json(ordersList);
      }
      if (type === 'reservations') {
        const reservationsList = await Order.find({ type: 'reservation' }).sort({ createdAt: -1 });
        return res.status(200).set(headers).json(reservationsList);
      }
      const ordersList = await Order.find({ type: 'order' }).sort({ createdAt: -1 });
      const reservationsList = await Order.find({ type: 'reservation' }).sort({ createdAt: -1 });
      return res.status(200).set(headers).json([...ordersList, ...reservationsList].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      ));
    }

    if (req.method === 'POST') {
      await getConnection();
      let item = req.body;

      if (!item.id) {
        item.id = (item.type === 'reservation' ? 'res_' : 'order_') + Date.now();
      }
      item.createdAt = new Date();
      item.updatedAt = new Date();

      // ASAP resolution
      if (item.type !== 'reservation' && item.pickupTime === 'asap') {
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const dayNames = ['sun','mon','tue','wed','thu','fri','sat'];
        const todayKey = dayNames[now.getDay()];
        const settings = await getSettingsObj();
        const parseHours = (str) => {
          if (!str || !str.includes('-')) return null;
          const parts = str.split('-').map(s => s.trim());
          return {
            start: parseInt(parts[0].split(':')[0]) * 60 + parseInt(parts[0].split(':')[1]),
            end: parseInt(parts[1].split(':')[0]) * 60 + parseInt(parts[1].split(':')[1])
          };
        };
        const todayKeyCap = todayKey.charAt(0).toUpperCase() + todayKey.slice(1);
        const todaySlots = [
          parseHours(settings['hours' + todayKeyCap + '1']),
          parseHours(settings['hours' + todayKeyCap + '2'])
        ].filter(Boolean);
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
          const nextSlots = [
            parseHours(settings['hours' + nextDayKeyCap + '1']),
            parseHours(settings['hours' + nextDayKeyCap + '2'])
          ].filter(Boolean);
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

      await Order.findOneAndUpdate(
        { id: item.id },
        { $set: item },
        { upsert: true, new: true }
      );

      return res.status(200).set(headers).json({ success: true, id: item.id });
    }

    return res.status(405).set(headers).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('[API] /api/inbox error:', e);
    return res.status(500).set(headers).json({ error: e.message });
  }
};
