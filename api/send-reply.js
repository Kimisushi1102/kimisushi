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

    const { customerEmail, customerName, replyType, waitMinutes, orderTotal, customerPhone } = req.body;

    if (!customerEmail) {
      return res.status(400).set(headers).json({ error: 'customerEmail required' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    const escapeHtml = (str) => {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

    const templates = {
      reservation_confirmed: {
        subject: "✅ Ihre Reservierung bei Sakura Sushi - Bestätigung",
        html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;border:2px solid #22c55e;padding:30px;border-radius:16px;"><div style="text-align:center;margin-bottom:30px;"><h1 style="color:#22c55e;font-size:28px;margin:0;">✅ Reservierung Bestätigt!</h1></div><div style="background:#f0fdf4;border-radius:12px;padding:20px;margin-bottom:20px;"><p style="margin:0 0 10px 0;">Sehr geehrte/r <strong>${escapeHtml(customerName)}</strong>,</p><p style="margin:0;color:#333;">Ihre Reservierung wurde erfolgreich bestätigt.</p></div><p style="color:#22c55e;font-weight:bold;font-size:18px;text-align:center;">Wir freuen uns auf Ihren Besuch!</p></div>`
      },
      reservation_declined: {
        subject: "Ihre Reservierungsanfrage bei Sakura Sushi",
        html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;border:2px solid #ef4444;padding:30px;border-radius:16px;"><div style="text-align:center;margin-bottom:30px;"><h1 style="color:#ef4444;font-size:28px;margin:0;">Reservierungsanfrage</h1></div><div style="background:#fef2f2;border-radius:12px;padding:20px;margin-bottom:20px;"><p style="margin:0 0 10px 0;">Sehr geehrte/r <strong>${escapeHtml(customerName)}</strong>,</p><p style="margin:0;color:#333;">Leider müssen wir Ihnen mitteilen, dass wir für den gewünschten Zeitpunkt bereits ausgebucht sind.</p></div></div>`
      },
      order_ready: {
        subject: `✅ Ihre Bestellung bei Sakura Sushi - Bereit in ${waitMinutes || 15} Minuten!`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;border:2px solid #f59e0b;padding:30px;border-radius:16px;"><div style="text-align:center;margin-bottom:30px;"><h1 style="color:#f59e0b;font-size:28px;margin:0;">🍣 Ihre Bestellung ist auf dem Weg!</h1></div><div style="background:#fffbeb;border-radius:12px;padding:20px;margin-bottom:20px;"><p style="margin:0 0 10px 0;">Hallo <strong>${escapeHtml(customerName)}</strong>,</p><p style="margin:15px 0 0 0;color:#333;">Ihre Bestellung wird in ca. <strong style="font-size:24px;color:#f59e0b;">${waitMinutes || 15} Minuten</strong> fertig zubereitet sein.</p>${orderTotal ? `<p style="margin:15px 0 0 0;"><strong>Gesamtbetrag:</strong> <span style="font-size:20px;font-weight:bold;color:#e63946;">${escapeHtml(orderTotal)}€</span></p>` : ''}</div></div>`
      },
      order_declined: {
        subject: "Ihre Bestellung bei Sakura Sushi",
        html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;border:2px solid #ef4444;padding:30px;border-radius:16px;"><div style="text-align:center;margin-bottom:30px;"><h1 style="color:#ef4444;font-size:28px;margin:0;">Zu Ihrer Bestellung</h1></div><div style="background:#fef2f2;border-radius:12px;padding:20px;margin-bottom:20px;"><p style="margin:0 0 10px 0;">Hallo <strong>${escapeHtml(customerName)}</strong>,</p><p style="margin:0;color:#333;">Leider müssen wir Ihre Bestellung im Moment ablehnen. Bitte versuchen Sie es später erneut.</p></div></div>`
      }
    };

    const template = templates[replyType];
    if (!template) {
      return res.status(400).set(headers).json({ error: 'Unknown reply type' });
    }

    let emailSuccess = false;
    let telegramSuccess = false;

    if (apiKey && customerEmail) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: "Sakura Sushi <onboarding@resend.dev>",
            to: [customerEmail],
            subject: template.subject,
            html: template.html
          })
        });
        emailSuccess = emailRes.ok;
      } catch (e) {
        console.error('Email error:', e);
      }
    }

    if (botToken && chatId) {
      const replyLabels = {
        reservation_confirmed: "✅ RESERVIERUNG BESTÄTIGT",
        reservation_declined: "❌ RESERVIERUNG ABGESAGT",
        order_ready: "✅ BESTELLUNG BESTÄTIGT",
        order_declined: "❌ BESTELLUNG ABGESAGT"
      };
      const label = replyLabels[replyType] || "ANTWORT GESENDET";
      let telegramText = `📩 ${label}\n━━━━━━━━━━━━━━━\n👤 Kunde: ${escapeHtml(customerName)}\n📧 Email: ${escapeHtml(customerEmail)}\n`;
      if (replyType === 'order_ready') telegramText += `⏰ Bereit in: ${waitMinutes || 15} Minuten\n`;
      telegramText += `━━━━━━━━━━━━━━━\n✅ Email ${emailSuccess ? 'gesendet' : 'FEHLGESCHLAGEN'} an Kunden`;

      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: telegramText })
        });
        telegramSuccess = true;
      } catch (e) {
        console.error('Telegram error:', e);
      }
    }

    return res.status(200).set(headers).json({
      success: emailSuccess || telegramSuccess,
      emailSent: emailSuccess,
      telegramSent: telegramSuccess
    });
  } catch (e) {
    console.error('[API] /api/send-reply error:', e);
    return res.status(500).set(headers).json({ success: false, error: e.message });
  }
};
