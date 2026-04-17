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

    const data = req.body;
    const botToken = data.botToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = data.chatId || process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return res.status(400).set(headers).json({ success: false, message: 'Missing Telegram config' });
    }

    const isReservation = data.orderType === 'reservation';
    const emoji = isReservation ? '📅' : '🍣';
    const typeLabel = isReservation ? 'NEUE RESERVIERUNG' : 'NEUE BESTELLUNG';

    let itemsText = '';
    const src = data.items || data.cart || [];
    if (!isReservation && src && src.length > 0) {
      itemsText = '━━━━━━━━━━━━━━━━━━\n🍽️ <b>Bestellung:</b>\n';
      src.forEach(item => {
        itemsText += `  • ${item.quantity || 1}x ${item.name || ''}\n`;
      });
      itemsText += '━━━━━━━━━━━━━━━━━━\n';
    }

    const name = data.customerName || data.name || '-';
    const phone = data.customerPhone || data.phone || '-';
    const email = data.customerEmail || data.email || '-';
    const time = data.pickupTime || data.time || '-';
    const fmtTime = data.pickupDate && time !== '-'
      ? `${data.pickupDate.split('-').reverse().join('.')} um ${time} Uhr`
      : `${time} Uhr`;

    let telegramText = `${emoji} ${typeLabel}\n`;
    telegramText += `━━━━━━━━━━━━━━━━━━\n`;
    telegramText += `👤 Kunde: ${name}\n`;
    telegramText += `📱 Tel: ${phone}\n`;
    telegramText += `📧 Email: ${email}\n`;
    if (data.pickupTime || data.time) {
      telegramText += `🕒 Zeit: ${fmtTime}\n`;
    }
    if (data.itemCount) {
      telegramText += `📦 Anzahl: ${data.itemCount}${isReservation ? ' Gäste' : ' Gerichte'}\n`;
    }
    if (!isReservation && data.notes && data.notes.trim()) {
      telegramText += `⚠️ ALLERGIEN: ${data.notes.trim()}\n`;
    }
    if (itemsText) telegramText += itemsText;
    if (data.total) telegramText += `💰 <b>SUMME: ${data.total}€</b>\n`;
    telegramText += `━━━━━━━━━━━━━━━━━━\n`;
    telegramText += `⏰ ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`;

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: telegramText,
        parse_mode: 'HTML'
      })
    });

    const result = await response.json();
    return res.status(200).set(headers).json({ success: result.ok, data: result });
  } catch (e) {
    console.error('[API] /api/notify-admin error:', e);
    return res.status(500).set(headers).json({ success: false, error: e.message });
  }
};
