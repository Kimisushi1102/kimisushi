import express from 'express';
import { getClient } from '../database/db.js';

const router = express.Router();

// GET /api/menu - Get all menu items
router.get('/', async (req, res) => {
  try {
    const { category, available } = req.query;
    const db = getClient();

    let sql = 'SELECT * FROM menu_items';
    const conditions = [];
    const params = [];

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (available !== undefined) {
      conditions.push('is_available = ?');
      params.push(available === 'true' ? 1 : 0);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY sort_order ASC, name ASC';

    const items = db.prepare(sql).all(...params);
    res.json(items);
  } catch (error) {
    console.error('Fehler beim Abrufen der Speisekarte:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Speisekarte' });
  }
});

// GET /api/menu/categories - Get all categories
router.get('/categories', async (req, res) => {
  try {
    const db = getClient();
    const result = db.prepare('SELECT DISTINCT category FROM menu_items WHERE is_available = 1 ORDER BY category').all();
    res.json(result.map(r => r.category));
  } catch (error) {
    console.error('Fehler beim Abrufen der Kategorien:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Kategorien' });
  }
});

export { router as menuRouter };
