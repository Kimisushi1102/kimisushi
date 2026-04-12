import express from 'express';
import crypto from 'crypto';
import { query } from '../database/db.js';
import { TelegramBotService } from '../services/telegramBot.js';

const router = express.Router();

// Verify Telegram webhook signature
function verifyTelegramSignature(body, secret) {
  const { hash, ...data } = body;
  const secretKey = crypto.createHash('sha256').update(secret).digest();
  const dataCheckString = Object.keys(data)
    .sort()
    .map(k => `${k}=${body[k]}`)
    .join('\n');
  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return hmac === hash;
}

// POST /api/telegram/webhook - Telegram webhook endpoint
router.post('/webhook', async (req, res) => {
  try {
    const update = req.body;

    // Handle callback queries (button clicks)
    if (update.callback_query) {
      const { data, message, from } = update.callback_query;
      console.log('Callback Query:', data, 'from:', from.username);

      // Process the callback
      // The TelegramBot class will handle this via polling
      // This webhook endpoint is for alternative webhook mode
    }

    // Handle messages
    if (update.message) {
      const { chat, text, from: sender } = update.message;
      console.log('Message from', sender.username || sender.id, ':', text);

      // Handle commands
      if (text === '/start') {
        // Send welcome message
      }
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Telegram Webhook Error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// POST /api/telegram/test - Test Telegram connection
router.post('/test', async (req, res) => {
  try {
    const telegramBot = new TelegramBotService();
    await telegramBot.initialize();

    if (telegramBot.bot) {
      res.json({ success: true, message: 'Telegram Bot ist aktiv' });
    } else {
      res.json({ success: false, message: 'Telegram Bot Token nicht konfiguriert' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/telegram/status - Get Telegram status
router.get('/status', async (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  res.json({
    configured: token && token !== 'your_bot_token_here',
    chatId: chatId || 'Nicht konfiguriert',
    webhookMode: process.env.TELEGRAM_WEBHOOK_MODE === 'true'
  });
});

export { router as telegramRouter };
