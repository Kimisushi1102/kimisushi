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
      const reservations = await Order.find({ type: 'reservation' }).sort({ createdAt: -1 });
      return res.status(200).set(headers).json(reservations);
    }
    if (req.method === 'POST') {
      await getConnection();
      let item = req.body;
      if (!item.id) item.id = 'res_' + Date.now();
      item.type = 'reservation';
      item.createdAt = new Date();
      item.updatedAt = new Date();
      await Order.findOneAndUpdate({ id: item.id }, { $set: item }, { upsert: true, new: true });
      return res.status(200).set(headers).json({ success: true, id: item.id });
    }
    return res.status(405).set(headers).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('[API] /api/reservations error:', e);
    return res.status(500).set(headers).json({ error: e.message });
  }
};
