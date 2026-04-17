const handlers = {
  '/api/health':         { GET: require('./health') },
  '/api/menu':           { GET: require('./menu'), POST: require('./menu') },
  '/api/combos':         { GET: require('./combos'), POST: require('./combos') },
  '/api/tables':         { GET: require('./tables'), POST: require('./tables') },
  '/api/inbox':          { GET: require('./inbox'), POST: require('./inbox') },
  '/api/faq':            { GET: require('./faq'), POST: require('./faq') },
  '/api/faq/all':        { GET: require('./faq-all') },
  '/api/settings':       { GET: require('./settings'), POST: require('./settings') },
  '/api/reservations':   { GET: require('./reservations'), POST: require('./reservations') },
  '/api/transactions':   { GET: require('./transactions'), POST: require('./transactions') },
  '/api/history':       { GET: require('./transactions'), POST: require('./transactions') },
  '/api/analytics':      { GET: require('./analytics') },
  '/api/analytics/track':{ POST: require('./analytics/track') },
  '/api/analytics/reset':{ POST: require('./analytics/reset') },
  '/api/gmail-notify':   { POST: require('./gmail-notify') },
  '/api/gmail-test':     { POST: require('./gmail-test') },
  '/api/gmail-test-send':{ POST: require('./gmail-test-send') },
  '/api/test-telegram':  { POST: require('./test-telegram') },
  '/api/notify-admin':    { POST: require('./notify-admin') },
  '/api/notify-order':   { POST: require('./notify-order') },
  '/api/send-reply':     { POST: require('./send-reply') },
  '/api/admin/login':    { POST: require('./admin/login') },
  '/api/admin/verify':   { POST: require('./admin/verify') },
  '/api/admin/change-password': { POST: require('./admin/change-password') },
  '/api/admin/settings/seo':    { POST: require('./admin/settings/seo') },
  '/api/admin/settings/geo':     { POST: require('./admin/settings/geo') },
  '/api/admin/settings/hours':  { POST: require('./admin/settings/hours') },
  '/api/admin/activity-log':     { GET: require('./admin/activity-log') },
};

module.exports = (req, res) => {
  const { pathname } = new URL(req.url, 'https://' + (process.env.VERCEL_URL || 'localhost'));
  const method = req.method || 'GET';
  const entry = handlers[pathname];

  if (!entry) {
    return res.status(404).json({ error: 'Not found', path: pathname });
  }

  const handler = entry[method];
  if (!handler) {
    return res.status(405).json({ error: 'Method not allowed', path: pathname, method });
  }

  try {
    handler(req, res);
  } catch (e) {
    console.error('[API Router] Error:', e);
    return res.status(500).json({ error: e.message });
  }
};
