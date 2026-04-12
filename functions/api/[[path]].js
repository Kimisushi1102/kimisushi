export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  
  // CORS Headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    // Helper to get from KV with default
    const getKV = async (key, defaultValue = "[]") => {
      // Map frontend key (kimi_*) to KV key (*)
      const kvKey = key.replace('kimi_', '');
      const val = await env.SAKURA_KV.get(kvKey);
      return val || defaultValue;
    };
    const putKV = async (key, value) => {
      const kvKey = key.replace('kimi_', '');
      await env.SAKURA_KV.put(kvKey, value);
    };
    // Also try exact key for backward compat
    const getKVDirect = async (key) => {
      const val = await env.SAKURA_KV.get(key);
      if (val) return val;
      const altKey = key.replace('kimi_', '');
      return await env.SAKURA_KV.get(altKey);
    };

    // HTML escape helper for email content
    const escapeHtml = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    // 1. Quản lý BÀN (TABLES)
    if (path === "/api/tables") {
      if (request.method === "GET") {
        return new Response(await getKVDirect("kimi_tables"), { headers });
      }
      if (request.method === "POST") {
        await putKV("kimi_tables", await request.text());
        return new Response(JSON.stringify({ success: true }), { headers });
      }
    }

    // 2. Quản lý THỰC ĐƠN (MENU)
    if (path === "/api/menu") {
      if (request.method === "GET") {
        return new Response(await getKVDirect("kimi_menu"), { headers });
      }
      if (request.method === "POST") {
        await putKV("kimi_menu", await request.text());
        return new Response(JSON.stringify({ success: true }), { headers });
      }
    }

    // 3. Quản lý COMBOS
    if (path === "/api/combos") {
      if (request.method === "GET") {
        return new Response(await getKVDirect("kimi_combos"), { headers });
      }
      if (request.method === "POST") {
        await putKV("kimi_combos", await request.text());
        return new Response(JSON.stringify({ success: true }), { headers });
      }
    }

    // 4. Quản lý CÀI ĐẶT (SETTINGS)
    if (path === "/api/settings") {
      if (request.method === "GET") {
        return new Response(await getKVDirect("kimi_settings"), { headers });
      }
      if (request.method === "POST") {
        await putKV("kimi_settings", await request.text());
        return new Response(JSON.stringify({ success: true }), { headers });
      }
    }

    // 5. Quản lý ĐẶT BÀN ONLINE (RESERVATIONS)
    if (path === "/api/reservations") {
      if (request.method === "GET") {
        return new Response(await getKVDirect("kimi_reservations"), { headers });
      }
      if (request.method === "POST") {
        await putKV("kimi_reservations", await request.text());
        return new Response(JSON.stringify({ success: true }), { headers });
      }
    }

    // 6. Quản lý GIAO DỊCH (TRANSACTIONS) - dùng cùng KV key với history
    if (path === "/api/transactions") {
      if (request.method === "GET") {
        return new Response(await getKVDirect("kimi_history"), { headers });
      }
      if (request.method === "POST") {
        await putKV("kimi_history", await request.text());
        return new Response(JSON.stringify({ success: true }), { headers });
      }
    }

    // 7. Quản lý LỊCH SỬ (HISTORY)
    if (path === "/api/history") {
      if (request.method === "GET") {
        return new Response(await getKVDirect("kimi_history"), { headers });
      }
      if (request.method === "POST") {
        const body = await request.json();
        const currentData = await getKVDirect("kimi_history");
        const history = JSON.parse(currentData || "[]");
        history.push(body);
        await putKV("kimi_history", JSON.stringify(history));
        return new Response(JSON.stringify({ success: true }), { headers });
      }
    }

    // 7b. INBOX - Lưu trữ đơn hàng/đặt bàn từ khách
    if (path === "/api/inbox") {
      if (request.method === "GET") {
        return new Response(await getKVDirect("kimi_inbox"), { headers });
      }
      if (request.method === "POST") {
        const body = await request.json();
        const currentData = await getKVDirect("kimi_inbox");
        const inbox = JSON.parse(currentData || "[]");

        // Add new item (avoid duplicates by id)
        const exists = inbox.find(i => i.id === body.id);
        if (!exists) {
          inbox.unshift(body);
          // Keep max 200 items
          if (inbox.length > 200) inbox.splice(200);
          await putKV("kimi_inbox", JSON.stringify(inbox));
        }
        return new Response(JSON.stringify({ success: true }), { headers });
      }
    }

    // 8. Thông báo Email qua Resend API (Gửi cho khách - Tự động khi đặt hàng)
    if (path === "/api/notify-order" && request.method === "POST") {
      const data = await request.json();
      const {
        customerEmail,
        customerName,
        customerPhone,
        orderType, // 'reservation' | 'order'
        pickupTime,
        items,
        total,
        itemCount,
        resendApiKey // Fallback API key from request body
      } = data;

      // Ưu tiên: env variable > request body API key
      let apiKey = env.RESEND_API_KEY;
      if (!apiKey) apiKey = resendApiKey;

      // Lấy admin email từ settings
      let adminEmail = env.ADMIN_EMAIL;
      if (!adminEmail) {
        try {
          const settingsJson = await getKVDirect("kimi_settings");
          const settings = JSON.parse(settingsJson || "{}");
          adminEmail = settings.email;
        } catch(e) {}
      }

      if (!apiKey) {
        return new Response(JSON.stringify({ error: "No Resend API Key configured. Please set RESEND_API_KEY in Cloudflare Dashboard or provide resendApiKey in request." }), { status: 400, headers });
      }

      const safeName = escapeHtml(customerName);
      const isReservation = orderType === 'reservation';

      // Build items list for order (customer email)
      let itemsList = '';
      let itemsSubtotal = 0;
      if (!isReservation && items && items.length > 0) {
        itemsList = '<table style="width: 100%; border-collapse: collapse; margin: 15px 0;">';
        itemsList += '<tr style="background: #f8f9fa;"><th style="padding: 8px; text-align: left;">Gericht</th><th style="padding: 8px; text-align: center;">Menge</th><th style="padding: 8px; text-align: right;">Preis</th><th style="padding: 8px; text-align: right;">Summe</th></tr>';
        items.forEach(item => {
          const unitPrice = parseFloat(String(item.price || 0).replace('€', '').replace(',', '.').replace(/\s/g, '')) || 0;
          const qty = parseInt(item.quantity) || 1;
          const subtotal = unitPrice * qty;
          itemsSubtotal += subtotal;
          const fmtUnit = unitPrice.toFixed(2).replace('.', ',') + ' €';
          const fmtSub = subtotal.toFixed(2).replace('.', ',') + ' €';
          itemsList += `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(item.name || '')}</td><td style="padding: 8px; text-align: center; border-bottom: 1px solid #eee;">${qty}</td><td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">${fmtUnit}</td><td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee; font-weight: bold;">${fmtSub}</td></tr>`;
        });
        itemsList += '</table>';
      }

      const safeTotal = typeof total === 'number' ? total.toFixed(2).replace('.', ',') : (typeof total === 'string' ? total.replace(/€\s*$/, '').trim() : '0,00');
      const safeItemsSubtotal = itemsSubtotal.toFixed(2).replace('.', ',');

      const emailContent = {
        from: "Sakura Sushi <onboarding@resend.dev>",
        to: [customerEmail],
        subject: isReservation
          ? `✅ Ihre Reservierung bei Sakura Sushi - Eingang erhalten`
          : `✅ Ihre Bestellung bei Sakura Sushi - Eingang erhalten`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 2px solid #22c55e; padding: 30px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #22c55e; font-size: 28px; margin: 0;">✅ Vielen Dank!</h1>
              <p style="color: #666; margin: 5px 0 0 0;">${isReservation ? 'Ihre Reservierungsanfrage wurde empfangen' : 'Ihre Bestellung wurde empfangen'}</p>
            </div>
            <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <p style="margin: 0 0 10px 0;">Sehr geehrte/r <strong style="font-size: 18px;">${safeName}</strong>,</p>
              <p style="margin: 0; color: #333;">wir haben Ihre ${isReservation ? 'Reservierungsanfrage' : 'Bestellung'} erhalten und melden uns in Kürze bei Ihnen.</p>
            </div>
            ${pickupTime ? `<div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <p style="margin: 0; color: #666; font-size: 14px;">${isReservation ? 'Gewünschte Zeit' : 'Abholzeit'}</p>
              <p style="margin: 5px 0 0 0; font-size: 18px; color: #333;"><strong>${escapeHtml(pickupTime)}</strong></p>
            </div>` : ''}
            ${itemsList ? `<div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <p style="margin: 0 0 10px 0; font-weight: bold;">Ihre Bestellung:</p>
              ${itemsList}
              ${itemsSubtotal > 0 ? `<p style="margin: 10px 0 0 0; text-align: right; font-size: 14px; color: #666;">Zwischensumme: <strong>${safeItemsSubtotal} €</strong></p>` : ''}
              ${safeTotal ? `<p style="margin: 5px 0 0 0; text-align: right;"><strong>Gesamtbetrag: <span style="font-size: 20px; color: #e63946;">${safeTotal} €</span></strong></p>` : ''}
            </div>` : ''}
            <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <p style="margin: 0; color: #333;">⏰ Bitte haben Sie etwas Geduld. Wir werden Ihre Bestellung so schnell wie möglich zubereiten.</p>
              <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Sie erhalten eine weitere Bestätigung, sobald wir Ihre ${isReservation ? 'Reservierung' : 'Bestellung'} bearbeitet haben.</p>
            </div>
            <p style="color: #22c55e; font-weight: bold; font-size: 16px; text-align: center; margin: 0;">Wir freuen uns auf Ihren Besuch! 🍣</p>
            <p style="color: #666; text-align: center; margin: 10px 0 0 0;">Ihr Sakura Sushi Team</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
            <p style="font-size: 11px; color: #999; text-align: center;">Sakura Sushi - Authentische japanische Küche</p>
          </div>
        `
      };

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(emailContent)
      });

      const resendData = await resendRes.json();

      // Gửi email thông báo cho ADMIN nếu có cấu hình
      let adminNotifySuccess = false;
      let adminItemsText = '';
      let adminItemsSubtotal = 0;
      if (!isReservation && items && items.length > 0) {
        adminItemsText = '<table style="width: 100%; border-collapse: collapse; margin: 15px 0; background: #fff;">';
        adminItemsText += '<tr style="background: #fee2e2;"><th style="padding: 8px; text-align: left;">🍽️ Gericht</th><th style="padding: 8px; text-align: center;">Menge</th><th style="padding: 8px; text-align: right;">Preis</th><th style="padding: 8px; text-align: right;">Summe</th></tr>';
        items.forEach(item => {
          const unitPrice = parseFloat(String(item.price || 0).replace('€', '').replace(',', '.').replace(/\s/g, '')) || 0;
          const qty = parseInt(item.quantity) || 1;
          const subtotal = unitPrice * qty;
          adminItemsSubtotal += subtotal;
          const fmtUnit = unitPrice.toFixed(2).replace('.', ',') + ' €';
          const fmtSub = subtotal.toFixed(2).replace('.', ',') + ' €';
          adminItemsText += `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(item.name || '')}</td><td style="padding: 8px; text-align: center; border-bottom: 1px solid #eee;">${qty}</td><td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">${fmtUnit}</td><td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee; font-weight: bold;">${fmtSub}</td></tr>`;
        });
        adminItemsText += '</table>';
      }
      const safeAdminTotal = typeof total === 'number' ? total.toFixed(2).replace('.', ',') : (typeof total === 'string' ? total.replace(/€\s*$/, '').trim() : '0,00');
      const safeAdminSubtotal = adminItemsSubtotal.toFixed(2).replace('.', ',');

      if (adminEmail && apiKey) {
        try {
          const adminEmailContent = {
            from: "Sakura Sushi <onboarding@resend.dev>",
            to: [adminEmail],
            subject: isReservation
              ? `📅 NEUE RESERVIERUNG - ${safeName}`
              : `🍣 NEUE BESTELLUNG - ${safeName} - ${safeAdminTotal} €`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 3px solid #e63946; padding: 30px; border-radius: 16px; background: #fef2f2;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #e63946; font-size: 28px; margin: 0;">${isReservation ? '📅 NEUE RESERVIERUNG' : '🍣 NEUE BESTELLUNG'}</h1>
                  <p style="color: #666; margin: 5px 0 0 0;">${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}</p>
                </div>
                <div style="background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #fecaca;">
                  <h3 style="margin: 0 0 15px 0; color: #e63946;">👤 Kundendaten</h3>
                  <p style="margin: 5px 0;"><strong>Name:</strong> ${safeName}</p>
                  <p style="margin: 5px 0;"><strong>Email:</strong> ${escapeHtml(customerEmail)}</p>
                  <p style="margin: 5px 0;"><strong>Telefon:</strong> ${escapeHtml(customerPhone || '-')}</p>
                </div>
                ${pickupTime ? `<div style="background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #fecaca;">
                  <h3 style="margin: 0 0 10px 0; color: #e63946;">${isReservation ? '📅 Reservierungszeit' : '🕒 Abholzeit'}</h3>
                  <p style="margin: 0; font-size: 20px; color: #333;"><strong>${escapeHtml(pickupTime)}</strong></p>
                </div>` : ''}
                ${adminItemsText ? `<div style="background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #fecaca;">
                  <h3 style="margin: 0 0 10px 0; color: #e63946;">📦 Bestellung</h3>
                  ${adminItemsText}
                  ${adminItemsSubtotal > 0 ? `<p style="margin: 10px 0 0 0; text-align: right; font-size: 14px; color: #666;">Zwischensumme: <strong>${safeAdminSubtotal} €</strong></p>` : ''}
                  ${safeAdminTotal ? `<p style="margin: 5px 0 0 0; text-align: right;"><strong>Gesamtbetrag: <span style="font-size: 24px; color: #e63946;">${safeAdminTotal} €</span></strong></p>` : ''}
                </div>` : ''}
                <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #fcd34d;">
                  <p style="margin: 0; color: #92400e; font-size: 16px;">⚡ Bitte bearbeiten Sie diese Bestellung umgehend!</p>
                </div>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
                <p style="font-size: 11px; color: #999; text-align: center;">Sakura Sushi - Admin Benachrichtigung</p>
              </div>
            `
          };

          const adminRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify(adminEmailContent)
          });
          adminNotifySuccess = adminRes.ok;
        } catch (e) {
          console.error("Admin email error:", e);
        }
      }

      return new Response(JSON.stringify({ 
        success: resendRes.ok, 
        data: resendData,
        adminNotified: adminNotifySuccess
      }), { headers });
    }

    // 9. Telegram Bot notification (reads token/chatId from request body)
    if (path === "/api/notify-admin" && request.method === "POST") {
      const data = await request.json();
      const { botToken, chatId, orderType, customerName, customerPhone, customerEmail, pickupDate, pickupTime, total, itemCount, items } = data;

      if (!botToken || !chatId) {
        return new Response(JSON.stringify({ success: false, message: "Missing Telegram config" }), { status: 400, headers });
      }

      // Determine emoji and type label
      const isReservation = orderType === 'reservation';
      const emoji = isReservation ? '📅' : '🍣';
      const typeLabel = isReservation ? 'NEUE RESERVIERUNG' : 'NEUE BESTELLUNG';

      // Build items list for orders
      let itemsText = '';
      if (!isReservation && items && items.length > 0) {
        itemsText = '━━━━━━━━━━━━━━━━━━\n🍽️ <b>Bestellung:</b>\n';
        items.forEach(item => {
          itemsText += `  • ${item.quantity || 1}x ${escapeHtml(item.name || '')}\n`;
        });
        itemsText += '━━━━━━━━━━━━━━━━━━\n';
      }

      let telegramText = `${emoji} ${typeLabel}\n`;
      telegramText += `━━━━━━━━━━━━━━━━━━\n`;
      telegramText += `👤 Kunde: ${escapeHtml(customerName || '-')}\n`;
      telegramText += `📱 Tel: ${escapeHtml(customerPhone || '-')}\n`;
      telegramText += `📧 Email: ${escapeHtml(customerEmail || '-')}\n`;
      if (pickupTime) {
        const timeLabel = pickupDate
          ? `${pickupDate.split('-').reverse().join('.')} @ ${pickupTime}`
          : pickupTime;
        telegramText += `🕒 Zeit: ${escapeHtml(timeLabel)}\n`;
      }
      if (itemCount) telegramText += `📦 Anzahl: ${escapeHtml(itemCount)}${isReservation ? ' Gäste' : ' Gerichte'}\n`;
      if (itemsText) telegramText += itemsText;
      if (total) telegramText += `💰 <b>SUMME: ${escapeHtml(total)}€</b>\n`;
      telegramText += `━━━━━━━━━━━━━━━━━━\n`;
      telegramText += `⏰ ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`;

      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: telegramText,
            parse_mode: 'HTML'
          })
        });
        const tgData = await tgRes.json();
        return new Response(JSON.stringify({ success: tgData.ok, data: tgData }), { headers });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers });
      }
    }

    // 9b. Test Telegram (legacy - still checks env first, falls back to settings in body)
    if (path === "/api/test-telegram" && request.method === "POST") {
      let botToken = env.TELEGRAM_BOT_TOKEN;
      let chatId = env.TELEGRAM_CHAT_ID;

      // Fallback: read from request body if env vars not set
      if (!botToken || !chatId) {
        try {
          const data = await request.json();
          botToken = botToken || data.botToken;
          chatId = chatId || data.chatId;
        } catch(e) {}
      }

      if (!botToken || !chatId) {
        return new Response(JSON.stringify({ success: false, message: "Telegram not configured" }), { status: 400, headers });
      }

      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "✅ KIMI SUSHI BOT - Kết nối thành công! Bạn sẽ nhận được thông báo khi có khách đặt hàng."
        })
      });

      const tgData = await tgRes.json();
      return new Response(JSON.stringify({ success: tgData.ok }), { headers });
    }

    // 10. Send Reply Email to Customer (Admin triggers this)
    if (path === "/api/send-reply" && request.method === "POST") {
      const data = await request.json();
      const {
        customerEmail,
        customerName,
        replyType, // 'reservation_confirmed' | 'reservation_declined' | 'order_ready' | 'order_declined'
        waitMinutes,
        orderTotal,
        customerPhone,
        deliveryAddress
      } = data;

      const apiKey = env.RESEND_API_KEY;
      const botToken = env.TELEGRAM_BOT_TOKEN;
      const chatId = env.TELEGRAM_CHAT_ID;

      // German email templates
      const templates = {
        reservation_confirmed: {
          subject: "✅ Ihre Reservierung bei Sakura Sushi - Bestätigung",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 2px solid #22c55e; padding: 30px; border-radius: 16px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #22c55e; font-size: 28px; margin: 0;">✅ Reservierung Bestätigt!</h1>
                <p style="color: #666; margin: 5px 0 0 0;">Vielen Dank für Ihre Reservierung</p>
              </div>
              <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0;">Sehr geehrte/r <strong style="font-size: 18px;">${escapeHtml(customerName)}</strong>,</p>
                <p style="margin: 0; color: #333;">wir freuen uns sehr, Sie bei <strong>Sakura Sushi</strong> willkommen heißen zu dürfen!</p>
                <p style="margin: 15px 0 0 0; color: #333;">Ihre Reservierung wurde erfolgreich <strong style="color: #22c55e; font-size: 18px;">bestätigt</strong>.</p>
              </div>
              <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <p style="margin: 0; color: #666; font-size: 14px;">Bei Fragen oder Änderungen kontaktieren Sie uns gerne jederzeit.</p>
                <p style="margin: 10px 0 0 0; color: #333;"><strong>Telefon:</strong> Bitte rufen Sie uns an unter unserer Nummer.</p>
              </div>
              <p style="color: #22c55e; font-weight: bold; font-size: 18px; text-align: center; margin: 0;">Wir freuen uns auf Ihren Besuch!</p>
              <p style="color: #666; text-align: center; margin: 10px 0 0 0;">Ihr Sakura Sushi Team</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
              <p style="font-size: 11px; color: #999; text-align: center;">Sakura Sushi - Authentische japanische Küche</p>
            </div>
          `
        },
        reservation_declined: {
          subject: "Ihre Reservierungsanfrage bei Sakura Sushi",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 2px solid #ef4444; padding: 30px; border-radius: 16px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #ef4444; font-size: 28px; margin: 0;">Reservierungsanfrage</h1>
                <p style="color: #666; margin: 5px 0 0 0;">Leider müssen wir Ihnen eine Mitteilung machen</p>
              </div>
              <div style="background: #fef2f2; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0;">Sehr geehrte/r <strong style="font-size: 18px;">${escapeHtml(customerName)}</strong>,</p>
                <p style="margin: 0; color: #333;">vielen Dank für Ihre Reservierungsanfrage bei <strong>Sakura Sushi</strong>.</p>
                <p style="margin: 15px 0 0 0; color: #333;">Leider müssen wir Ihnen mitteilen, dass wir für den gewünschten Zeitpunkt bereits <strong style="color: #ef4444;">ausgebucht</strong> sind.</p>
                <p style="margin: 15px 0 0 0; color: #333;">Wir würden uns sehr freuen, Sie zu einem <strong>anderen Zeitpunkt</strong> bei uns begrüßen zu dürfen.</p>
              </div>
              <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px;">
                <p style="margin: 0; color: #666; font-size: 14px;">Bitte kontaktieren Sie uns für weitere Informationen oder um einen alternativen Termin zu vereinbaren.</p>
              </div>
              <p style="color: #666; text-align: center; margin: 25px 0 0 0;">Mit freundlichen Grüßen,<br><strong>Ihr Sakura Sushi Team</strong></p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
              <p style="font-size: 11px; color: #999; text-align: center;">Sakura Sushi - Authentische japanische Küche</p>
            </div>
          `
        },
        order_ready: {
          subject: `✅ Ihre Bestellung bei Sakura Sushi - Bereit in ${waitMinutes || 15} Minuten!`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 2px solid #f59e0b; padding: 30px; border-radius: 16px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #f59e0b; font-size: 28px; margin: 0;">🍣 Ihre Bestellung ist auf dem Weg!</h1>
                <p style="color: #666; margin: 5px 0 0 0;">Vielen Dank für Ihre Bestellung</p>
              </div>
              <div style="background: #fffbeb; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #fcd34d;">
                <p style="margin: 0 0 10px 0;">Hallo <strong style="font-size: 18px;">${escapeHtml(customerName)}</strong>,</p>
                <p style="margin: 0; color: #333;">wir haben Ihre Bestellung bei <strong>Sakura Sushi</strong> erhalten. Vielen Dank!</p>
                <p style="margin: 15px 0; color: #333;">Ihre Bestellung wird in ca. <strong style="font-size: 24px; color: #f59e0b;">${waitMinutes || 15} Minuten</strong> fertig zubereitet sein.</p>
                <p style="margin: 0; color: #333;">Sie können Ihre Bestellung dann bequem bei uns <strong>abholen</strong>.</p>
                ${orderTotal ? `<p style="margin: 15px 0 0 0; color: #333;"><strong>Gesamtbetrag:</strong> <span style="font-size: 20px; font-weight: bold; color: #e63946;">${escapeHtml(orderTotal)}€</span></p>` : ''}
              </div>
              <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <p style="margin: 0; color: #666; font-size: 14px;">Falls Sie Fragen haben oder Ihre Bestellung ändern möchten, rufen Sie uns bitte umgehend an.</p>
              </div>
              <p style="color: #f59e0b; font-weight: bold; font-size: 18px; text-align: center; margin: 0;">Wir wünschen Ihnen einen guten Appetit! 🍱</p>
              <p style="color: #666; text-align: center; margin: 10px 0 0 0;">Ihr Sakura Sushi Team</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
              <p style="font-size: 11px; color: #999; text-align: center;">Sakura Sushi - Authentische japanische Küche</p>
            </div>
          `
        },
        order_declined: {
          subject: "Ihre Bestellung bei Sakura Sushi",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 2px solid #ef4444; padding: 30px; border-radius: 16px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #ef4444; font-size: 28px; margin: 0;">Zu Ihrer Bestellung</h1>
              </div>
              <div style="background: #fef2f2; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0;">Hallo <strong style="font-size: 18px;">${escapeHtml(customerName)}</strong>,</p>
                <p style="margin: 0; color: #333;">vielen Dank für Ihre Bestellung bei <strong>Sakura Sushi</strong>.</p>
                <p style="margin: 15px 0 0 0; color: #333;">Leider müssen wir Ihnen mitteilen, dass wir Ihre Bestellung in diesem Moment <strong style="color: #ef4444;">nicht annehmen</strong> können.</p>
                <p style="margin: 15px 0 0 0; color: #333;">Bitte versuchen Sie es zu einem späteren Zeitpunkt erneut oder kontaktieren Sie uns.</p>
              </div>
              <p style="color: #666; text-align: center; margin: 0;">Mit freundlichen Grüßen,<br><strong>Ihr Sakura Sushi Team</strong></p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
              <p style="font-size: 11px; color: #999; text-align: center;">Sakura Sushi - Authentische japanische Küche</p>
            </div>
          `
        }
      };

      const template = templates[replyType];
      if (!template) {
        return new Response(JSON.stringify({ error: "Unknown reply type" }), { status: 400, headers });
      }

      // Send Email via Resend
      let emailSuccess = false;
      let telegramSuccess = false;

      if (apiKey && customerEmail) {
        try {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Sakura Sushi <onboarding@resend.dev>",
              to: [customerEmail],
              subject: template.subject,
              html: template.html
            })
          });
          emailSuccess = emailRes.ok;
        } catch (e) {
          console.error("Email error:", e);
        }
      }

      // Send Telegram notification to admin
      if (botToken && chatId) {
        try {
          const replyLabels = {
            reservation_confirmed: "✅ RESERVIERUNG BESTÄTIGT",
            reservation_declined: "❌ RESERVIERUNG ABGESAGT",
            order_ready: "✅ BESTELLUNG BESTÄTIGT",
            order_declined: "❌ BESTELLUNG ABGESAGT"
          };
          const label = replyLabels[replyType] || "ANTWORT GESENDET";

          let telegramText = `📩 ${label}\n`;
          telegramText += `━━━━━━━━━━━━━━━\n`;
          telegramText += `👤 Kunde: ${escapeHtml(customerName)}\n`;
          telegramText += `📧 Email: ${escapeHtml(customerEmail)}\n`;
          if (customerPhone) telegramText += `📱 Tel: ${escapeHtml(customerPhone)}\n`;
          if (replyType === 'order_ready') {
            telegramText += `⏰ Bereit in: ${waitMinutes || 15} Minuten\n`;
          }
          telegramText += `━━━━━━━━━━━━━━━\n`;
          telegramText += `✅ Email ${emailSuccess ? 'gesendet' : 'FEHLGESCHLAGEN'} an Kunden`;

          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: telegramText })
          });
          telegramSuccess = true;
        } catch (e) {
          console.error("Telegram error:", e);
        }
      }

      return new Response(JSON.stringify({
        success: emailSuccess || telegramSuccess,
        emailSent: emailSuccess,
        telegramSent: telegramSuccess
      }), { headers });
    }

    // 11. Telegram Webhook - Nhận tin nhắn từ admin
    if (path === "/api/telegram-webhook" && request.method === "POST") {
      const data = await request.json();

      // Chỉ xử lý nếu là tin nhắn từ người dùng (không phải bot)
      if (!data.message || data.message.from?.is_bot) {
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      const chatId = String(data.message.chat.id);
      const userId = String(data.message.from.id);
      const text = (data.message.text || '').trim().toLowerCase();
      const messageId = data.message.reply_to_message?.message_id;

      // Lấy cấu hình từ request body hoặc KV settings
      let botToken = env.TELEGRAM_BOT_TOKEN;
      let adminChatId = env.TELEGRAM_CHAT_ID;

      // Fallback: đọc từ KV settings
      if (!botToken || !adminChatId) {
        try {
          const settingsJson = await getKVDirect("kimi_settings");
          const settings = JSON.parse(settingsJson || "{}");
          botToken = botToken || settings.telegramBotToken;
          adminChatId = adminChatId || settings.telegramChatId;
        } catch(e) {}
      }

      // Normalize IDs to string for comparison
      const adminIdStr = String(adminChatId || '').trim();
      const userIdStr = String(userId || '').trim();

      // Debug log
      console.log("Telegram webhook:", { adminIdStr, userIdStr, chatId, text: text.substring(0, 50) });

      // Chỉ xử lý nếu tin nhắn từ admin (hoặc nếu chưa cấu hình thì xử lý tất cả)
      if (adminIdStr && adminIdStr !== userIdStr) {
        // Không phải admin - có thể là khách hàng gửi tin nhắn trực tiếp
        // Gửi auto-reply cho khách
        if (botToken && adminIdStr === chatId) {
          const customerReply = `Vielen Dank für Ihre Nachricht! 🍣\n\nIhre Bestellung wird bearbeitet. Wir melden uns in Kürze bei Ihnen.\n\nIhr Sakura Sushi Team`;
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: customerReply })
          });
        }
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      // Lấy đơn hàng mới nhất từ inbox
      let inboxData = [];
      try {
        const inboxJson = await getKVDirect("kimi_inbox");
        inboxData = JSON.parse(inboxJson || "[]");
      } catch(e) {}

      // Tìm đơn chưa được xử lý gần nhất
      const pendingOrder = inboxData.find(item => !item.adminReplied);
      if (!pendingOrder) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: "❌ Keine ausstehende Bestellung gefunden." })
        }).catch(() => {});
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      // Parse thời gian từ tin nhắn
      let waitMinutes = 15;
      const timeMatch = text.match(/(\d+)\s*min/i) || text.match(/(\d+)/);
      if (timeMatch) waitMinutes = parseInt(timeMatch[1]);

      // Xác định loại đơn và gửi email
      const customerName = pendingOrder.name || pendingOrder.customerName || 'Kunde';
      const customerEmail = pendingOrder.email || pendingOrder.customerEmail;
      const customerPhone = pendingOrder.phone || pendingOrder.customerPhone;
      const isReservation = pendingOrder.type === 'reservation' || pendingOrder.orderType === 'reservation';

      // Lấy Resend API Key
      let apiKey = env.RESEND_API_KEY;
      if (!apiKey) {
        try {
          const settingsJson = await getKVDirect("kimi_settings");
          const settings = JSON.parse(settingsJson || "{}");
          apiKey = settings.emailApiKey;
        } catch(e) {}
      }

      // Gửi email xác nhận bằng tiếng Đức
      let emailSuccess = false;
      if (apiKey && customerEmail) {
        try {
          const safeName = escapeHtml(customerName);

          // Template email tiếng Đức chuyên nghiệp
          const emailSubject = isReservation
            ? `✅ Ihre Reservierung bei Sakura Sushi - Bestätigung`
            : `✅ Ihre Bestellung bei Sakura Sushi - Bereit in ${waitMinutes} Minuten`;

          const emailHtml = isReservation ? `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 2px solid #22c55e; padding: 30px; border-radius: 16px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #22c55e; font-size: 28px; margin: 0;">✅ Reservierung Bestätigt!</h1>
                <p style="color: #666; margin: 5px 0 0 0;">Vielen Dank für Ihre Reservierung</p>
              </div>
              <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0;">Sehr geehrte/r <strong style="font-size: 18px;">${safeName}</strong>,</p>
                <p style="margin: 0; color: #333;">wir freuen uns sehr, Sie bei <strong>Sakura Sushi</strong> willkommen heißen zu dürfen!</p>
                <p style="margin: 15px 0 0 0; color: #333;">Ihre Reservierung wurde erfolgreich <strong style="color: #22c55e; font-size: 18px;">bestätigt</strong>.</p>
              </div>
              <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <p style="margin: 0; color: #666; font-size: 14px;">Bei Fragen oder Änderungen kontaktieren Sie uns gerne jederzeit.</p>
              </div>
              <p style="color: #22c55e; font-weight: bold; font-size: 18px; text-align: center; margin: 0;">Wir freuen uns auf Ihren Besuch!</p>
              <p style="color: #666; text-align: center; margin: 10px 0 0 0;">Ihr Sakura Sushi Team</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
              <p style="font-size: 11px; color: #999; text-align: center;">Sakura Sushi - Authentische japanische Küche</p>
            </div>
          ` : `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 2px solid #f59e0b; padding: 30px; border-radius: 16px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #f59e0b; font-size: 28px; margin: 0;">🍣 Ihre Bestellung ist auf dem Weg!</h1>
                <p style="color: #666; margin: 5px 0 0 0;">Vielen Dank für Ihre Bestellung</p>
              </div>
              <div style="background: #fffbeb; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0;">Hallo <strong style="font-size: 18px;">${safeName}</strong>,</p>
                <p style="margin: 0; color: #333;">wir haben Ihre Bestellung bei <strong>Sakura Sushi</strong> erhalten. Vielen Dank!</p>
                <p style="margin: 15px 0; color: #333;">Ihre Bestellung wird in ca. <strong style="font-size: 24px; color: #f59e0b;">${waitMinutes} Minuten</strong> fertig zubereitet sein.</p>
                <p style="margin: 0; color: #333;">Sie können Ihre Bestellung dann bequem bei uns <strong>abholen</strong>.</p>
                ${pendingOrder.total ? `<p style="margin: 15px 0 0 0; color: #333;"><strong>Gesamtbetrag:</strong> <span style="font-size: 20px; font-weight: bold; color: #e63946;">${escapeHtml(pendingOrder.total)}€</span></p>` : ''}
              </div>
              <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <p style="margin: 0; color: #666; font-size: 14px;">Falls Sie Fragen haben oder Ihre Bestellung ändern möchten, rufen Sie uns bitte umgehend an.</p>
              </div>
              <p style="color: #f59e0b; font-weight: bold; font-size: 18px; text-align: center; margin: 0;">Wir wünschen Ihnen einen guten Appetit! 🍱</p>
              <p style="color: #666; text-align: center; margin: 10px 0 0 0;">Ihr Sakura Sushi Team</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
              <p style="font-size: 11px; color: #999; text-align: center;">Sakura Sushi - Authentische japanische Küche</p>
            </div>
          `;

          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "Sakura Sushi <onboarding@resend.dev>",
              to: [customerEmail],
              subject: emailSubject,
              html: emailHtml
            })
          });
          emailSuccess = emailRes.ok;
        } catch (e) {
          console.error("Email error:", e);
        }
      }

      // Đánh dấu đơn đã được xử lý trong inbox
      try {
        const inboxJson = await getKVDirect("kimi_inbox");
        const inbox = JSON.parse(inboxJson || "[]");
        const idx = inbox.findIndex(item => item.id === pendingOrder.id);
        if (idx >= 0) {
          inbox[idx].adminReplied = true;
          inbox[idx].repliedAt = new Date().toISOString();
          inbox[idx].waitMinutes = waitMinutes;
          await putKV("kimi_inbox", JSON.stringify(inbox));
        }
      } catch(e) {}

      // Gửi xác nhận cho admin trên Telegram
      const confirmMsg = emailSuccess
        ? `✅ Email gesendet an ${customerEmail}\n⏰ Bereit in: ${waitMinutes} Minuten\n👤 Kunde: ${customerName}`
        : `⚠️ Email konnte nicht gesendet werden.\n⏰ Zeit: ${waitMinutes} Minuten\n👤 Kunde: ${customerName}\n📧 Email: ${customerEmail}`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: confirmMsg })
      }).catch(() => {});

      return new Response(JSON.stringify({ ok: true }), { headers });
    }

    return new Response(JSON.stringify({ error: "Endpoint not found: " + path }), { status: 404, headers });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
