import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import winston from 'winston';
import { initializeDatabase } from './database/init-sqlite.js';
import { ordersRouter } from './routes/orders.js';
import { reservationsRouter } from './routes/reservations.js';
import { telegramRouter } from './routes/telegram.js';
import { menuRouter } from './routes/menu.js';
import { configRouter } from './routes/config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { TelegramBotService } from './services/telegramBot.js';

dotenv.config();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Zu viele Anfragen, bitte versuchen Sie es spaeter.' }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    body: req.body && Object.keys(req.body).length > 0 ? '[data]' : undefined
  });
  next();
});

// Routes
app.use('/api/orders', ordersRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/telegram', telegramRouter);
app.use('/api/menu', menuRouter);
app.use('/api/config', configRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: 'SQLite'
  });
});

// Error handler
app.use(errorHandler);

// Initialize and start server
async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    logger.info('Datenbank erfolgreich initialisiert (SQLite)');

    // Initialize Telegram Bot (optional, won't crash if no token)
    try {
      const telegramBot = new TelegramBot();
      await telegramBot.initialize();
      logger.info('Telegram Bot initialisiert');
    } catch (telegramError) {
      logger.info('Telegram Bot skipped (no token configured)');
    }

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server laeuft auf Port ${PORT}`);
      logger.info(`API: http://localhost:${PORT}/api`);
      logger.info(`Gesundheitscheck: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error('Fehler beim Starten des Servers:', error);
    process.exit(1);
  }
}

startServer();

export { app, logger };
