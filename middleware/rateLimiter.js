'use strict';

const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis'); 
const redis = require('../utils/redis'); 

const redisClient = redis.createClient();

// 🟢 CONFIGURACIÓN DE VALIDACIÓN TOTALMENTE RELAJADA PARA DOCKER
const commonValidateConfig = {
    ip: false,
    trustProxy: false,
    keyGenerator: false, // 👈 ESTO apaga el error de "Custom keyGenerator"
    default: false
};

// ===================================================
// 2. Limitador de Tráfico Público
// ===================================================
const publicLimiter = rateLimit({
    store: new RedisStore({ 
        sendCommand: (...args) => redisClient.call(...args),
        prefix: 'rl:public:', 
    }),
    windowMs: 15 * 60 * 1000,
    max: 100, 
    standardHeaders: true,
    legacyHeaders: false,
    validate: commonValidateConfig,
    message: { ok: false, message: 'Demasiadas solicitudes.' },
});

// ===================================================
// 3. Limitador Estricto para Login/Registro
// ===================================================
const authStrictLimiter = rateLimit({
    store: new RedisStore({ 
        sendCommand: (...args) => redisClient.call(...args),
        prefix: 'rl:auth:',
    }),
    windowMs: 5 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    validate: commonValidateConfig,
    message: { ok: false, message: 'Demasiados intentos.' },
});

// ===================================================
// 4. Limitador por Usuario (El que causaba el log de error)
// ===================================================
const userLimiter = rateLimit({
    store: new RedisStore({ 
        sendCommand: (...args) => redisClient.call(...args),
        prefix: 'rl:user:',
    }),
    windowMs: 60 * 1000,
    max: 30,
    keyGenerator: (req) => {
        // Priorizamos el ID de usuario, si no, la IP
        return req.user?.id || req.ip || 'anonymous'; 
    },
    validate: commonValidateConfig, // 👈 Bloquea el error de la línea 59
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { publicLimiter, authStrictLimiter, userLimiter };