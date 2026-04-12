import TelegramBotLib from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { query, getClient } from '../database/db.js';
import { EmailService } from './emailService.js';

dotenv.config();

const ORDER_STATUS_BUTTONS = {
  inline_keyboard: [
    [
      { text: 'Bestaetigt', callback_data: 'order_confirm' },
      { text: '15 Min', callback_data: 'order_15' },
      { text: '20 Min', callback_data: 'order_20' }
    ],
    [
      { text: '30 Min', callback_data: 'order_30' },
      { text: '45 Min', callback_data: 'order_45' },
      { text: 'In Zubereitung', callback_data: 'order_preparing' }
    ],
    [
      { text: 'Abholbereit', callback_data: 'order_ready' },
      { text: 'Abgeschlossen', callback_data: 'order_completed' }
    ],
    [
      { text: 'Stornieren', callback_data: 'order_cancel' },
      { text: 'Ablehnen', callback_data: 'order_reject' }
    ]
  ]
};

const RESERVATION_STATUS_BUTTONS = {
  inline_keyboard: [
    [
      { text: 'Bestaetigen', callback_data: 'res_confirm' },
      { text: 'Tisch reserviert', callback_data: 'res_table' },
      { text: 'Bitte spaeter', callback_data: 'res_later' }
    ],
    [
      { text: 'Abgelehnt', callback_data: 'res_reject' },
      { text: 'Storniert', callback_data: 'res_cancel' }
    ]
  ]
};

const STATUS_LABELS = {
  'neu': 'NEU',
  'bestaetigt': 'BESTAETIGT',
  'in_zubereitung': 'IN ZUBEREITUNG',
  'abholbereit': 'ABHOLBEREIT',
  'abgeschlossen': 'ABGESCHLOSSEN',
  'storniert': 'STORNIERT',
  'abgelehnt': 'ABGELEHNT',
  'anfrage': 'NEUE ANFRAGE',
  'tisch_reserviert': 'TISCH RESERVIERT',
  'bitte_spaeter': 'BITTE SPAETER'
};

export class TelegramBotService {
  constructor() {
    this.bot = null;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
  }

  async initialize() {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token || token === 'your_bot_token_here') {
      console.log('Telegram Bot Token nicht konfiguriert, Bot wird uebersprungen');
      return;
    }

    this.bot = new TelegramBotLib(token, { polling: true });
    console.log('Telegram Bot gestartet');

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    if (!this.bot) return;

    this.bot.on('callback_query', async (callbackQuery) => {
      const { data, message } = callbackQuery;
      const chatId = message.chat.id;

      try {
        await this.handleCallback(data, message);
        await this.bot.answerCallbackQuery(callbackQuery.id);
      } catch (error) {
        console.error('Callback error:', error);
        await this.bot.sendMessage(chatId, 'Fehler bei der Verarbeitung.');
      }
    });

