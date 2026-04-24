const express = require('express');
const router = express.Router();
const { getDb } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

// GET /api/reports/dashboard
router.get('/dashboard', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const today = db.prepare("SELECT COALESCE(SUM(total),0) as total, COUNT(*) as count FROM sales WHERE status='completed' AND created_at >= date('now')").get();
    const yesterday = db.prepare("SELECT COALESCE(SUM(total),0) as total FROM sales WHERE status='completed' AND created_at >= date('now','-1 day') AND created_at < date('now')").get();
    const week = db.prepare("SELECT COALESCE(SUM(total),0) as total, COUNT(*) as count FROM sales WHERE status='completed' AND created_at >= date('now','-7 days')").get();
    const month = db.prepare("SELECT COALESCE(SUM(total),0) as total, COUNT(*) as count FROM sales WHERE status='completed' AND created_at >= date('now','start of month')").get();
    const lowStock = db.prepare("SELECT COUNT(*) as count FROM products WHERE active=1 AND stock <= min_stock").get();
    const totalProducts = db.prepare("SELECT COUNT(*) as count FROM products WHERE active=1").get();
    const totalClients = db.prepare("SELECT COUNT(*) as count FROM clients WHERE active=1").get();
    const activeDebts = db.prepare("SELECT COALESCE(SUM(balance),0) as total, COUNT(*) as count FROM credits WHERE status='active'").get();
    const bcvRate = db.prepare("SELECT value FROM system_config WHERE key='bcv_rate'").get();
    const recentSales = db.prepare("SELECT s.*, u.name as user_name FROM sales s LEFT JOIN users u ON s.user_id = u.id WHERE s.status != 'voided' ORDER BY s.created_at DESC LIMIT 5").all();
    const lowStockProducts = db.prepare("SELECT id, name, stock, min_stock FROM products WHERE active=1 AND stock <= min_stock ORDER BY stock ASC LIMIT 5").all();
    let topProducts = [];
    try { topProducts = db.prepare("SELECT p.name, SUM(si.quantity) as total_qty, SUM(si.total) as total_amount FROM sale_items si JOIN products p ON si.product_id = p.id JOIN sales s ON si.sale_id = s.id WHERE s.status='completed' GROUP BY si.product_id ORDER BY total_qty DESC LIMIT 10").all(); } catch(e) {}
    const pctChange = yesterday.total > 0 ? (((today.total - yesterday.total) / yesterday.total) * 100).toFixed(1) : 0;

    res.json({
      sales_today: { total: today.total, count: today.count, pct_change: parseFloat(pctChange) },
      sales_today_bs: today.total * parseFloat(bcvRate?.value || 36.5),
      sales_week: week,
      sales_month: month,
      low_stock: lowStock.count,
      total_products: totalProducts.count,
      total_clients: totalClients.count,
      active_debts: activeDebts,
      bcv_rate: parseFloat(bcvRate?.value || 36.5),
      recent_sales: recentSales,
      low_stock_products: lowStockProducts,
      top_products: topProducts
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/sales-by-period
router.get('/sales-by-period', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { period } = req.query; // daily, weekly, monthly
    let groupBy = "date(created_at)";
    let dateFilter = "created_at >= date('now', '-30 days')";
    if (period === 'weekly') { groupBy = "strftime('%Y-%W', created_at)"; dateFilter = "created_at >= date('now', '-12 weeks')"; }
    if (period === 'monthly') { groupBy = "strftime('%Y-%m', created_at)"; dateFilter = "created_at >= date('now', '-12 months')"; }
    const data = db.prepare(`SELECT ${groupBy} as period, SUM(total) as total, COUNT(*) as count FROM sales WHERE status='completed' AND ${dateFilter} GROUP BY ${groupBy} ORDER BY period`).all();
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/sales-by-payment
router.get('/sales-by-payment', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const data = db.prepare("SELECT payment_method, SUM(total) as total, COUNT(*) as count FROM sales WHERE status='completed' AND created_at >= date('now', '-30 days') GROUP BY payment_method ORDER BY total DESC").all();
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/top-products
router.get('/top-products', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { startDate, endDate } = req.query;
    
    let query = `
      SELECT p.name, SUM(si.quantity) as total_qty, SUM(si.total) as total_amount 
      FROM sale_items si 
      JOIN products p ON si.product_id = p.id 
      JOIN sales s ON si.sale_id = s.id 
      WHERE s.status='completed'
    `;
    
    const params = [];
    if (startDate && endDate) {
      query += ` AND s.created_at BETWEEN ? AND ?`;
      params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    } else {
      query += ` AND s.created_at >= date('now','-30 days')`;
    }
    
    query += ` GROUP BY si.product_id ORDER BY total_qty DESC LIMIT 10`;
    
    const data = db.prepare(query).all(...params);
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/inventory-value
router.get('/inventory-value', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const data = db.prepare("SELECT SUM(stock * cost_price) as cost_value, SUM(stock * sell_price) as retail_value, COUNT(*) as total_products, SUM(stock) as total_units FROM products WHERE active=1").get();
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/weekly-trend
router.get('/weekly-trend', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const data = db.prepare(`SELECT strftime('%w', created_at) as dow, COALESCE(SUM(total), 0) as total FROM sales WHERE status='completed' AND created_at >= date('now', '-7 days') GROUP BY dow ORDER BY dow`).all();
    const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const result = days.map((name, i) => ({ name, total: data.find(d => parseInt(d.dow) === i)?.total || 0 }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/valuation
router.get('/valuation', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const data = db.prepare("SELECT COALESCE(SUM(stock * cost_price),0) as total_cost, COALESCE(SUM(stock * sell_price),0) as total_sell, COUNT(*) as total_products, COALESCE(SUM(stock),0) as total_units FROM products WHERE active=1").get();
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/custom
router.get('/custom', authenticateToken, (req, res) => {
  try {
    const db = getDb();
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate y endDate son requeridos' });
    }

    const start = `${startDate} 00:00:00`;
    const end = `${endDate} 23:59:59`;

    const data = db.prepare(`
      SELECT 
        COALESCE(SUM(si.total), 0) as total_sales,
        COALESCE(SUM(si.quantity * si.cost_price), 0) as total_cost,
        COALESCE(SUM(si.total), 0) - COALESCE(SUM(si.quantity * si.cost_price), 0) as profit,
        COUNT(DISTINCT s.id) as count
      FROM sale_items si 
      JOIN sales s ON si.sale_id = s.id 
      WHERE s.status = 'completed' AND s.created_at BETWEEN ? AND ?
    `).get(start, end);

    res.json(data);
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

module.exports = router;
