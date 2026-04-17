const { getConnection } = require('./db');
const { MenuItem } = require('./models');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      await getConnection();
      const items = await MenuItem.find({ isVisible: true }).sort({ category: 1, name: 1 });
      return res.status(200).json(items);
    }
    if (req.method === 'POST') {
      await getConnection();
      const items = req.body;
      await MenuItem.deleteMany({});
      if (items && items.length > 0) {
        await MenuItem.insertMany(items.map(item => Object.assign({}, item, { updatedAt: new Date() })));
      }
      const saved = await MenuItem.find({ isVisible: true });
      return res.status(200).json({ success: true, count: saved.length, items: saved });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('[API] /api/menu error:', e);
    return res.status(500).json({ error: e.message });
  }
};