    this.bot.on('message', (msg) => {
      if (msg.text && !msg.text.startsWith('/')) {
        console.log('Nachricht von', msg.chat.id, ':', msg.text);
      }
    });
  }

  async handleCallback(data, message) {
    const chatId = message.chat.id;
    const messageId = message.message_id;

    const [type, action] = data.split('_');
    const entityType = type === 'order' ? 'orders' : 'reservations';

    const idMatch = message.text?.match(/(?:Bestellnummer|Reservierungsnummer):?\s*([A-Z0-9-]+)/i);
    if (!idMatch) {
      await this.bot.sendMessage(chatId, 'ID nicht gefunden.');
      return;
    }

    const id = idMatch[1];

    let newStatus;
    let emailType;
    let timeValue = null;

    switch (data) {
      case 'order_confirm':
        newStatus = 'bestaetigt';
        emailType = 'order_confirmed';
        break;
      case 'order_15':
        newStatus = 'bestaetigt';
        emailType = 'order_time';
        timeValue = 15;
        break;
      case 'order_20':
        newStatus = 'bestaetigt';
        emailType = 'order_time';
        timeValue = 20;
        break;
      case 'order_30':
        newStatus = 'bestaetigt';
        emailType = 'order_time';
        timeValue = 30;
        break;
      case 'order_45':
        newStatus = 'bestaetigt';
        emailType = 'order_time';
        timeValue = 45;
        break;
      case 'order_preparing':
        newStatus = 'in_zubereitung';
        emailType = 'order_preparing';
        break;
      case 'order_ready':
        newStatus = 'abholbereit';
        emailType = 'order_ready';
        break;
      case 'order_completed':
        newStatus = 'abgeschlossen';
        emailType = 'order_completed';
        break;
      case 'order_cancel':
        newStatus = 'storniert';
        emailType = 'order_cancelled';
        break;
      case 'order_reject':
        newStatus = 'abgelehnt';
        emailType = 'order_rejected';
        break;
      case 'res_confirm':
        newStatus = 'bestaetigt';
        emailType = 'reservation_confirmed';
        break;
      case 'res_table':
        newStatus = 'tisch_reserviert';
        emailType = 'reservation_confirmed';
        break;
      case 'res_later':
        newStatus = 'bitte_spaeter';
        emailType = 'reservation_later';
        break;
      case 'res_reject':
        newStatus = 'abgelehnt';
        emailType = 'reservation_rejected';
        break;
      case 'res_cancel':
        newStatus = 'storniert';
        emailType = 'reservation_cancelled';
        break;
      default:
        return;
    }

    await this.updateEntityStatus(entityType, id, newStatus, timeValue, emailType, chatId, messageId);

    const updatedText = message.text.replace(
      /Status:?\s*[A-Z\s]+/i,
      `Status: ${STATUS_LABELS[newStatus] || newStatus.toUpperCase()}`
    );

    await this.bot.editMessageText(updatedText, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: data.startsWith('order_') ? ORDER_STATUS_BUTTONS : RESERVATION_STATUS_BUTTONS
    });

    await this.bot.sendMessage(chatId, `Aktion ausgefuehrt: ${STATUS_LABELS[newStatus]}`);
  }

  async updateEntityStatus(table, id, newStatus, timeValue, emailType, chatId, messageId) {
    const db = getClient();
    const now = new Date().toISOString();
    const { v4: uuidv4 } = await import('uuid');

    try {
      db.exec('BEGIN TRANSACTION');

      // Get current entity
      const entity = table === 'orders'
        ? db.prepare('SELECT * FROM orders WHERE order_number = ? OR id = ?').get(id, id)
        : db.prepare('SELECT * FROM reservations WHERE reservation_number = ? OR id = ?').get(id, id);

      if (!entity) {
        db.exec('ROLLBACK');
        throw new Error('Entity not found');
      }

      const oldStatus = entity.status;

      // Update status
      const updateField = table === 'orders' ? 'order_number' : 'reservation_number';
      db.prepare(`UPDATE ${table} SET status = ?, updated_at = ? WHERE ${updateField} = ? OR id = ?`).run(newStatus, now, id, id);

      // Add status history
      const entityType = table === 'orders' ? 'order' : 'reservation';
      db.prepare(
        `INSERT INTO status_history (id, entity_type, entity_id, old_status, new_status, changed_by, notes, created_at)
         VALUES (?, ?, ?, ?, ?, 'telegram', ?, ?)`
      ).run(uuidv4(), entityType, entity.id, oldStatus, newStatus, timeValue ? `Zeit: ${timeValue} Minuten` : null, now);

      // Log telegram action
      db.prepare(
        `INSERT INTO telegram_actions (id, entity_type, entity_id, action, telegram_chat_id, telegram_message_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(uuidv4(), entityType, entity.id, emailType, String(chatId), messageId, now);

      // Send email
      try {
        const emailService = new EmailService();
        await emailService.sendEmail({
          type: emailType,
          entityType: entityType,
          entityId: entity.id,
          customerEmail: entity.customer_email,
          customerName: entity.customer_name,
          timeValue: timeValue,
          reservationTime: entity.reservation_time,
          reservationDate: entity.reservation_date
        });
      } catch (emailError) {
        console.log('Email skipped:', emailError.message);
      }

      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  async sendNewOrderNotification(order) {
    if (!this.bot || !this.chatId) return;

    const items = order.items || [];
    const itemsText = items.map(item =>
      `  - ${item.quantity}x ${item.name} (${item.total_price} EUR)`
    ).join('\n');

    const message = `
NEUE BESTELLUNG
━━━━━━━━━━━━━━━━━━━━━━
Bestellnummer: ${order.order_number}
━━━━━━━━━━━━━━━━━━━━━━
Name: ${order.customer_name}
Telefon: ${order.customer_phone}
E-Mail: ${order.customer_email}
━━━━━━━━━━━━━━━━━━━━━━
${order.pickup_date ? `Datum: ${order.pickup_date}` : ''}
Abholzeit: ${order.pickup_time || 'So bald wie moeglich'}
━━━━━━━━━━━━━━━━━━━━━━
BESTELLUNG:
${itemsText}
━━━━━━━━━━━━━━━━━━━━━━
Gesamtbetrag: ${order.total_amount} EUR
━━━━━━━━━━━━━━━━━━━━━━
Bemerkung: ${order.notes || '-'}
━━━━━━━━━━━━━━━━━━━━━━
Status: NEU
    `.trim();

    try {
      await this.bot.sendMessage(this.chatId, message, {
        reply_markup: ORDER_STATUS_BUTTONS
      });
    } catch (error) {
      console.error('Fehler beim Senden der Telegram-Benachrichtigung:', error);
    }
  }

  async sendNewReservationNotification(reservation) {
    if (!this.bot || !this.chatId) return;

    const message = `
NEUE RESERVIERUNG
━━━━━━━━━━━━━━━━━━━━━━
Reservierungsnummer: ${reservation.reservation_number}
━━━━━━━━━━━━━━━━━━━━━━
Name: ${reservation.customer_name}
Telefon: ${reservation.customer_phone}
E-Mail: ${reservation.customer_email}
━━━━━━━━━━━━━━━━━━━━━━
Datum: ${reservation.reservation_date}
Uhrzeit: ${reservation.reservation_time}
Personen: ${reservation.party_size}
━━━━━━━━━━━━━━━━━━━━━━
Bemerkung: ${reservation.notes || '-'}
━━━━━━━━━━━━━━━━━━━━━━
Status: NEUE ANFRAGE
    `.trim();

    try {
      await this.bot.sendMessage(this.chatId, message, {
        reply_markup: RESERVATION_STATUS_BUTTONS
      });
    } catch (error) {
      console.error('Fehler beim Senden der Telegram-Benachrichtigung:', error);
    }
  }
}
