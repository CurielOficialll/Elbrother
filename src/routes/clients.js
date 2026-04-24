const express = require('express');
const router = express.Router();
const { getDb } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

// GET /api/clients
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { search } = req.query;
    let query = `SELECT c.*, COALESCE(SUM(CASE WHEN cr.status='active' THEN cr.balance ELSE 0 END), 0) as total_debt FROM clients c LEFT JOIN credits cr ON cr.client_id = c.id WHERE c.active = 1`;
    const params = [];
    if (search) { query += ' AND (c.name LIKE ? OR c.cedula LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' GROUP BY c.id ORDER BY c.name';
    res.json(db.prepare(query).all(...params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/clients/:id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
    client.credits = db.prepare(`SELECT cr.*, s.sale_number FROM credits cr LEFT JOIN sales s ON cr.sale_id = s.id WHERE cr.client_id = ? ORDER BY cr.created_at DESC`).all(client.id);
    client.total_debt = client.credits.filter(c => c.status === 'active').reduce((s, c) => s + c.balance, 0);
    client.recent_sales = db.prepare(`SELECT * FROM sales WHERE client_id = ? ORDER BY created_at DESC LIMIT 10`).all(client.id);
    res.json(client);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/clients
router.post('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { name, cedula, phone, email, address, credit_limit, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    const result = db.prepare('INSERT INTO clients (name, cedula, phone, email, address, credit_limit, notes) VALUES (?, ?, ?, ?, ?, ?, ?)').run(name, cedula || null, phone || null, email || null, address || null, credit_limit || 50, notes || null);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Ya existe un cliente con esa cédula' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clients/:id
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { name, cedula, phone, email, address, credit_limit, notes } = req.body;
    db.prepare('UPDATE clients SET name=?, cedula=?, phone=?, email=?, address=?, credit_limit=?, notes=? WHERE id=?').run(name, cedula, phone, email, address, credit_limit, notes, req.params.id);
    res.json({ message: 'Cliente actualizado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/clients/:id
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    db.prepare('UPDATE clients SET active = 0 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Cliente eliminado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/clients/:id/pay-credit
router.post('/:id/pay-credit', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { credit_id, amount, payment_method, notes } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Monto inválido' });
    const credit = db.prepare("SELECT * FROM credits WHERE id = ? AND client_id = ? AND status = 'active'").get(credit_id, req.params.id);
    if (!credit) return res.status(404).json({ error: 'Crédito no encontrado' });
    if (amount > credit.balance) return res.status(400).json({ error: 'El monto excede la deuda' });

    db.transaction(() => {
      const newBalance = credit.balance - amount;
      db.prepare('UPDATE credits SET balance = ?, status = ? WHERE id = ?').run(newBalance, newBalance <= 0 ? 'paid' : 'active', credit_id);
      db.prepare('INSERT INTO credit_payments (credit_id, amount, payment_method, notes, user_id) VALUES (?, ?, ?, ?, ?)').run(credit_id, amount, payment_method || 'cash', notes || null, req.user.id);
      const session = db.prepare("SELECT id FROM cash_sessions WHERE user_id = ? AND status = 'open' LIMIT 1").get(req.user.id);
      if (session) db.prepare('INSERT INTO cash_transactions (session_id, type, amount, payment_method, reference) VALUES (?, ?, ?, ?, ?)').run(session.id, 'credit_payment', amount, payment_method || 'cash', `Abono crédito #${credit_id}`);
    })();
    res.json({ message: 'Abono registrado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/clients/:id/credit-history
router.get('/:id/credit-history', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const payments = db.prepare(`SELECT cp.*, cr.amount as credit_amount, u.name as user_name FROM credit_payments cp JOIN credits cr ON cp.credit_id = cr.id LEFT JOIN users u ON cp.user_id = u.id WHERE cr.client_id = ? ORDER BY cp.created_at DESC`).all(req.params.id);
    res.json(payments);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/clients/:id/payment - Simple payment (pays oldest credit first)
router.post('/:id/payment', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { amount, payment_method, notes } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Monto inválido' });
    const credits = db.prepare("SELECT * FROM credits WHERE client_id = ? AND status = 'active' ORDER BY created_at ASC").all(req.params.id);
    if (!credits.length) return res.status(400).json({ error: 'El cliente no tiene deudas activas' });
    let remaining = amount;
    db.transaction(() => {
      for (const credit of credits) {
        if (remaining <= 0) break;
        const paid = Math.min(remaining, credit.balance);
        const newBal = credit.balance - paid;
        db.prepare('UPDATE credits SET balance = ?, status = ? WHERE id = ?').run(newBal, newBal <= 0 ? 'paid' : 'active', credit.id);
        db.prepare('INSERT INTO credit_payments (credit_id, amount, payment_method, notes, user_id) VALUES (?, ?, ?, ?, ?)').run(credit.id, paid, payment_method || 'cash', notes || null, req.user.id);
        remaining -= paid;
      }
    })();
    res.json({ message: 'Abono registrado', applied: amount - remaining });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
