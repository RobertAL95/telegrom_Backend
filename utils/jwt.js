'use strict';
const jwt = require('jsonwebtoken');
const config = require('../config');
const crypto = require('crypto');

const SECRET = config.jwtSecret || process.env.JWT_SECRET || 'fallback_secret';

// TTLs (Tiempos de vida)
const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m'; 
const REFRESH_TTL_WEB = process.env.JWT_REFRESH_TTL_WEB || '30m'; 
const REFRESH_TTL_PWA = process.env.JWT_REFRESH_TTL_PWA || '7d'; 

/**
 * Convierte TTL a milisegundos para res.cookie(maxAge)
 */
function ttlToMs(ttl) {
  if (typeof ttl === 'number') return ttl;
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) return 0;
  
  const value = parseInt(match[1], 10);
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * (units[match[2]] || 0);
}

/**
 * Firma el Access Token.
 * @param {Object} payload Debe incluir { id, email, friendId }
 */
function signAccess(payload) {
  // Verificación preventiva: Si no hay friendId, el sistema fallará después
  if (!payload.friendId) {
    console.error('❌ Payload sin friendId detectado en signAccess');
  }

  const jti = crypto.randomUUID(); 
  return jwt.sign(payload, SECRET, { 
    expiresIn: ACCESS_TTL,
    jwtid: jti 
  });
}

function signRefresh(payload, customTTL = REFRESH_TTL_PWA) {
  const jti = crypto.randomUUID(); 
  return jwt.sign(payload, SECRET, { 
    expiresIn: customTTL,
    jwtid: jti 
  });
}

/**
 * Verifica el token y maneja errores de forma explícita
 */
function verify(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      // Log mínimo, solo para debug interno si es necesario
      return { expired: true }; 
    }
    return null;
  }
}

function decode(token) {
  try {
    return jwt.decode(token);
  } catch (err) {
    return null;
  }
}

module.exports = {
  signAccess,
  signRefresh,
  verify,
  decode,
  ttlToMs,
  ACCESS_TTL,
  REFRESH_TTL_WEB,
  REFRESH_TTL_PWA,
};