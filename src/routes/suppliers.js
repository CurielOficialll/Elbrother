const express = require('express');
const router = express.Router();
const { getDb } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

// GET /api/suppliers
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const search = req.query.search;
    let query = 'SELECT * FROM suppliers WHERE active = 1';
    let params = [];
    
    if (search) {
      query += ' AND (name LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY name ASC';
    const suppliers = db.prepare(query).all(...params);
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/suppliers/:id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
    if (!supplier) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/suppliers
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
    
    const db = getDb();
    const stmt = db.prepare('INSERT INTO suppliers (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(name, phone, email, address, notes);
    
    res.status(201).json({ id: result.lastInsertRowid, message: 'Proveedor creado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/suppliers/:id
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    
    // Verificamos si tiene cuentas por pagar pendientes
    const payables = db.prepare('SELECT COUNT(*) as count FROM accounts_payable WHERE supplier_id = ? AND status = "active"').get(req.params.id);
    if (payables && payables.count > 0) {
      return res.status(400).json({ error: 'No se puede eliminar: el proveedor tiene cuentas por pagar pendientes.' });
    }

    const stmt = db.prepare('UPDATE suppliers SET active = 0 WHERE id = ?');
    const result = stmt.run(req.params.id);
    
    if (result.changes === 0) return res.status(404).json({ error: 'Proveedor no encontrado' });
    
    // Registrar en log
    db.prepare('INSERT INTO activity_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)').run(
      req.user.id, 'delete_supplier', 'supplier', req.params.id, `Proveedor eliminado`
    );

    res.json({ message: 'Proveedor eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
