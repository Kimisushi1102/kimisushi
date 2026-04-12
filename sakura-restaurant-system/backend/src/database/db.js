import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data/sakura.db');

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

function query(text, params = []) {
  const start = Date.now();
  try {
    const stmt = db.prepare(text);
    const result = params.length > 0 ? stmt.all(...params) : stmt.all();
    const duration = Date.now() - start;
    console.log('Query ausgefuehrt', { text: text.substring(0, 50), duration, rows: result.length });
    return { rows: result, rowCount: result.length };
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
}

function run(text, params = []) {
  const stmt = db.prepare(text);
  return params.length > 0 ? stmt.run(...params) : stmt.run();
}

function getClient() {
  return db;
}

export { query, run, getClient, db };
export default db;
