const { getConnection } = require('./db');
const { Analytics } = require('./models');

module.exports = async (req, res) => {
  try {
    await getConnection();
    let analytics = await Analytics.findOne({});
    if (!analytics) {
      analytics = await Analytics.create({
        visits: [], pageviews: [], clicks: [],
        orders: [], reservations: [], products: [],
        hourlyDistribution: [], dailyOrders: [], dailyRevenue: [],
        topProducts: [], statusDistribution: [], lastReset: null
      });
    }
    return res.status(200).json(analytics);
  } catch (e) {
    console.error('[API] /api/analytics error:', e);
    return res.status(500).json({ error: e.message });
  }
};
