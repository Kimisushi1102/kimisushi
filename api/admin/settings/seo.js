const { getConnection } = require('../db');
const { Settings } = require('../models');

module.exports = async (req, res) => {
  try {
    await getConnection();
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { seoTitle, seoDescription, seoKeywords, seoTitleEn, seoDescriptionEn, seoKeywordsEn, seoAuthor, siteDomain } = req.body;
    await Settings.findOneAndUpdate({}, {
      $set: {
        seoTitle, seoDescription, seoKeywords,
        seoTitleEn, seoDescriptionEn, seoKeywordsEn,
        seoAuthor, siteDomain,
        updatedAt: new Date()
      }
    }, { upsert: true });

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
