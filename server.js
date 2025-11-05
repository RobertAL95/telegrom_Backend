'use strict';
require('dotenv').config();

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const config = require('./config');
const routes = require('./network/routes');
const { initWebSocket } = require('./webSocket/index');

// ===================================================
// ⚙️ Configuración base
// ===================================================
const app = express();
const server = http.createServer(app);
const PORT = config.port || 4000;

// ===================================================
// 🍃 Conexión MongoDB con robustez adicional
// ===================================================
(async () => {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(config.mongoURI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB conectado');
  } catch (err) {
    console.error('❌ Error conectando a MongoDB:', err.message);
    process.exit(1);
  }
})();

// ===================================================
// 🧩 Middlewares globales
// ===================================================
app.set('trust proxy', 1); // necesario para Fly.io, Vercel o proxies
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(compression()); // ⚡ mejora rendimiento de respuestas
app.use(helmet({ crossOriginResourcePolicy: false })); // compatibilidad con CORS

// ===================================================
// 🌐 Configuración CORS
// ===================================================
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ===================================================
// 🚦 Rate Limiter
// ===================================================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    ok: false,
    message: 'Demasiadas solicitudes, inténtalo más tarde.',
  },
});
app.use(limiter);

// ===================================================
// 🧠 Rutas principales
// ===================================================
app.use('/', routes);

// ===================================================
// 🩺 Endpoint de healthcheck (para Fly.io / monitoring)
// ===================================================
app.get('/health', (req, res) => {
  res.status(200).json({
    ok: true,
    uptime: process.uptime(),
    env: config.nodeEnv,
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// ===================================================
// ⚡ Inicializar WebSocket efímero
// ===================================================
initWebSocket(server);

// ===================================================
// 🚀 Lanzar servidor HTTP + WS
// ===================================================
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor backend corriendo en puerto ${PORT}`);
  console.log(`🌐 Acceso: http://localhost:${PORT}`);
  console.log(`🟢 CORS permitido desde: ${config.frontendUrl}`);
});

// ===================================================
// 🧹 Manejo de errores no capturados
// ===================================================
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Rechazo no manejado:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('❌ Excepción no capturada:', err);
  process.exit(1);
});
