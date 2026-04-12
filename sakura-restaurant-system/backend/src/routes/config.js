import express from 'express';

const router = express.Router();

// GET /api/config - Get public configuration
router.get('/', (req, res) => {
  res.json({
    restaurant: {
      name: process.env.RESTAURANT_NAME || 'Sakura Restaurant',
      address: process.env.RESTAURANT_ADDRESS || '',
      phone: process.env.RESTAURANT_PHONE || '',
      email: process.env.RESTAURANT_EMAIL || ''
    },
    openingHours: {
      mon: process.env.OPENING_HOURS_MON || '11:00-15:00,17:00-22:00',
      tue: process.env.OPENING_HOURS_TUE || '11:00-15:00,17:00-22:00',
      wed: process.env.OPENING_HOURS_WED || '11:00-15:00,17:00-22:00',
      thu: process.env.OPENING_HOURS_THU || '11:00-15:00,17:00-22:00',
      fri: process.env.OPENING_HOURS_FRI || '11:00-15:00,17:00-22:00',
      sat: process.env.OPENING_HOURS_SAT || '11:00-15:00,17:00-22:00',
      sun: process.env.OPENING_HOURS_SUN || '17:00-22:00'
    }
  });
});

export { router as configRouter };
