const { getConnection } = require('./db');
const { FAQ } = require('./models');

module.exports = async (req, res) => {
  try {
    await getConnection();
    const faqs = await FAQ.find({}).sort({ order: 1 });
    return res.status(200).json(faqs);
  } catch (e) {
    console.error('[API] /api/faq/all error:', e);
    return res.status(500).json({ error: e.message });
  }
};
