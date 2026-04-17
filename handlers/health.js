module.exports = (req, res) => {
  res.json({
    status: 'ok',
    mongodb: process.env.MONGODB_URL ? 'configured' : 'not_configured',
    gmail: {
      enabled: process.env.GMAIL_ENABLED === 'true',
      user: process.env.GMAIL_USER ? '***' + process.env.GMAIL_USER.slice(-10) : null,
    },
    timestamp: new Date().toISOString()
  });
};
