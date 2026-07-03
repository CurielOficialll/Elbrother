const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db = null;
let dbPath = '';

async function initConnection() {
  const defaultDbDir = path.join(__dirname, '..', '..', 'data');
  const requestedPath = process.env.DB_PATH || path.join(defaultDbDir, 'elbrother.db');

  // If already connected to the same database, reuse the connection
  if (db && dbPath === requestedPath) return db;

  // If connected to a different database, close it first
  if (db && dbPath !== requestedPath) {
    console.log(`[DB] Cambiando base de datos de "${dbPath}" a "${requestedPath}"`);
    try { db.close(); } catch (e) {}
    db = null;
  }

  dbPath = requestedPath;
  
  const targetDir = path.dirname(dbPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // better-sqlite3 writes directly to disk synchronously and safely.
  db = new Database(dbPath);

  // Performance settings
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('temp_store = MEMORY');

  console.log(`[DB] Conectado a: ${dbPath}`);
  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initConnection() first.');
  return db;
}

function saveDb() {
  // better-sqlite3 writes to disk immediately. 
  // This is kept as a no-op so we don't break existing code calling saveDb().
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { initConnection, getDb, closeDb, saveDb, getDbPath: () => dbPath };
