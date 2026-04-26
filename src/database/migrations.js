/**
 * Sistema de Migraciones de Base de Datos
 * 
 * Permite ejecutar cambios de schema de forma ordenada y versionada.
 * Cada migración se ejecuta una sola vez y se registra en la tabla schema_version.
 * 
 * Para agregar una nueva migración:
 * 1. Agregar una entrada al array MIGRATIONS con version incrementada
 * 2. La función recibe el objeto `db` (better-sqlite3)
 * 3. La migración se ejecuta dentro de una transacción automática
 */
const { getDb } = require('./connection');

const MIGRATIONS = [
  // ──────────────────────────────────────────────
  // v1: Schema base (ya existente via schema.js)
  // ──────────────────────────────────────────────
  {
    version: 1,
    description: 'Schema base — marcador inicial',
    up(db) {
      // No-op: el schema base ya se crea en schema.js
      // Esta entrada solo marca que la versión 1 fue registrada
    }
  },

  // ──────────────────────────────────────────────
  // Agregar futuras migraciones aquí:
  // ──────────────────────────────────────────────
  // {
  //   version: 2,
  //   description: 'Agregar campo X a tabla Y',
  //   up(db) {
  //     db.exec(`ALTER TABLE products ADD COLUMN new_field TEXT DEFAULT ''`);
  //   }
  // },
];

/**
 * Inicializa la tabla de migraciones y ejecuta las pendientes
 */
function runMigrations() {
  const db = getDb();

  // Crear tabla de control de migraciones
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      description TEXT,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Obtener la versión actual
  const current = db.prepare('SELECT MAX(version) as v FROM schema_version').get();
  const currentVersion = current?.v || 0;

  // Filtrar migraciones pendientes
  const pending = MIGRATIONS.filter(m => m.version > currentVersion);

  if (pending.length === 0) {
    console.log(`[MIGRATIONS] Schema actualizado (v${currentVersion})`);
    return;
  }

  console.log(`[MIGRATIONS] ${pending.length} migracion(es) pendiente(s) (v${currentVersion} → v${pending[pending.length - 1].version})`);

  // Ejecutar cada migración en orden
  for (const migration of pending) {
    try {
      db.transaction(() => {
        migration.up(db);
        db.prepare('INSERT INTO schema_version (version, description) VALUES (?, ?)').run(
          migration.version,
          migration.description
        );
      })();
      console.log(`[MIGRATIONS] ✓ v${migration.version}: ${migration.description}`);
    } catch (err) {
      console.error(`[MIGRATIONS] ✗ Error en v${migration.version}:`, err.message);
      throw new Error(`Migración v${migration.version} falló: ${err.message}`);
    }
  }

  console.log(`[MIGRATIONS] Completado — schema en v${pending[pending.length - 1].version}`);
}

module.exports = { runMigrations };
