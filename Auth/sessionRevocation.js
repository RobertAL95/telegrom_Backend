// Auth/service/sessionRevocation.js
'use strict';
const redis = require('../../utils/redis');
const { ttlToMs } = require('../../utils/jwt');

// Prefijo para las claves de los tokens revocados
const REVOKED_RT_PREFIX = 'rt:revoked:';
const REVOKED_AT_PREFIX = 'at:revoked:';

/**
 * 🟢 Revoca un Refresh Token al cerrar sesión.
 * Almacena el JTI (ID del token) en Redis con una expiración igual al TTL del token.
 * @param {string} jti - ID único del token.
 * @param {string} tokenTTL - TTL del token (ej: '7d', '30m').
 */
exports.revokeRefreshToken = async (jti, tokenTTL) => {
    if (!jti || !tokenTTL) return;

    const ttlSeconds = Math.ceil(ttlToMs(tokenTTL) / 1000);

    // Almacenamos el JTI en Redis. El valor es '1' (solo nos interesa la existencia).
    await redis.set(REVOKED_RT_PREFIX + jti, '1', 'EX', ttlSeconds);
    console.log(`🔒 RT Revocado: ${jti}. Expiración en ${ttlSeconds}s.`);
};

/**
 * 🟢 Revoca un Access Token (útil para sesiones críticas o cambio de contraseña).
 * @param {string} jti - ID único del token.
 * @param {number} exp - Tiempo de expiración del token (timestamp UNIX).
 */
exports.revokeAccessToken = async (jti, exp) => {
    if (!jti || !exp) return;

    // Calculamos el TTL restante en segundos
    const remainingSeconds = exp - Math.floor(Date.now() / 1000);

    if (remainingSeconds > 0) {
        await redis.set(REVOKED_AT_PREFIX + jti, '1', 'EX', remainingSeconds);
        console.log(`🔒 AT Revocado: ${jti}. Expiración en ${remainingSeconds}s.`);
    }
};


/**
 * 🟡 Verifica si un token ha sido revocado (está en la lista negra).
 * @param {string} jti - ID único del token.
 * @param {boolean} isRefresh - Si es un Refresh Token (usa prefijo RT).
 * @returns {boolean} - True si el token está revocado.
 */
exports.isTokenRevoked = async (jti, isRefresh = false) => {
    if (!jti) return false;

    const prefix = isRefresh ? REVOKED_RT_PREFIX : REVOKED_AT_PREFIX;

    const result = await redis.exists(prefix + jti);
    
    return result === 1;
};