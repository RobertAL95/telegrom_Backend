'use strict';
const jwt = require('jsonwebtoken');
const config = require('../config');
const crypto = require('crypto'); // Nativo en Node.js recientes

const SECRET = config.jwtSecret || process.env.JWT_SECRET || 'fallback_secret';

// ===================================================
// ⏳ Definición de TTLs (Tiempos de vida)
// ===================================================
const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m'; 
const REFRESH_TTL_WEB = process.env.JWT_REFRESH_TTL_WEB || '30m'; 
const REFRESH_TTL_PWA = process.env.JWT_REFRESH_TTL_PWA || '7d'; 

// ===================================================
// 🧮 Utilidad: Convertir TTL (string) a Milisegundos
// ===================================================
function ttlToMs(ttl) {
  if (typeof ttl === 'number') return ttl;
  if (!ttl) return 0;
  
  // Regex para capturar número y unidad (s, m, h, d)
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) return 0;
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

// ===================================================
// ✍️ Firmar Tokens
// ===================================================

/**
 * Firma un Access Token (vida corta) con JTI para revocación
 */
function signAccess(payload, options = {}) {
  const jti = crypto.randomUUID(); 
  const opts = Object.assign({}, options, { 
    expiresIn: ACCESS_TTL,
    jwtid: jti 
  });
  return jwt.sign(payload, SECRET, opts);
}

/**
 * Firma un Refresh Token (vida variable) con JTI para revocación
 */
function signRefresh(payload, customTTL = REFRESH_TTL_PWA, options = {}) {
  const jti = crypto.randomUUID(); 
  const opts = Object.assign({}, options, { 
    expiresIn: customTTL,
    jwtid: jti 
  });
  return jwt.sign(payload, SECRET, opts);
}

// ===================================================
// 🔍 Verificar y Decodificar
// ===================================================

function verify(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (err) {
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
  ttlToMs, // 🔥 CRÍTICO: Ahora está definida y exportada
  ACCESS_TTL,
  REFRESH_TTL_WEB,
  REFRESH_TTL_PWA,
};