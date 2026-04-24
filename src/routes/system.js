const express = require('express');
const router = express.Router();
const { getDb } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
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
      db.prepare('INSERT INTO bcv_rates (rate, source) VALUES (?, ?)').run(rate, 'manual');
      db.prepare("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('bcv_rate', ?, datetime('now'))").run(String(rate));
      const io = req.app.get('io');
      if (io) io.emit('bcv:update', { rate });
      res.json({ rate, message: 'Tasa actualizada' });
    } else {
      res.status(500).json({ error: 'No se pudo obtener la tasa' });
    }
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

module.exports = router;
