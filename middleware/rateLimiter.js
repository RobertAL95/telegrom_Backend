// middlewares/rateLimiter.js
'use strict';

const rateLimit = require('express-rate-limit');
const RedisStore = require('@rate-limit/redis').RedisStore;
const redis = require('../../utils/redis'); // Tu cliente ioredis

// ===================================================
// 1. Cliente de Redis para el Store
// ===================================================
// Usamos el cliente duplicado para evitar conflictos con Pub/Sub o sesiones
const redisClient = redis.createClient();

// ===================================================
// 2. Limitador de Tráfico Público (IP-Based)
// ===================================================
const publicLimiter = rateLimit({
    // Contador distribuido usando Redis
    store: new RedisStore({ 
        sendCommand: (...args) => redisClient.call(...args),
        // Puedes configurar un prefijo para distinguir las claves de limitación de tasa
        prefix: 'rl:public:', 
    }),

    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Máximo 100 peticiones por ventana (por IP)
    standardHeaders: true, // Incluye headers RateLimit-* en la respuesta
    legacyHeaders: false, // Deshabilita X-RateLimit-* headers
    message: {
        ok: false,
        message: 'Demasiadas solicitudes, inténtalo más tarde. Límite: 100 por 15 minutos.',
    },
});

// ===================================================
// 3. Limitador Estricto para Login/Registro (IP-Based)
// ===================================================
const authStrictLimiter = rateLimit({
    store: new RedisStore({ 
        sendCommand: (...args) => redisClient.call(...args),
        prefix: 'rl:auth:',
    }),
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 5, // Máximo 5 peticiones por ventana (por IP)
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        ok: false,
        message: 'Demasiados intentos de autenticación. Espera 5 minutos.',
    },
});

// ===================================================
// 4. Limitador por Usuario (User-Based)
// ===================================================
// Esto se usa en rutas protegidas donde el usuario está logueado (req.user existe)
const userLimiter = rateLimit({
    store: new RedisStore({ 
        sendCommand: (...args) => redisClient.call(...args),
        prefix: 'rl:user:',
    }),
    windowMs: 60 * 1000, // 1 minuto
    max: 30, // Máximo 30 peticiones por minuto (por usuario)
    keyGenerator: (req, res) => {
        // Usa el ID del usuario si está disponible, si no, usa la IP.
        return req.user?.id || req.ip; 
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    publicLimiter,
    authStrictLimiter,
    userLimiter,
};