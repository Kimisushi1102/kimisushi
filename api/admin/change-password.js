const crypto = require('crypto');
const { getConnection } = require('./db');
const { User, ActivityLog } = require('./models');

module.exports = async (req, res) => {
  try {
    await getConnection();
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { token, oldPassword, newPassword } = req.body;
    const parts = Buffer.from(token, 'base64').toString('utf8').split(':');
    const user = await User.findOne({ id: parts[0] });

    if (!user) return res.status(403).json({ success: false });
    const oldHash = crypto.createHash('sha256').update(oldPassword).digest('hex');
    if (user.passwordHash !== oldHash) return res.status(403).json({ success: false });

    user.passwordHash = crypto.createHash('sha256').update(newPassword).digest('hex');
    await user.save();

    await ActivityLog.create({
      id: 'log_' + Date.now(),
      user: user.username,
      action: 'CHANGE_PASSWORD',
      details: {},
      ip: 'vercel',
      timestamp: new Date()
    });

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
