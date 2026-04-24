const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

let db = null;
let dbPath = '';

async function initConnection() {
  if (db) return db;

  const defaultDbDir = path.join(__dirname, '..', '..', 'data');
  dbPath = process.env.DB_PATH || path.join(defaultDbDir, 'elbrother.db');
  
  const targetDir = path.dirname(dbPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Performance settings
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA synchronous = NORMAL');
  db.run('PRAGMA foreign_keys = ON');
  db.run('PRAGMA temp_store = MEMORY');

  // Auto-save every 30 seconds
  setInterval(() => saveDb(), 30000);

  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initConnection() first.');
  return db;
}

function saveDb() {
  if (db && dbPath) {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      
      const tmpPath = dbPath + '.tmp';
      const backupDir = path.join(path.dirname(dbPath), 'backups');
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Escritura atómica garantizada (fsync) para evitar corrupción si se va la luz
      const fd = fs.openSync(tmpPath, 'w');
      fs.writeSync(fd, buffer, 0, buffer.length, 0);
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      
      // Rotación de backups
      if (fs.existsSync(dbPath)) {
        const bak1 = path.join(backupDir, 'elbrother.bak1');
        const bak2 = path.join(backupDir, 'elbrother.bak2');
        const bak3 = path.join(backupDir, 'elbrother.bak3');
        
        if (fs.existsSync(bak2)) fs.renameSync(bak2, bak3);
        if (fs.existsSync(bak1)) fs.renameSync(bak1, bak2);
        fs.copyFileSync(dbPath, bak1);
      }

      // Reemplazo atómico final
      fs.renameSync(tmpPath, dbPath);
    } catch (e) {
      console.error('[DB] Error saving:', e.message);
    }
  }
}

function closeDb() {
  if (db) {
    saveDb();
    db.close();
    db = null;
  }
}

let inTransaction = false;

// Wrapper to make sql.js feel like better-sqlite3
function prepare(sql) {
  return {
    run(...params) {
      const stmt = db.prepare(sql);
      if (params.length) stmt.bind(params);
      stmt.step();
      stmt.free();
      const lastId = db.exec('SELECT last_insert_rowid()')[0]?.values[0][0];
      const changes = db.getRowsModified();
      if (!inTransaction) saveDb();
      return { lastInsertRowid: lastId, changes };
    },
    get(...params) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      if (stmt.step()) {
        const cols = stmt.getColumnNames();
        const vals = stmt.get();
        stmt.free();
        const row = {};
        cols.forEach((c, i) => row[c] = vals[i]);
        return row;
      }
      stmt.free();
      return undefined;
    },
    all(...params) {
      const results = [];
      const stmt = db.prepare(sql);
      stmt.bind(params);
      while (stmt.step()) {
        const cols = stmt.getColumnNames();
        const vals = stmt.get();
        const row = {};
        cols.forEach((c, i) => row[c] = vals[i]);
        results.push(row);
      }
      stmt.free();
      return results;
    }
  };
}

// Proxy that mimics better-sqlite3 API
function getDbProxy() {
  const rawDb = getDb();
  return {
    prepare: (sql) => prepare(sql),
    exec: (sql) => { rawDb.run(sql); saveDb(); },
    transaction: (fn) => {
      return (...args) => {
        inTransaction = true;
        rawDb.run('BEGIN TRANSACTION');
        try {
          const result = fn(...args);
          rawDb.run('COMMIT');
          inTransaction = false;
          saveDb();
          return result;
        } catch (e) {
          inTransaction = false;
          try { rawDb.run('ROLLBACK'); } catch(re) {}
          throw e;
        }
      };
    },
    pragma: (p) => { try { rawDb.run(`PRAGMA ${p}`); } catch(e) {} }
  };
}

module.exports = { initConnection, getDb: getDbProxy, closeDb, saveDb };
