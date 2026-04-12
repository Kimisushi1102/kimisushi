import express from 'express';
import { body, validationResult } from 'express-validator';
import { query, getClient } from '../database/db.js';
import { EmailService } from '../services/emailService.js';
import { TelegramBotService } from '../services/telegramBot.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const reservationValidation = [
  body('customerName').trim().notEmpty().withMessage('Name ist erforderlich'),
  body('customerEmail').isEmail().withMessage('Gueltige E-Mail erforderlich'),
  body('customerPhone').trim().notEmpty().withMessage('Telefonnummer erforderlich'),
  body('reservationDate').isDate().withMessage('Gueltiges Datum erforderlich'),
  body('reservationTime').notEmpty().withMessage('Uhrzeit erforderlich'),
  body('partySize').isInt({ min: 1, max: 20 }).withMessage('Personenzahl zwischen 1 und 20')
];

function generateReservationNumber() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RES-${year}${month}${day}-${random}`;
}

// POST /api/reservations - Create new reservation
router.post('/', reservationValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(e => e.msg).join(', ');
      return res.status(400).json({ error: errorMessages });
    }

    const { customerName, customerEmail, customerPhone, reservationDate, reservationTime, partySize, notes } = req.body;
    const reservationNumber = generateReservationNumber();
    const reservationId = uuidv4();
    const now = new Date().toISOString();
    const db = getClient();

    try {
      db.exec('BEGIN TRANSACTION');

      // Check or create customer
      let customerId;
      const existingCustomer = db.prepare('SELECT id FROM customers WHERE email = ?').get(customerEmail);

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        customerId = uuidv4();
        db.prepare('INSERT INTO customers (id, name, email, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(customerId, customerName, customerEmail, customerPhone, now, now);
      }

      // Create reservation
      db.prepare(
        `INSERT INTO reservations (id, reservation_number, customer_id, customer_name, customer_email, customer_phone, reservation_date, reservation_time, party_size, status, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'neu', ?, ?, ?)`
      ).run(reservationId, reservationNumber, customerId, customerName, customerEmail, customerPhone, reservationDate, reservationTime, partySize, notes || null, now, now);

      // Add status history
      db.prepare(
        `INSERT INTO status_history (id, entity_type, entity_id, old_status, new_status, changed_by, notes, created_at)
         VALUES (?, 'reservation', ?, NULL, 'neu', 'system', 'Reservierung erstellt', ?)`
      ).run(uuidv4(), reservationId, now);

      db.exec('COMMIT');

      // Fetch complete reservation
      const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);

      // Send notification to Telegram
      try {
        const telegramBot = new TelegramBotService();
        await telegramBot.sendNewReservationNotification(reservation);
      } catch (telegramError) {
        console.log('Telegram notification skipped (no token configured)');
      }

      // Send confirmation email to customer
      try {
        const emailService = new EmailService();
        await emailService.sendEmail({
          type: 'reservation_received',
          entityType: 'reservation',
          entityId: reservationId,
          customerEmail,
          customerName,
          reservationNumber
        });
      } catch (emailError) {
        console.log('Email notification skipped (no SMTP configured)');
      }

      res.status(201).json({
        success: true,
        reservationNumber,
        message: 'Reservierung erfolgreich erstellt'
      });

    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Fehler beim Erstellen der Reservierung:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen der Reservierung' });
  }
});

// GET /api/reservations/:id - Get reservation by ID or number
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getClient();

    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ? OR reservation_number = ?').get(id, id);

    if (!reservation) {
      return res.status(404).json({ error: 'Reservierung nicht gefunden' });
    }

    res.json(reservation);
  } catch (error) {
    console.error('Fehler beim Abrufen der Reservierung:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Reservierung' });
  }
});

// GET /api/reservations - List all reservations
router.get('/', async (req, res) => {
  try {
    const { status, date, limit = 50, offset = 0 } = req.query;
    const db = getClient();

    let sql = 'SELECT * FROM reservations';
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (date) {
      conditions.push('reservation_date = ?');
      params.push(date);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY reservation_date DESC, reservation_time DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const reservations = db.prepare(sql).all(...params);
    res.json(reservations);
  } catch (error) {
    console.error('Fehler beim Auflisten der Reservierungen:', error);
    res.status(500).json({ error: 'Fehler beim Auflisten der Reservierungen' });
  }
});

// PUT /api/reservations/:id/status - Update reservation status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const now = new Date().toISOString();
    const db = getClient();

    const result = db.prepare('UPDATE reservations SET status = ?, updated_at = ? WHERE id = ? OR reservation_number = ?').run(status, now, id, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Reservierung nicht gefunden' });
    }

    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ? OR reservation_number = ?').get(id, id);

    res.json({ success: true, reservation });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Status:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Status' });
  }
});

export { router as reservationsRouter };
