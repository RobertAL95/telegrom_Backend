'use strict';
const jwt = require('jsonwebtoken');
const config = require('../config');

const SECRET = config.jwtSecret || process.env.JWT_SECRET || 'fallback_secret';

// TTLs DINÁMICOS
const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m'; // Corto para proteger rutas/WS
const REFRESH_TTL_WEB = process.env.JWT_REFRESH_TTL_WEB || '30m'; // 👈 Política Efímera
const REFRESH_TTL_PWA = process.env.JWT_REFRESH_TTL_PWA || '7d'; // 👈 Política Persistente

// ... (Resto de la función ttlToMs se mantiene igual) ...

// -------------------------------------------------
// Firmar access token (corto)
// -------------------------------------------------
function signAccess(payload, options = {}) {
  const opts = Object.assign({}, options, { expiresIn: ACCESS_TTL });
  return jwt.sign(payload, SECRET, opts);
}

// -------------------------------------------------
// Firmar refresh token (largo, ahora dinámico)
// -------------------------------------------------
function signRefresh(payload, customTTL = REFRESH_TTL_PWA, options = {}) {
  const opts = Object.assign({}, options, { expiresIn: customTTL });
  return jwt.sign(payload, SECRET, opts);
}

// ... (Resto de las funciones verify, decode se mantienen igual) ...

module.exports = {
  signAccess,
  signRefresh,
  verify,
  decode,
  ACCESS_TTL,
  REFRESH_TTL_WEB, // Exportamos el nuevo TTL
  REFRESH_TTL_PWA, // Exportamos el nuevo TTL
  ttlToMs,
};