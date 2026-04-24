const express = require('express');
const router = express.Router();
const { getDb } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const categories = db.prepare(`
      SELECT c.*, COUNT(p.id) as product_count 
      FROM categories c 
      LEFT JOIN products p ON p.category_id = c.id AND p.active = 1
      WHERE c.active = 1
      GROUP BY c.id 
      ORDER BY c.name
    `).all();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { name, icon, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    const result = db.prepare('INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)').run(name, icon || 'category', color || '#00E0FF');
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { name, icon, color } = req.body;
    db.prepare('UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ?').run(name, icon, color, req.params.id);
    res.json({ message: 'Categoría actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    db.prepare('UPDATE categories SET active = 0 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Categoría eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
