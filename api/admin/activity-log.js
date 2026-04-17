const { getConnection } = require('../db');
const { ActivityLog } = require('../models');

module.exports = async (req, res) => {
  try {
    await getConnection();
    const logs = await ActivityLog.find({}).sort({ timestamp: -1 }).limit(200);
    return res.status(200).json(logs);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
