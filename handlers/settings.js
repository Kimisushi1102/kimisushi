const { getConnection } = require('./db');
const { Settings } = require('./models');

async function getSettingsObj() {
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
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      await getConnection();
      const settings = await getSettingsObj();
      return res.status(200).json(settings);
    }
    if (req.method === 'POST') {
      await getConnection();
      const data = req.body;
      delete data._adminUser;
      data.updatedAt = new Date();
      await Settings.findOneAndUpdate({}, { $set: data }, { upsert: true, new: true });
      const settings = await getSettingsObj();
      return res.status(200).json({ success: true, settings });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('[API] /api/settings error:', e);
    return res.status(500).json({ error: e.message });
  }
};
