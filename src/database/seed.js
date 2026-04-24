const bcrypt = require('bcryptjs');
const { getDb } = require('./connection');

function seedDatabase() {
  const db = getDb();

  // Check if already seeded
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (userCount && userCount.c > 0) {
    console.log('[SEED] Base de datos ya contiene datos, omitiendo seed');
    return;
  }

  console.log('[SEED] Sembrando datos iniciales para producción...');

  // Users
  const adminHash = bcrypt.hashSync('admin123', 10);
  const cashierHash = bcrypt.hashSync('cajero123', 10);
  db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)').run('admin@elbrother.com', adminHash, 'Administrador', 'admin');
  db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)').run('cajero@elbrother.com', cashierHash, 'Cajero Principal', 'cashier');

  // Categories (Omitidas para que el usuario ingrese las suyas)
  
  // Products (Omitidos para que el usuario ingrese los suyos)
  
  // Clients (Omitidos para que el usuario ingrese los suyos)

  // System config
  const configs = [
    ['business_name', 'Elbrother'],
    ['tax_rate', '0.16'],
    ['currency', 'USD'],
    ['bcv_rate', '36.50'],
    ['low_stock_alert', '5'],
  ];
  for (const [key, value] of configs) {
    db.prepare('INSERT OR IGNORE INTO system_config (key, value) VALUES (?, ?)').run(key, value);
  }

  // Initial BCV rate
  db.prepare('INSERT INTO bcv_rates (rate, source) VALUES (?, ?)').run(36.50, 'seed');

  console.log('[SEED] ✓ Datos base de sistema insertados');
  console.log('[SEED]   → 2 usuarios (admin@elbrother.com / admin123)');
  console.log('[SEED]   → (Inventario y clientes vacíos listos para datos reales)');
}

module.exports = { seedDatabase };
