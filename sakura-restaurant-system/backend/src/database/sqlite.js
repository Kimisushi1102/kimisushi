import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data/sakura.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

export function query(text, params = []) {
  const start = Date.now();
  try {
    const stmt = db.prepare(text);
    const result = stmt.all(...params);
    const duration = Date.now() - start;
    console.log('Query ausgefuehrt', { text: text.substring(0, 50), duration, rows: result.length });
    return { rows: result, rowCount: result.length };
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

export function queryOne(text, params = []) {
  const stmt = db.prepare(text);
  return stmt.get(...params);
}

export function run(text, params = []) {
  const stmt = db.prepare(text);
  const result = stmt.run(...params);
  return result;
}

export function getClient() {
  return db;
}

export default db;
