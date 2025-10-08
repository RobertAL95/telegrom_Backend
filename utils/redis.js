// utils/redis.js
'use strict';

const Redis = require('ioredis');

// Conexión usando la variable REDIS_URL definida en Docker o fallback local
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// Eventos de conexión
redis.on('connect', () => {
  console.log('✅ Conectado a Redis');
});

redis.on('ready', () => {
  console.log('✅ Redis listo para operaciones');
});

redis.on('error', (err) => {
  console.error('❌ Error en Redis:', err);
});

redis.on('close', () => {
  console.warn('⚠️ Conexión a Redis cerrada');
});

redis.on('reconnecting', (delay) => {
  console.log(`🔄 Reintentando conexión a Redis en ${delay}ms`);
});

module.exports = redis;
