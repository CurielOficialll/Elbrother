const express = require('express');
const router = express.Router();
const { getDb } = require('../database/connection');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/products - List all products
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { search, category, low_stock, active } = req.query;
    let query = `
      SELECT p.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (p.name LIKE ? OR p.barcode LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      query += ' AND p.category_id = ?';
      params.push(category);
    }
    if (low_stock === 'true') {
      query += ' AND p.stock <= p.min_stock';
    }
    if (active !== undefined) {
      query += ' AND p.active = ?';
      params.push(active === 'true' ? 1 : 0);
    } else {
      query += ' AND p.active = 1';
    }

    query += ' ORDER BY p.name ASC';
    const products = db.prepare(query).all(...params);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/search/:term - Fast search for POS
router.get('/search/:term', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const term = req.params.term;
    const products = db.prepare(`
      SELECT id, barcode, name, sell_price, stock, unit, image_url, category_id
      FROM products 
      WHERE active = 1 AND (name LIKE ? OR barcode = ?)
      ORDER BY name ASC
      LIMIT 20
    `).all(`%${term}%`, term);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const product = db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products
router.post('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { barcode, name, category_id, supplier_id, cost_price, sell_price, stock, min_stock, unit, image_url } = req.body;

    if (!name || sell_price === undefined) {
      return res.status(400).json({ error: 'Nombre y precio son requeridos' });
    }

    const result = db.prepare(`
      INSERT INTO products (barcode, name, category_id, supplier_id, cost_price, sell_price, stock, min_stock, unit, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(barcode || null, name, category_id || null, supplier_id || null, cost_price || 0, sell_price, stock || 0, min_stock || 5, unit || 'und', image_url || null);

    // Log initial stock
    if (stock > 0) {
      db.prepare(`
        INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reference, user_id)
        VALUES (?, 'in', ?, 0, ?, 'Stock inicial', ?)
      `).run(result.lastInsertRowid, stock, stock, req.user.id);
    }

    // Price history
    db.prepare('INSERT INTO price_history (product_id, old_price, new_price, user_id) VALUES (?, 0, ?, ?)')
      .run(result.lastInsertRowid, sell_price, req.user.id);

    db.prepare('INSERT INTO activity_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, 'create', 'product', result.lastInsertRowid, `Producto creado: ${name}`);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Producto creado' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Ya existe un producto con ese código de barras' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

    const { barcode, name, category_id, supplier_id, cost_price, sell_price, stock, min_stock, unit, image_url, active } = req.body;

    // Track price change
    if (sell_price !== undefined && sell_price !== product.sell_price) {
      db.prepare('INSERT INTO price_history (product_id, old_price, new_price, user_id) VALUES (?, ?, ?, ?)')
        .run(id, product.sell_price, sell_price, req.user.id);
    }

    // Track stock change
    if (stock !== undefined && stock !== product.stock) {
      const diff = stock - product.stock;
      db.prepare(`
        INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reference, user_id)
        VALUES (?, ?, ?, ?, ?, 'Ajuste manual', ?)
      `).run(id, diff > 0 ? 'in' : 'adjust', Math.abs(diff), product.stock, stock, req.user.id);
    }

    db.prepare(`
      UPDATE products SET 
        barcode = ?, name = ?, category_id = ?, supplier_id = ?, cost_price = ?,
        sell_price = ?, stock = ?, min_stock = ?, unit = ?, image_url = ?, active = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      barcode !== undefined ? barcode : product.barcode,
      name || product.name,
      category_id !== undefined ? category_id : product.category_id,
      supplier_id !== undefined ? supplier_id : product.supplier_id,
      cost_price !== undefined ? cost_price : product.cost_price,
      sell_price !== undefined ? sell_price : product.sell_price,
      stock !== undefined ? stock : product.stock,
      min_stock !== undefined ? min_stock : product.min_stock,
      unit || product.unit,
      image_url !== undefined ? image_url : product.image_url,
      active !== undefined ? active : product.active,
      id
    );

    db.prepare('INSERT INTO activity_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, 'update', 'product', id, `Producto actualizado: ${name || product.name}`);

    res.json({ message: 'Producto actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id (soft delete)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(req.params.id);
    db.prepare('INSERT INTO activity_logs (user_id, action, entity, entity_id) VALUES (?, ?, ?, ?)')
      .run(req.user.id, 'delete', 'product', req.params.id);
    res.json({ message: 'Producto eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id/price-history
router.get('/:id/price-history', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const history = db.prepare(`
      SELECT ph.*, u.name as user_name 
      FROM price_history ph 
      LEFT JOIN users u ON ph.user_id = u.id
      WHERE ph.product_id = ? 
      ORDER BY ph.created_at DESC
    `).all(req.params.id);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id/stock-movements
router.get('/:id/stock-movements', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const movements = db.prepare(`
      SELECT sm.*, u.name as user_name
      FROM stock_movements sm
      LEFT JOIN users u ON sm.user_id = u.id
      WHERE sm.product_id = ?
      ORDER BY sm.created_at DESC
      LIMIT 50
    `).all(req.params.id);
    res.json(movements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
