const { getConnection } = require('./db');
const { Combo } = require('./models');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      await getConnection();
      const combos = await Combo.find({ isVisible: true }).sort({ name: 1 });
      return res.status(200).json(combos);
    }
    if (req.method === 'POST') {
      await getConnection();
      const combos = req.body;
      await Combo.deleteMany({});
      if (combos && combos.length > 0) {
        await Combo.insertMany(combos.map(c => {
          const obj = c && typeof c.toObject === 'function' ? c.toObject() : Object.assign({}, c);
          obj.updatedAt = new Date();
          return obj;
        }));
      }
      const saved = await Combo.find({ isVisible: true });
      return res.status(200).json({ success: true, count: saved.length, items: saved });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('[API] /api/combos error:', e);
    return res.status(500).json({ error: e.message });
  }
};
