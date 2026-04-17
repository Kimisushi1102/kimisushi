const crypto = require('crypto');
const { getConnection } = require('./db');
const { User } = require('./models');

module.exports = async (req, res) => {
  try {
    await getConnection();
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { token } = req.body;
    if (!token) return res.status(400).json({ valid: false });

    const parts = Buffer.from(token, 'base64').toString('utf8').split(':');
    const user = await User.findOne({ id: parts[0] });
    if (!user || !user.active) return res.status(401).json({ valid: false });

    return res.status(200).json({
      valid: true,
      user: { id: user.id, username: user.username, name: user.name, role: user.role }
    });
  } catch (e) {
    return res.status(401).json({ valid: false });
  }
};
