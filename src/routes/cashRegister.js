const express = require('express');
const router = express.Router();
const { getDb } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

// POST /api/cash/open - Open cash session
router.post('/open', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare("SELECT * FROM cash_sessions WHERE user_id = ? AND status = 'open'").get(req.user.id);
    if (existing) return res.status(400).json({ error: 'Ya tienes una caja abierta', session: existing });
    const { opening_amount } = req.body;
    const result = db.prepare('INSERT INTO cash_sessions (user_id, opening_amount) VALUES (?, ?)').run(req.user.id, opening_amount || 0);
    if (opening_amount > 0) {
      db.prepare('INSERT INTO cash_transactions (session_id, type, amount, reference) VALUES (?, ?, ?, ?)').run(result.lastInsertRowid, 'opening', opening_amount, 'Apertura de caja');
    }
    db.prepare('INSERT INTO activity_logs (user_id, action, entity, entity_id) VALUES (?, ?, ?, ?)').run(req.user.id, 'open_cash', 'cash_session', result.lastInsertRowid);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Caja abierta' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/cash/close - Close cash session
router.post('/close', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const session = db.prepare("SELECT * FROM cash_sessions WHERE user_id = ? AND status = 'open' ORDER BY opened_at DESC LIMIT 1").get(req.user.id);
    if (!session) return res.status(400).json({ error: 'No hay caja abierta' });
    const { closing_amount, notes } = req.body;

    // Calculate expected amount
    const salesTotal = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM cash_transactions WHERE session_id = ? AND type = 'sale'").get(session.id);
    const creditsTotal = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM cash_transactions WHERE session_id = ? AND type = 'credit_payment'").get(session.id);
    const expectedAmount = (session.opening_amount || 0) + (salesTotal?.total || 0) + (creditsTotal?.total || 0);
    const difference = (closing_amount || 0) - expectedAmount;

    db.prepare("UPDATE cash_sessions SET closing_amount = ?, expected_amount = ?, difference = ?, status = 'closed', notes = ?, closed_at = datetime('now') WHERE id = ?").run(closing_amount || 0, expectedAmount, difference, notes || null, session.id);
    db.prepare('INSERT INTO activity_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)').run(req.user.id, 'close_cash', 'cash_session', session.id, `Diferencia: $${difference.toFixed(2)}`);

    res.json({ message: 'Caja cerrada', expected: expectedAmount, closing: closing_amount, difference });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/cash/current - Get current open session
router.get('/current', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const session = db.prepare("SELECT * FROM cash_sessions WHERE user_id = ? AND status = 'open' ORDER BY opened_at DESC LIMIT 1").get(req.user.id);
    if (!session) return res.json({ open: false });
    const transactions = db.prepare('SELECT * FROM cash_transactions WHERE session_id = ? ORDER BY created_at DESC').all(session.id);
    const totals = db.prepare("SELECT type, SUM(amount) as total FROM cash_transactions WHERE session_id = ? GROUP BY type").all(session.id);
    res.json({ open: true, session, transactions, totals });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/cash/history
router.get('/history', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const sessions = db.prepare(`SELECT cs.*, u.name as user_name FROM cash_sessions cs LEFT JOIN users u ON cs.user_id = u.id ORDER BY cs.opened_at DESC LIMIT 30`).all();
    res.json(sessions);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/cash/transaction/:id - Delete a specific movement
router.delete('/transaction/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    
    db.transaction(() => {
      const trx = db.prepare('SELECT * FROM cash_transactions WHERE id = ?').get(req.params.id);
      if (!trx) throw new Error('Movimiento no encontrado');
      
      const session = db.prepare('SELECT status FROM cash_sessions WHERE id = ?').get(trx.session_id);
      if (session && session.status !== 'open') {
        throw new Error('No se pueden eliminar movimientos de una caja que ya está cerrada');
      }

      // If it's an opening transaction, reset opening_amount in session
      if (trx.type === 'opening') {
         db.prepare('UPDATE cash_sessions SET opening_amount = 0 WHERE id = ?').run(trx.session_id);
      }

      db.prepare('DELETE FROM cash_transactions WHERE id = ?').run(trx.id);
      
      db.prepare('INSERT INTO activity_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)').run(
        req.user.id, 'delete_cash_trx', 'cash_transaction', trx.id, `Eliminado mov. ${trx.type} por $${trx.amount.toFixed(2)}`
      );
    })();
    
    res.json({ message: 'Movimiento eliminado correctamente' });
  } catch (err) { 
    res.status(400).json({ error: err.message }); 
  }
});

// DELETE /api/cash/session/:id - Delete a cash session
router.delete('/session/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    
    db.transaction(() => {
      const session = db.prepare('SELECT * FROM cash_sessions WHERE id = ?').get(req.params.id);
      if (!session) throw new Error('Sesión no encontrada');
      if (session.status === 'open') throw new Error('No se puede eliminar una sesión abierta');

      // Set session_id to null in sales to avoid foreign key issues
      db.prepare('UPDATE sales SET session_id = NULL WHERE session_id = ?').run(session.id);
      
      // Delete associated cash_transactions
      db.prepare('DELETE FROM cash_transactions WHERE session_id = ?').run(session.id);

      // Delete the session
      db.prepare('DELETE FROM cash_sessions WHERE id = ?').run(session.id);
      
      db.prepare('INSERT INTO activity_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)').run(
        req.user.id, 'delete_cash_session', 'cash_session', session.id, `Sesión eliminada`
      );
    })();
    
    res.json({ message: 'Sesión eliminada correctamente' });
  } catch (err) { 
    res.status(400).json({ error: err.message }); 
  }
});

module.exports = router;
