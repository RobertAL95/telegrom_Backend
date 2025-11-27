'use strict';

const {
  signAccess,
  signRefresh,
  ttlToMs,
  ACCESS_TTL,
  REFRESH_TTL_WEB, // Usamos el TTL corto
  REFRESH_TTL_PWA, // Usamos el TTL largo
} = require('../../utils/jwt');
const config = require('../../config');

// ===================================================
// ⚙️ Helpers para Cookies Seguras
// ===================================================
function getCookieOptions() {
  const isProd = config.nodeEnv === 'production';
  return {
    httpOnly: true,
    secure: isProd, // Sólo HTTPS en producción
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  };
}

// ===================================================
// 🟢 Crear Sesión (Tokens + Cookies)
// ===================================================
exports.create = (res, user, isPWA = false) => {
  // 1. Definir TTLs basados en el tipo de sesión
  const currentRefreshTTL = isPWA ? REFRESH_TTL_PWA : REFRESH_TTL_WEB;

  // 2. Generar tokens
  const payload = { id: user.id, email: user.email, name: user.name };
  const accessToken = signAccess(payload); // Siempre corto (15m)
  const refreshToken = signRefresh(payload, currentRefreshTTL); // Dinámico (30m o 7d)
  
  const commonOpts = getCookieOptions();

  // 3. Establecer Cookies
  res.cookie('at', accessToken, { 
      ...commonOpts, 
      maxAge: ttlToMs(ACCESS_TTL) // Max 15m
  });
  res.cookie('rt', refreshToken, { 
      ...commonOpts, 
      maxAge: ttlToMs(currentRefreshTTL) // Dinámico (30m o 7d)
  });
};

// ===================================================
// 🟢 Borrar Sesión (Limpiar Cookies)
// ===================================================
exports.clear = (res) => {
  const opts = getCookieOptions();
  res.clearCookie('at', opts);
  res.clearCookie('rt', opts);
};