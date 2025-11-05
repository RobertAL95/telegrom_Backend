'use strict';

const Redis = require('ioredis');

// ==================================================
// ⚙️ Configuración y conexión
// ==================================================
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Configuración recomendada para entornos efímeros (Fly.io, Docker, local)
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // evita errores "Unhandled promise rejection"
  enableReadyCheck: true,     // valida conexión antes de marcar como lista
  reconnectOnError: (err) => {
    const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNRESET'];
    const shouldReconnect = targetErrors.some(e => err.message.includes(e));
    if (shouldReconnect) {
      console.warn('🔄 Reintentando conexión Redis por error:', err.message);
    }
    return shouldReconnect;
  },
  retryStrategy: (times) => {
    const delay = Math.min(times * 100, 3000);
    console.log(`⏳ Intento de reconexión Redis #${times}, reintentando en ${delay}ms`);
    return delay;
  },
});

// ==================================================
// 🧠 Eventos de diagnóstico
// ==================================================
redis.on('connect', () => console.log('✅ Conectado a Redis'));
redis.on('ready', () => console.log('✅ Redis listo para operaciones'));
redis.on('error', (err) => console.error('❌ Redis error:', err.message));
redis.on('close', () => console.warn('⚠️ Conexión a Redis cerrada'));
redis.on('reconnecting', () => console.log('🔄 Reintentando conexión Redis...'));

// ==================================================
// 🧩 Método helper duplicado (Publisher/Subscriber)
// ==================================================
redis.createClient = () => redis.duplicate();

// ==================================================
module.exports = redis;
