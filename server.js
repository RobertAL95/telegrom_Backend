'use strict';
require('dotenv').config();

// 🔥 CRÍTICO: Inicializar el logger ANTES de cualquier otro require
require('./utils/logger'); 

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const config = require('./config');
const routes = require('./network/routes');

// Importaciones de Sistemas Globales
const { initWSS, closeRedis } = require('./wsServer');
const { initSubscriber } = require('./events/dispatcher'); 
const { publicLimiter } = require('./middleware/rateLimiter'); 

// Importar los inicializadores de Handlers
const authHandlers = require('./Auth/events/handlers'); 
const chatHandlers = require('./Chat/events/handlers'); 
const inviteHandlers = require('./Invite/events/handlers'); 

// ===================================================
// ⚙️ Configuración base
// ===================================================
const app = express();
const server = http.createServer(app);
const PORT = config.port || 4000;

// ===================================================
// 🍃 Conexión MongoDB Robusta
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
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(compression());
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
  })
);

// ===================================================
// 🌐 Configuración CORS segura
// ===================================================
const allowedOrigins = [
  'http://localhost:3000',
  'https://localhost:3000',
  'http://127.0.0.1:3000', // IP para evitar bloqueos locales
  config.frontendUrl,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`🚫 CORS bloqueado para origen: ${origin}`);
        callback(new Error('Origen no permitido por CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Device'],
  })
);

// ===================================================
// 🚦 Rate Limiter
// ===================================================
app.use(publicLimiter); 

// 🔥 CORRECCIÓN APLICADA AQUÍ 🔥
// ===================================================
// 🩺 Endpoint de healthcheck (PRIMERO)
// ===================================================
// Debe ir ANTES de app.use('/', routes) para evitar que el 404 lo capture
app.get('/health', (req, res) => {
  res.status(200).json({
    ok: true,
    uptime: process.uptime(),
    env: config.nodeEnv,
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// ===================================================
// 🧠 Rutas principales (SEGUNDO)
// ===================================================
app.use('/', routes);

// ===================================================
// ⚡ Inicializar Sistemas Asíncronos
// ===================================================
authHandlers.init();    
chatHandlers.init();    
inviteHandlers.init();  
console.log('✅ Handlers de eventos registrados.'); 

initSubscriber(); 
initWSS(server);

// ===================================================
// 🚀 Lanzar servidor
// ===================================================
const runningServer = server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor backend corriendo en puerto ${PORT}`); 
  console.log(`🌐 Acceso: http://localhost:${PORT}`); 
});

// ===================================================
// 🛑 Graceful Shutdown
// ===================================================
async function gracefulShutdown(signal) {
  console.log(`\n🛑 Recibida señal ${signal}. Cerrando ordenadamente...`);
  runningServer.close(() => {
    console.log('🌑 Servidor HTTP cerrado.');
  });

  try {
    await closeRedis();
    await mongoose.connection.close(false);
    console.log('🍃 Conexión MongoDB cerrada.');
    console.log('✅ Cierre completado con éxito.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error durante el cierre:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('❌ Rechazo no manejado:', reason); 
});

process.on('uncaughtException', (err) => {
  console.error('❌ Excepción no capturada:', err);
  process.exit(1);
});