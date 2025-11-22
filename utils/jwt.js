// src/utils/jwt.js
'use strict';
const jwt = require('jsonwebtoken');
const config = require('../config');

const SECRET = config.jwtSecret || process.env.JWT_SECRET || 'fallback_secret';

// TTLs (ajusta vía env si quieres)
const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m'; // token corto para proteger rutas/WS
const REFRESH_TTL = process.env.JWT_REFRESH_TTL || '7d'; // token largo para renovar sesión

// -------------------------------------------------
// Convertir TTL simple (e.g., '15m','7d') a ms para cookie.maxAge
// -------------------------------------------------
function ttlToMs(ttl) {
  const m = /^(\d+)([smhd])$/.exec(ttl);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  const u = m[2];
  if (u === 's') return n * 1000;
  if (u === 'm') return n * 60 * 1000;
  if (u === 'h') return n * 60 * 60 * 1000;
  if (u === 'd') return n * 24 * 60 * 60 * 1000;
  return 0;
}

// -------------------------------------------------
// Firmar access token (corto)
// -------------------------------------------------
function signAccess(payload, options = {}) {
  const opts = Object.assign({}, options, { expiresIn: ACCESS_TTL });
  return jwt.sign(payload, SECRET, opts);
}

// -------------------------------------------------
// Firmar refresh token (largo)
// -------------------------------------------------
function signRefresh(payload, options = {}) {
  const opts = Object.assign({}, options, { expiresIn: REFRESH_TTL });
  return jwt.sign(payload, SECRET, opts);
}

// -------------------------------------------------
// Verificar token (devuelve decoded o null) — NO lanza
// -------------------------------------------------
function verify(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (err) {
    // no loguear stack en producción masivo, pero sí info útil
    // console.debug('jwt.verify failed:', err.message);
    return null;
  }
}

// -------------------------------------------------
// Decodificar sin verificar (solo lectura)
// -------------------------------------------------
function decode(token) {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
}

module.exports = {
  signAccess,
  signRefresh,
  verify,
  decode,
  ACCESS_TTL,
  REFRESH_TTL,
  ttlToMs,
};
