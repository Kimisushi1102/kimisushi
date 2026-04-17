const { getConnection } = require('../db');
const { Settings } = require('../models');

module.exports = async (req, res) => {
  try {
    await getConnection();
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const keys = [
      'hoursMon1','hoursMon2','hoursTue1','hoursTue2','hoursWed1','hoursWed2',
      'hoursThu1','hoursThu2','hoursFri1','hoursFri2','hoursSat1','hoursSat2',
      'hoursSun1','hoursSun2','hoursSummary'
    ];
    const updateData = {};
    keys.forEach(k => {
      if (req.body[k] !== undefined) updateData[k] = req.body[k];
    });
    updateData.updatedAt = new Date();
    await Settings.findOneAndUpdate({}, { $set: updateData }, { upsert: true });

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
