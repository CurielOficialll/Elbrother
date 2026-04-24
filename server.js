const express = require('express');
const http = require('http');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { Server } = require('socket.io');
const { initConnection } = require('./src/database/connection');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('io', io);

async function start() {
  // Init database
  await initConnection();
  const { initDatabase } = require('./src/database/schema');
  const { seedDatabase } = require('./src/database/seed');
  initDatabase();
  seedDatabase();

  // Routes
  app.use('/api/auth', require('./src/routes/auth'));
  app.use('/api/products', require('./src/routes/products'));
  app.use('/api/categories', require('./src/routes/categories'));
  app.use('/api/sales', require('./src/routes/sales'));
  app.use('/api/clients', require('./src/routes/clients'));
  app.use('/api/suppliers', require('./src/routes/suppliers'));
  app.use('/api/cash', require('./src/routes/cashRegister'));
  app.use('/api/reports', require('./src/routes/reports'));
  app.use('/api/system', require('./src/routes/system'));
  app.use('/api/purchases', require('./src/routes/purchases'));

  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // Socket.IO
  io.on('connection', (socket) => {
    try {
      const { getDb } = require('./src/database/connection');
      const db = getDb();
      const rate = db.prepare('SELECT rate FROM bcv_rates ORDER BY fetched_at DESC LIMIT 1').get();
      if (rate) socket.emit('bcv:update', { rate: rate.rate });
    } catch (e) {}
  });

  // BCV auto-update
  const { fetchBCVRate } = require('./src/services/bcv');
  async function updateBCV() {
    try {
      const rate = await fetchBCVRate();
      if (rate) {
        const { getDb } = require('./src/database/connection');
        const db = getDb();
        db.prepare('INSERT INTO bcv_rates (rate, source) VALUES (?, ?)').run(rate, 'bcv');
        db.prepare("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('bcv_rate', ?, datetime('now'))").run(String(rate));
        io.emit('bcv:update', { rate });
        console.log(`[BCV] Tasa: ${rate} Bs/$`);
      }
    } catch (e) { console.log('[BCV] Usando caché'); }
  }
  updateBCV();
  setInterval(updateBCV, 60 * 60 * 1000);

  // Start
  server.listen(PORT, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════╗');
    console.log('  ║     🔵  ELBROTHER POS v2.5.0            ║');
    console.log('  ║     Sistema de Inventario y Ventas       ║');
    console.log('  ╠══════════════════════════════════════════╣');
    console.log(`  ║     🌐  http://localhost:${PORT}            ║`);
    console.log('  ║     📦  Base de datos: SQLite            ║');
    console.log('  ║     🔒  Modo: LOCAL-FIRST                ║');
    console.log('  ╚══════════════════════════════════════════╝');
    console.log('');
  });

  // Cierre Seguro (Graceful Shutdown)
  const gracefulShutdown = () => {
    console.log('\n[SERVER] Recibida señal de apagado. Guardando datos y cerrando de forma segura...');
    try {
      const { closeDb } = require('./src/database/connection');
      closeDb();
    } catch (e) {
      console.error('[SERVER] Error al cerrar base de datos:', e);
    }
    server.close(() => {
      console.log('[SERVER] Proceso terminado correctamente.');
      process.exit(0);
    });
    
    setTimeout(() => {
      console.error('[SERVER] Cierre forzado tras timeout.');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGHUP', gracefulShutdown);
  process.on('SIGBREAK', gracefulShutdown);
  
  // En Windows, cuando se cierra la ventana de CMD de golpe, a veces solo se dispara el evento 'exit'.
  // Al hacer esto sincronamente nos aseguramos de guardar la bd antes de morir.
  process.on('exit', () => {
    try {
      const { saveDb } = require('./src/database/connection');
      saveDb();
    } catch (e) {}
  });

  process.on('uncaughtException', (err) => {
    console.error('[SERVER] Excepción no capturada:', err);
    gracefulShutdown();
  });
}

start().catch(err => {
  console.error('Error starting server:', err);
  process.exit(1);
});
