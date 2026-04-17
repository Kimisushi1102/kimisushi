const crypto = require('crypto');
const { getConnection } = require('./db');
const { User, ActivityLog } = require('./models');

module.exports = async (req, res) => {
  try {
    await getConnection();
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { username, password } = req.body;
    const user = await User.findOne({ username, active: true });
    if (!user) return res.status(401).json({ success: false, message: 'Benutzer nicht gefunden' });

    const hash = crypto.createHash('sha256').update(password).digest('hex');
    if (user.passwordHash !== hash) return res.status(401).json({ success: false, message: 'Falsches Passwort' });

    user.lastLogin = new Date();
    await user.save();
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    await ActivityLog.create({
      id: 'log_' + Date.now(),
      user: user.username,
      action: 'LOGIN',
      details: { role: user.role },
      ip: 'vercel',
      timestamp: new Date()
    });

    return res.status(200).json({
      success: true,
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role }
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
