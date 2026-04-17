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

    const nodemailer = require('nodemailer');
    const orderData = req.body;

    const gmailUser = orderData.gmailUser || process.env.GMAIL_USER;
    const gmailPassword = orderData.gmailPassword || process.env.GMAIL_APP_PASSWORD;
    const gmailNotifyEmail = orderData.gmailNotifyEmail || process.env.GMAIL_NOTIFY_EMAIL || gmailUser;
    const gmailEnabled = orderData.gmailEnabled || process.env.GMAIL_ENABLED === 'true';

    if (!gmailEnabled || !gmailUser || !gmailPassword) {
      return res.status(200).set(headers).json({ success: false, reason: 'Gmail not configured' });
    }

    const isReservation = orderData.orderType === 'reservation' || orderData.type === 'reservation';
    const items = orderData.items || [];
    const customerName = orderData.customerName || orderData.name || 'Khách hàng';
    const customerPhone = orderData.customerPhone || orderData.phone || '-';
    const customerEmail = orderData.customerEmail || orderData.email || '-';
    const pickupTime = orderData.pickupTime || orderData.time || '-';
    const pickupTimeDisplay = pickupTime === 'asap'
      ? 'So schnell wie möglich'
      : (pickupTime !== '-' ? `${pickupTime} Uhr` : '-');
    const total = orderData.total || '-';
    const deliveryFee = orderData.deliveryFee || '0';
    const address = orderData.address || '-';
    const method = orderData.method || '-';
    const notes = orderData.notes || orderData.remark || '-';
    const itemId = orderData.id || orderData.orderId || '-';
    const itemCount = orderData.itemCount || (orderData.guests ? `${orderData.guests} ${isReservation ? 'Gäste' : 'Personen'}` : '-');

    const normalizePrice = (p) => {
      if (typeof p === 'number') return p;
      if (!p) return 0;
      const cleaned = String(p).replace('€', '').replace(/\s/g, '').replace(',', '.');
      return parseFloat(cleaned) || 0;
    };

    const fmt = (n) => n.toFixed(2).replace('.', ',') + ' €';

    const subject = isReservation
      ? `📅 Neue Tischreservierung - ${customerName}`
      : `Neue Bestellung - ${customerName}`;

    let itemsHtml = '';
    if (!isReservation && items.length > 0) {
      itemsHtml = '<table style="width:100%;border-collapse:collapse;margin:15px 0;">';
      itemsHtml += '<tr style="background:#f8f9fa;"><th style="padding:8px;text-align:left;">Gericht</th><th style="padding:8px;text-align:center;">Menge</th><th style="padding:8px;text-align:right;">Preis</th><th style="padding:8px;text-align:right;">Summe</th></tr>';
      items.forEach(item => {
        const unitPrice = normalizePrice(item.price);
        const qty = parseInt(item.quantity) || 1;
        const subtotal = unitPrice * qty;
        const fmtUnit = fmt(unitPrice);
        const fmtSub = fmt(subtotal);
        itemsHtml += `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${item.name || '-'}</td><td style="padding:8px;text-align:center;border-bottom:1px solid #eee;">${qty}</td><td style="padding:8px;text-align:right;border-bottom:1px solid #eee;">${fmtUnit}</td><td style="padding:8px;text-align:right;border-bottom:1px solid #eee;font-weight:bold;">${fmtSub}</td></tr>`;
      });
      itemsHtml += '</table>';
    }

    const htmlContent = `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;border:3px solid ${isReservation ? '#22c55e' : '#8B0000'};padding:24px;border-radius:14px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="color:${isReservation ? '#22c55e' : '#8B0000'};font-size:26px;margin:0;">${isReservation ? '📅 Neue Tischreservierung' : '🍣 Neue Bestellung'}</h1>
          <p style="color:#888;margin:8px 0 0 0;font-size:13px;">${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}</p>
        </div>
        <div style="background:#f0f9ff;border-radius:10px;padding:16px;margin-bottom:16px;border:1px solid #dbeafe;">
          <h3 style="margin:0 0 10px 0;color:#1e40af;font-size:14px;text-transform:uppercase;">Bestell-/Reservierungsdaten</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#666;font-size:13px;width:130px;"><strong>Nr.:</strong></td><td style="padding:6px 0;font-size:14px;font-weight:bold;">${itemId}</td></tr>
            ${isReservation ? `<tr><td style="padding:6px 0;color:#666;font-size:13px;"><strong>Personen:</strong></td><td style="padding:6px 0;font-size:16px;font-weight:bold;color:#22c55e;">${itemCount}</td></tr>` : ''}
            <tr><td style="padding:6px 0;color:#666;font-size:13px;"><strong>Uhrzeit:</strong></td><td style="padding:6px 0;font-size:14px;font-weight:bold;">${pickupTimeDisplay}</td></tr>
            ${!isReservation ? `<tr><td style="padding:6px 0;color:#666;font-size:13px;"><strong>Art:</strong></td><td style="padding:6px 0;font-size:14px;">${method === 'delivery' ? '🚴 Lieferung' : '🏪 Abholung / Vor Ort'}</td></tr>` : ''}
            ${notes && notes.trim() ? `<tr><td style="padding:6px 0;color:#666;font-size:13px;vertical-align:top;"><strong>⚠️ Allergien:</strong></td><td style="padding:6px 0;font-size:14px;color:#b91c1c;font-weight:bold;">${notes}</td></tr>` : ''}
          </table>
        </div>
        <div style="background:#fff;border-radius:10px;padding:16px;margin-bottom:16px;border:1px solid #e5e7eb;">
          <h3 style="margin:0 0 10px 0;color:#111;font-size:14px;text-transform:uppercase;">Kundendaten</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#666;font-size:13px;width:130px;"><strong>Name:</strong></td><td style="padding:6px 0;font-size:14px;font-weight:bold;">${customerName}</td></tr>
            <tr><td style="padding:6px 0;color:#666;font-size:13px;"><strong>Telefon:</strong></td><td style="padding:6px 0;font-size:14px;">${customerPhone}</td></tr>
            <tr><td style="padding:6px 0;color:#666;font-size:13px;"><strong>E-Mail:</strong></td><td style="padding:6px 0;font-size:14px;">${customerEmail}</td></tr>
            ${!isReservation && address && address !== 'Abholung / Vor Ort' ? `<tr><td style="padding:6px 0;color:#666;font-size:13px;"><strong>Adresse:</strong></td><td style="padding:6px 0;font-size:14px;">${address}</td></tr>` : ''}
          </table>
        </div>
        ${itemsHtml}
        <div style="background:#fef3c7;border-radius:10px;padding:14px;margin-bottom:16px;border:1px solid #fde68a;">
          <p style="margin:0;color:#92400e;font-size:13px;text-align:center;">${isReservation ? 'Bitte diese Reservierung umgehend bestätigen!' : 'Bitte diese Bestellung umgehend bearbeiten!'}</p>
        </div>
      </div>
    `;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPassword }
    });

    const info = await transporter.sendMail({
      from: `"Sakura Sushi" <${gmailUser}>`,
      to: gmailNotifyEmail,
      subject: subject,
      html: htmlContent
    });

    return res.status(200).set(headers).json({ success: true, messageId: info.messageId });
  } catch (e) {
    console.error('[API] /api/gmail-notify error:', e);
    return res.status(500).set(headers).json({ success: false, error: e.message });
  }
};
