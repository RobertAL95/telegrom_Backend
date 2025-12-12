// middleware/rateLimiter.js
'use strict';

const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis'); 
const redis = require('../utils/redis'); 

// ===================================================
// 1. Cliente de Redis para el Store
// ===================================================
const redisClient = redis.createClient();

// ===================================================
// 2. Limitador de Tráfico Público (IP-Based)
// ===================================================
const publicLimiter = rateLimit({
    store: new RedisStore({ 
        sendCommand: (...args) => redisClient.call(...args),
        prefix: 'rl:public:', 
    }),
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100, 
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        ok: false,
        message: 'Demasiadas solicitudes, inténtalo más tarde.',
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
    windowMs: 5 * 60 * 1000, // 5 min
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        ok: false,
        message: 'Demasiados intentos. Espera 5 minutos.',
    },
});

// ===================================================
// 4. Limitador por Usuario (User-Based)
// ===================================================
const userLimiter = rateLimit({
    store: new RedisStore({ 
        sendCommand: (...args) => redisClient.call(...args),
        prefix: 'rl:user:',
    }),
    windowMs: 60 * 1000, // 1 min
    max: 30,
    keyGenerator: (req, res) => {
        // Usa el ID del usuario si está disponible, si no, usa la IP.
        return req.user?.id || req.ip; 
    },
    // 🔥 CORRECCIÓN: Desactivamos la validación estricta de IP
    // ya que confiamos en req.ip proporcionado por Express trust proxy
    validate: {
        ip: false,
        trustProxy: false 
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    publicLimiter,
    authStrictLimiter,
    userLimiter,
};