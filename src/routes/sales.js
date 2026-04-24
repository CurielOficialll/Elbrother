const express = require('express');
const router = express.Router();
const { getDb } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const { getCurrentRate } = require('../services/bcv');

// POST /api/sales - Process a sale
router.post('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { items, payment_method, client_id, notes } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'Se requiere al menos un producto' });

    const bcvRate = getCurrentRate();
    const taxRate = parseFloat(db.prepare("SELECT value FROM system_config WHERE key = 'tax_rate'").get()?.value || '0.16');
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countToday = db.prepare("SELECT COUNT(*) as c FROM sales WHERE created_at >= date('now')").get().c;
    const saleNumber = `TRX-${today}-${String(countToday + 1).padStart(4, '0')}`;
    const session = db.prepare("SELECT id FROM cash_sessions WHERE user_id = ? AND status = 'open' ORDER BY opened_at DESC LIMIT 1").get(req.user.id);

    const processSale = db.transaction(() => {
      let subtotal = 0;
      const saleItems = [];
      for (const item of items) {
        const product = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(item.product_id);
        if (!product) throw new Error(`Producto ${item.product_id} no encontrado`);
        if (product.stock < item.quantity) throw new Error(`Stock insuficiente para ${product.name}`);
        const itemTotal = product.sell_price * item.quantity;
        subtotal += itemTotal;
        saleItems.push({ ...item, product, unit_price: product.sell_price, cost_price: product.cost_price, total: itemTotal });
      }
      const tax = Math.round(subtotal * taxRate * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;
      const totalBs = Math.round(total * bcvRate * 100) / 100;
      const status = payment_method === 'credit' ? 'credit' : 'completed';

      const saleResult = db.prepare(`INSERT INTO sales (sale_number, user_id, client_id, session_id, subtotal, tax, total, total_bs, payment_method, bcv_rate, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(saleNumber, req.user.id, client_id || null, session?.id || null, subtotal, tax, total, totalBs, payment_method, bcvRate, status, notes || null);
      const saleId = saleResult.lastInsertRowid;

      for (const item of saleItems) {
        db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, cost_price, total) VALUES (?, ?, ?, ?, ?, ?)').run(saleId, item.product_id, item.quantity, item.unit_price, item.cost_price, item.total);
        const newStock = item.product.stock - item.quantity;
        db.prepare("UPDATE products SET stock = ?, updated_at = datetime('now') WHERE id = ?").run(newStock, item.product_id);
        db.prepare("INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reference, user_id) VALUES (?, 'out', ?, ?, ?, ?, ?)").run(item.product_id, item.quantity, item.product.stock, newStock, `Venta ${saleNumber}`, req.user.id);
      }
      if (session?.id) db.prepare('INSERT INTO cash_transactions (session_id, type, amount, payment_method, reference) VALUES (?, ?, ?, ?, ?)').run(session.id, 'sale', total, payment_method, saleNumber);
      if (payment_method === 'credit' && client_id) db.prepare('INSERT INTO credits (client_id, sale_id, amount, balance) VALUES (?, ?, ?, ?)').run(client_id, saleId, total, total);
      db.prepare('INSERT INTO activity_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)').run(req.user.id, 'sale', 'sale', saleId, `Venta ${saleNumber}: $${total.toFixed(2)}`);
      return { id: saleId, sale_number: saleNumber, subtotal, tax, total, total_bs: totalBs, payment_method, items: saleItems.length };
    });

    const sale = processSale();
    const io = req.app.get('io');
    if (io) io.emit('sale:new', sale);
    res.status(201).json(sale);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/sales
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { from, to, limit } = req.query;
    let query = `SELECT s.*, u.name as user_name, c.name as client_name FROM sales s LEFT JOIN users u ON s.user_id = u.id LEFT JOIN clients c ON s.client_id = c.id WHERE 1=1`;
    const params = [];
    if (from) { query += ' AND s.created_at >= ?'; params.push(from); }
    if (to) { query += ' AND s.created_at <= ?'; params.push(to); }
    query += ' ORDER BY s.created_at DESC LIMIT ?';
    params.push(parseInt(limit) || 50);
    res.json(db.prepare(query).all(...params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/sales/:id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const sale = db.prepare(`SELECT s.*, u.name as user_name, c.name as client_name FROM sales s LEFT JOIN users u ON s.user_id = u.id LEFT JOIN clients c ON s.client_id = c.id WHERE s.id = ?`).get(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
    sale.items = db.prepare(`SELECT si.*, p.name as product_name, p.barcode FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?`).all(sale.id);
    res.json(sale);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/sales/:id/void
router.post('/:id/void', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const sale = db.prepare("SELECT * FROM sales WHERE id = ? AND status = 'completed'").get(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Venta no encontrada o ya anulada' });
    db.transaction(() => {
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
      for (const item of items) {
        const p = db.prepare('SELECT stock FROM products WHERE id = ?').get(item.product_id);
        const ns = (p?.stock || 0) + item.quantity;
        db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(ns, item.product_id);
        db.prepare("INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reference, user_id) VALUES (?, 'in', ?, ?, ?, ?, ?)").run(item.product_id, item.quantity, p?.stock || 0, ns, `Anulación ${sale.sale_number}`, req.user.id);
      }
      db.prepare("UPDATE sales SET status = 'voided' WHERE id = ?").run(sale.id);
    })();
    res.json({ message: 'Venta anulada' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
