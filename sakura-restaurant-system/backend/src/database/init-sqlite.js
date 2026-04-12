import db from './sqlite.js';

const createTablesSQL = `
-- ============================================
-- CUSTOMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    customer_id TEXT REFERENCES customers(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    total_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'neu',
    pickup_time TEXT,
    pickup_date TEXT,
    notes TEXT,
    address TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- ORDER ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id TEXT,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- RESERVATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    reservation_number TEXT UNIQUE NOT NULL,
    customer_id TEXT REFERENCES customers(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    reservation_date TEXT NOT NULL,
    reservation_time TEXT NOT NULL,
    party_size INTEGER NOT NULL DEFAULT 1,
    status TEXT DEFAULT 'neu',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- STATUS HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS status_history (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by TEXT DEFAULT 'system',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- TELEGRAM ACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS telegram_actions (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    telegram_chat_id TEXT,
    telegram_message_id INTEGER,
    response_data TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- EMAIL LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_logs (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    email_type TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    sent_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- MENU ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    description_en TEXT,
    category TEXT,
    price REAL NOT NULL,
    image_url TEXT,
    is_available INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_customer_id ON reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_status_history_entity ON status_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_entity ON email_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available);
`;

export async function initializeDatabase() {
  try {
    console.log('Initialisiere Datenbank (SQLite)...');
    db.exec(createTablesSQL);
    console.log('Datenbanktabellen erfolgreich erstellt/aktualisiert');
  } catch (error) {
    console.error('Fehler bei der Datenbankinitialisierung:', error);
    throw error;
  }
}

export default { initializeDatabase };
