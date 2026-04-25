const express = require('express');
const router = express.Router();
const { getDb } = require('../database/connection');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { fetchBCVRate, getCurrentRate } = require('../services/bcv');

// GET /api/system/config
router.get('/config', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const configs = db.prepare('SELECT * FROM system_config').all();
    const obj = {};
    configs.forEach(c => obj[c.key] = c.value);
    res.json(obj);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/system/config
router.put('/config', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const updates = req.body;
    db.transaction(() => {
      for (const [key, value] of Object.entries(updates)) {
        db.prepare("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES (?, ?, datetime('now'))").run(key, String(value));
      }
    })();
    res.json({ message: 'Configuración actualizada' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/system/bcv
router.get('/bcv', (req, res) => {
  try {
    const rate = getCurrentRate();
    res.json({ rate });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/system/bcv/refresh
router.post('/bcv/refresh', authenticateToken, async (req, res) => {
  try {
    const rate = await fetchBCVRate();
    if (rate) {
      const db = getDb();
      db.prepare('INSERT INTO bcv_rates (rate, source) VALUES (?, ?)').run(rate, 'bcv');
      db.prepare("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('bcv_rate', ?, datetime('now'))").run(String(rate));
      const io = req.app.get('io');
      if (io) io.emit('bcv:update', { rate });
      res.json({ rate, message: 'Tasa actualizada' });
    } else {
      res.status(500).json({ error: 'No se pudo obtener la tasa' });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/system/bcv/manual
router.post('/bcv/manual', authenticateToken, (req, res) => {
  try {
    const { rate } = req.body;
    const numRate = parseFloat(rate);
    if (!numRate || numRate <= 0) {
      return res.status(400).json({ error: 'Tasa inválida' });
    }
    const db = getDb();
    db.prepare('INSERT INTO bcv_rates (rate, source) VALUES (?, ?)').run(numRate, 'manual');
    db.prepare("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('bcv_rate', ?, datetime('now'))").run(String(numRate));
    const io = req.app.get('io');
    if (io) io.emit('bcv:update', { rate: numRate });
    res.json({ rate: numRate, message: 'Tasa manual actualizada' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/system/activity-log
router.get('/activity-log', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const logs = db.prepare(`SELECT al.*, u.name as user_name FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id ORDER BY al.created_at DESC LIMIT 100`).all();
    res.json(logs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/system/reset-production
router.post('/reset-production', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { saveDb } = require('../database/connection');

    db.transaction(() => {
      // 1. Eliminar ventas y sus detalles
      db.prepare('DELETE FROM sale_items').run();
      db.prepare('DELETE FROM sales').run();
      
      // 2. Eliminar movimientos de inventario
      db.prepare('DELETE FROM stock_movements').run();
      
      // 3. Eliminar sesiones de caja y sus transacciones
      db.prepare('DELETE FROM cash_transactions').run();
      db.prepare('DELETE FROM cash_sessions').run();
      
      // 4. Eliminar créditos y pagos de clientes
      db.prepare('DELETE FROM credit_payments').run();
      db.prepare('DELETE FROM credits').run();
      
      // 5. Eliminar compras y sus detalles
      db.prepare('DELETE FROM purchase_items').run();
      db.prepare('DELETE FROM purchases').run();
      
      // 6. Eliminar cuentas por pagar a proveedores
      db.prepare('DELETE FROM payable_payments').run();
      db.prepare('DELETE FROM accounts_payable').run();
      
      // 7. Limpiar logs de actividad del sistema
      db.prepare('DELETE FROM activity_logs').run();

      // 8. Reiniciar los contadores de ID
      const tables = [
          'sales', 'sale_items', 'stock_movements', 'cash_sessions', 
          'cash_transactions', 'credits', 'credit_payments', 
          'purchases', 'purchase_items', 'accounts_payable', 
          'payable_payments', 'activity_logs'
      ];
      for (const table of tables) {
          db.prepare("DELETE FROM sqlite_sequence WHERE name = ?").run(table);
      }

      // 9. Resetear el stock de todos los productos a 0
      db.prepare('UPDATE products SET stock = 0').run();
    })();

    saveDb();
    res.json({ message: 'Sistema reseteado para producción correctamente' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
