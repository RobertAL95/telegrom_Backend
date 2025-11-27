'use strict';
const jwt = require('jsonwebtoken');
const config = require('../config');
const crypto = require('crypto'); // 👈 NUEVO: Necesario para generar UUIDs seguros

const SECRET = config.jwtSecret || process.env.JWT_SECRET || 'fallback_secret';

// TTLs DINÁMICOS
const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m'; 
const REFRESH_TTL_WEB = process.env.JWT_REFRESH_TTL_WEB || '30m'; 
const REFRESH_TTL_PWA = process.env.JWT_REFRESH_TTL_PWA || '7d'; 

// [Asumimos que ttlToMs, verify, y decode existen y son correctos]

// -------------------------------------------------
// Firmar access token (corto) - INCLUYE JTI
// -------------------------------------------------
function signAccess(payload, options = {}) {
  // Generamos un JTI único para la revocación
  const jti = crypto.randomUUID(); 
  
  const opts = Object.assign({}, options, { 
    expiresIn: ACCESS_TTL,
    jwtid: jti // 👈 AGREGADO: JTI para Revocación
});
  return jwt.sign(payload, SECRET, opts);
}

// -------------------------------------------------
// Firmar refresh token (largo, ahora dinámico) - INCLUYE JTI
// -------------------------------------------------
function signRefresh(payload, customTTL = REFRESH_TTL_PWA, options = {}) {
  // Generamos un JTI único para la revocación
  const jti = crypto.randomUUID(); 
  
  const opts = Object.assign({}, options, { 
    expiresIn: customTTL,
    jwtid: jti // 👈 AGREGADO: JTI para Revocación
});
  return jwt.sign(payload, SECRET, opts);
}

// ... (Resto de las funciones verify, decode, y ttlToMs deben ser incluidas aquí) ...

module.exports = {
  signAccess,
  signRefresh,
  // ... (Resto de las funciones y TTLs exportados)
  ACCESS_TTL,
  REFRESH_TTL_WEB, 
  REFRESH_TTL_PWA, 
  // ...
};