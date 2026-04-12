import express from 'express';
import { body, validationResult } from 'express-validator';
import { query, run, getClient } from '../database/db.js';
import { EmailService } from '../services/emailService.js';
import { TelegramBotService } from '../services/telegramBot.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const orderValidation = [
  body('customerName').trim().notEmpty().withMessage('Name ist erforderlich'),
  body('customerEmail').isEmail().withMessage('Gueltige E-Mail erforderlich'),
  body('customerPhone').trim().notEmpty().withMessage('Telefonnummer erforderlich'),
  body('items').isArray({ min: 1 }).withMessage('Mindestens ein Artikel erforderlich'),
  body('items.*.name').notEmpty().withMessage('Artikelname erforderlich'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Menge muss mindestens 1 sein'),
  body('items.*.price').isNumeric().withMessage('Preis muss eine Zahl sein')
];

function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${year}${month}${day}-${random}`;
}

// POST /api/orders - Create new order
router.post('/', orderValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(e => e.msg).join(', ');
      return res.status(400).json({ error: errorMessages });
    }

    const { customerName, customerEmail, customerPhone, items, pickupTime, pickupDate, notes, address } = req.body;
    const totalAmount = items.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * item.quantity);
    }, 0);

    const orderNumber = generateOrderNumber();
    const orderId = uuidv4();
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

      // Create order
      db.prepare(
        `INSERT INTO orders (id, order_number, customer_id, customer_name, customer_email, customer_phone, total_amount, status, pickup_time, pickup_date, notes, address, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'neu', ?, ?, ?, ?, ?, ?)`
      ).run(orderId, orderNumber, customerId, customerName, customerEmail, customerPhone, totalAmount, pickupTime || null, pickupDate || null, notes || null, address || null, now, now);

      // Insert order items
      for (const item of items) {
        const itemId = uuidv4();
        const itemTotal = parseFloat(item.price) * item.quantity;
        db.prepare(
          `INSERT INTO order_items (id, order_id, menu_item_id, name, quantity, unit_price, total_price, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(itemId, orderId, item.menuItemId || null, item.name, item.quantity, item.price, itemTotal, now);
      }

      // Add status history
      db.prepare(
        `INSERT INTO status_history (id, entity_type, entity_id, old_status, new_status, changed_by, notes, created_at)
         VALUES (?, 'order', ?, NULL, 'neu', 'system', 'Bestellung erstellt', ?)`
      ).run(uuidv4(), orderId, now);

      db.exec('COMMIT');

      // Fetch complete order
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
      const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
      order.items = orderItems;

      // Send notification to Telegram
      try {
        const telegramBot = new TelegramBotService();
        await telegramBot.sendNewOrderNotification(order);
      } catch (telegramError) {
        console.log('Telegram notification skipped (no token configured)');
      }

      // Send confirmation email to customer
      try {
        const emailService = new EmailService();
        await emailService.sendEmail({
          type: 'order_received',
          entityType: 'order',
          entityId: orderId,
          customerEmail,
          customerName,
          orderNumber
        });
      } catch (emailError) {
        console.log('Email notification skipped (no SMTP configured)');
      }

      res.status(201).json({
        success: true,
        orderNumber,
        message: 'Bestellung erfolgreich erstellt'
      });

    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Fehler beim Erstellen der Bestellung:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen der Bestellung' });
  }
});

// GET /api/orders/:id - Get order by ID or order number
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getClient();

    const order = db.prepare('SELECT * FROM orders WHERE id = ? OR order_number = ?').get(id, id);

    if (!order) {
      return res.status(404).json({ error: 'Bestellung nicht gefunden' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    order.items = items;

    res.json(order);
  } catch (error) {
    console.error('Fehler beim Abrufen der Bestellung:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Bestellung' });
  }
});

// GET /api/orders - List all orders
router.get('/', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    const db = getClient();

    let sql = 'SELECT * FROM orders';
    const params = [];

    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const orders = db.prepare(sql).all(...params);

    // Get items for each order
    for (const order of orders) {
      order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    }

    res.json(orders);
  } catch (error) {
    console.error('Fehler beim Auflisten der Bestellungen:', error);
    res.status(500).json({ error: 'Fehler beim Auflisten der Bestellungen' });
  }
});

// PUT /api/orders/:id/status - Update order status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const now = new Date().toISOString();
    const db = getClient();

    const result = db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ? OR order_number = ?').run(status, now, id, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Bestellung nicht gefunden' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ? OR order_number = ?').get(id, id);

    res.json({ success: true, order });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Status:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Status' });
  }
});

export { router as ordersRouter };
