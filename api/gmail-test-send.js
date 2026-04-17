module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const nodemailer = require('nodemailer');
    const { gmailUser, gmailPassword } = req.body || {};

    const user = gmailUser || process.env.GMAIL_USER;
    const pass = gmailPassword || process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      return res.status(400).json({ success: false, error: 'Gmail credentials required' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });

    const result = await transporter.sendMail({
      from: `"Sakura Sushi" <${user}>`,
      to: user,
      subject: '✅ Sakura Sushi - Test Email',
      html: '<h1>Test erfolgreich!</h1><p>Dies ist eine Test-E-Mail von Sakura Sushi System.</p>'
    });

    return res.status(200).json({ success: true, messageId: result.messageId });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};
