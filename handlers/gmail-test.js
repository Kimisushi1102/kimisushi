module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    await transporter.verify().then(() => {
      return res.status(200).json({ success: true, message: 'Gmail SMTP connected successfully!' });
    }).catch(err => {
      return res.status(500).json({ success: false, error: err.message });
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};
