const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

// GET /api/purchases
router.get('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const purchases = db.prepare(`
      SELECT p.*, s.name as supplier_name, u.name as user_name 
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `).all();
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/purchases/:id
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const purchase = db.prepare(`
      SELECT p.*, s.name as supplier_name, u.name as user_name 
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(req.params.id);
    
    if (!purchase) return res.status(404).json({ error: 'Compra no encontrada' });
    
    const items = db.prepare(`
      SELECT pi.*, pr.name as product_name, pr.barcode
      FROM purchase_items pi
      LEFT JOIN products pr ON pi.product_id = pr.id
      WHERE pi.purchase_id = ?
    `).all(purchase.id);
    
    purchase.items = items;
    res.json(purchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/purchases
router.post('/', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { supplier_id, items, payment_method, notes } = req.body;
    
    if (!supplier_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Proveedor y productos requeridos' });
    }

    let subtotal = 0;
    for (const item of items) {
      subtotal += item.quantity * item.unit_cost;
    }
    const total = subtotal; // Assuming no tax implementation for simplicity, or it could be added.

    // Generate purchase number
    const today = new Date();
    const prefix = `COMP-${today.getFullYear()}${(today.getMonth()+1).toString().padStart(2,'0')}${today.getDate().toString().padStart(2,'0')}-`;
    const lastPurchase = db.prepare(`SELECT purchase_number FROM purchases WHERE purchase_number LIKE ? ORDER BY id DESC LIMIT 1`).get(`${prefix}%`);
    let seq = 1;
    if (lastPurchase) {
      seq = parseInt(lastPurchase.purchase_number.split('-')[2]) + 1;
    }
    const purchase_number = `${prefix}${seq.toString().padStart(4, '0')}`;

    db.exec('BEGIN TRANSACTION');

    const insertPurchase = db.prepare(`
      INSERT INTO purchases (purchase_number, supplier_id, user_id, subtotal, total, payment_method, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const purchaseResult = insertPurchase.run(purchase_number, supplier_id, req.user.id, subtotal, total, payment_method, notes);
    const purchaseId = purchaseResult.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_cost, total)
      VALUES (?, ?, ?, ?, ?)
    `);

    const updateProductStock = db.prepare(`
      UPDATE products SET stock = stock + ?, cost_price = ?, updated_at = datetime('now') WHERE id = ?
    `);

    const logStockMovement = db.prepare(`
      INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reference, notes, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      const itemTotal = item.quantity * item.unit_cost;
      insertItem.run(purchaseId, item.product_id, item.quantity, item.unit_cost, itemTotal);

      // Get previous stock
      const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(item.product_id);
      const prevStock = product ? product.stock : 0;
      const newStock = prevStock + item.quantity;

      // Update product stock and cost
      updateProductStock.run(item.quantity, item.unit_cost, item.product_id);

      // Log movement
      logStockMovement.run(item.product_id, 'purchase', item.quantity, prevStock, newStock, purchase_number, 'Ingreso por compra', req.user.id);
    }

    // Handle account payable if credit
    if (payment_method === 'credit') {
      db.prepare(`
        INSERT INTO accounts_payable (supplier_id, purchase_id, amount, balance, status)
        VALUES (?, ?, ?, ?, 'active')
      `).run(supplier_id, purchaseId, total, total);
    }

    // Audit log
    db.prepare('INSERT INTO activity_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)').run(
      req.user.id, 'create_purchase', 'purchase', purchaseId, `Compra ${purchase_number} por $${total.toFixed(2)}`
    );

    db.exec('COMMIT');
    saveDb();
    
    res.status(201).json({ id: purchaseId, message: 'Compra registrada con éxito' });
  } catch (err) {
    const db = getDb();
    if (db.inTransaction) db.exec('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// GET /api/purchases/payables/list
router.get('/payables/list', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const payables = db.prepare(`
      SELECT ap.*, s.name as supplier_name, p.purchase_number 
      FROM accounts_payable ap
      JOIN suppliers s ON ap.supplier_id = s.id
      JOIN purchases p ON ap.purchase_id = p.id
      WHERE ap.status = 'active' OR ap.balance > 0
      ORDER BY ap.created_at ASC
    `).all();
    res.json(payables);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/purchases/payables/:id/pay
router.post('/payables/:id/pay', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { amount, payment_method, reference, notes } = req.body;
    
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Monto inválido' });

    db.exec('BEGIN TRANSACTION');

    const payable = db.prepare('SELECT * FROM accounts_payable WHERE id = ?').get(req.params.id);
    if (!payable) {
      db.exec('ROLLBACK');
      return res.status(404).json({ error: 'Cuenta por pagar no encontrada' });
    }

    if (payable.balance < amount) {
      db.exec('ROLLBACK');
      return res.status(400).json({ error: 'El monto es mayor al saldo deudor' });
    }

    const newBalance = payable.balance - amount;
    const status = newBalance <= 0 ? 'paid' : 'active';

    db.prepare(`UPDATE accounts_payable SET balance = ?, status = ? WHERE id = ?`).run(newBalance, status, payable.id);

    db.prepare(`
      INSERT INTO payable_payments (account_payable_id, amount, payment_method, reference, notes, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(payable.id, amount, payment_method, reference, notes, req.user.id);

    db.prepare('INSERT INTO activity_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)').run(
      req.user.id, 'payable_payment', 'payable', payable.id, `Abono de $${amount.toFixed(2)}`
    );

    db.exec('COMMIT');
    saveDb();

    res.json({ message: 'Pago registrado con éxito', balance: newBalance });
  } catch (err) {
    const db = getDb();
    if (db.inTransaction) db.exec('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
