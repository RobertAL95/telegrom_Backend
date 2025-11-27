// utils/redis.js
'use strict';

const Redis = require('ioredis');

// ==================================================
// 🚩 Rastreo de Clientes Duplicados para el Cierre
// ==================================================
const activeClients = new Set(); 
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// ==================================================
// ⚙️ Configuración y conexión del cliente principal
// ==================================================
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, 
  enableReadyCheck: true,    
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
// 🧩 Método helper duplicado (Publisher/Subscriber/Rate Limiter)
// ==================================================
// Ahora rastreamos cada cliente duplicado
redis.createClient = () => {
    const client = redis.duplicate();
    activeClients.add(client);
    return client;
};

/**
 * 🟢 Cierra todos los clientes duplicados de Redis rastreados.
 */
redis.closeAllClients = async () => {
    const promises = [];
    for (const client of activeClients) {
        // Usamos .quit() para un cierre limpio y manejamos posibles errores.
        promises.push(client.quit().catch(e => console.error("Error cerrando cliente duplicado:", e.message)));
    }
    await Promise.all(promises);
    activeClients.clear();
    // Cerramos el cliente principal también
    await redis.quit(); 
    console.log('🔴 Todos los clientes Redis (Principal + Duplicados) cerrados.');
};

// ==================================================
module.exports = redis;