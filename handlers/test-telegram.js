module.exports = async (req, res) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return res.status(200).set(headers).send('');
  }

  try {
    if (req.method !== 'POST') {
      return res.status(405).set(headers).json({ error: 'Method not allowed' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return res.status(400).set(headers).json({ success: false, message: 'Telegram not configured' });
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '✅ Sakura Sushi BOT - Kết nối thành công! Bạn sẽ nhận được thông báo khi có khách đặt hàng.'
      })
    });

    const result = await response.json();
    return res.status(200).set(headers).json({ success: result.ok });
  } catch (e) {
    console.error('[API] /api/test-telegram error:', e);
    return res.status(500).set(headers).json({ success: false, error: e.message });
  }
};
