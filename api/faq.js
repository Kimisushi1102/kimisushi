const { getConnection } = require('./db');
const { FAQ } = require('./models');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      await getConnection();
      const faqs = await FAQ.find({ isVisible: true }).sort({ order: 1 });
      return res.status(200).json(faqs);
    }
    if (req.method === 'POST') {
      await getConnection();
      const faqs = req.body;
      await FAQ.deleteMany({});
      if (faqs && faqs.length > 0) {
        await FAQ.insertMany(faqs.map(f => {
          const obj = f && typeof f.toObject === 'function' ? f.toObject() : Object.assign({}, f);
          obj.updatedAt = new Date();
          return obj;
        }));
      }
      const saved = await FAQ.find({}).sort({ order: 1 });
      return res.status(200).json({ success: true, count: saved.length, items: saved });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('[API] /api/faq error:', e);
    return res.status(500).json({ error: e.message });
  }
};
