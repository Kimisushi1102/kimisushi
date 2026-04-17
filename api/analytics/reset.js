const { getConnection } = require('../db');
const { Analytics } = require('../models');

module.exports = async (req, res) => {
  try {
    await getConnection();
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    await Analytics.findOneAndUpdate({}, {
      visits: [], pageviews: [], clicks: [],
      orders: [], reservations: [], products: [],
      hourlyDistribution: [], dailyOrders: [], dailyRevenue: [],
      topProducts: [], statusDistribution: [], lastReset: new Date()
    });

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
