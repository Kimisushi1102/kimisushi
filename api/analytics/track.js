const { getConnection } = require('./db');
const { Analytics } = require('./models');

module.exports = async (req, res) => {
  try {
    await getConnection();
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

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
          if (prod) {
            prod.count++;
            prod.revenue += (parseFloat(it.unitPrice) || 0) * it.quantity;
          } else {
            analytics.topProducts.push({ name: it.name, count: 1, revenue: (parseFloat(it.unitPrice) || 0) * it.quantity });
          }
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
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('[API] /api/analytics/track error:', e);
    return res.status(500).json({ error: e.message });
  }
};
