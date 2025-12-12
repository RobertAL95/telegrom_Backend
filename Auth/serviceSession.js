'use strict';

const config = require('../config');
const {
  signAccess,
  signRefresh,
  ttlToMs, // 🔥 Ahora esto funcionará correctamente
  ACCESS_TTL,
  REFRESH_TTL_WEB, 
  REFRESH_TTL_PWA, 
} = require('../utils/jwt');

// ===================================================
// ⚙️ Helpers para Cookies Seguras
// ===================================================
function getCookieOptions() {
  const isProd = config.nodeEnv === 'production';
  return {
    httpOnly: true, // No accesible por JS en el cliente (Seguridad XSS)
    secure: isProd, // Solo HTTPS en producción
    sameSite: isProd ? 'none' : 'lax', // 'none' es necesario para cross-site en prod si front/back difieren
    path: '/',
  };
}

// ===================================================
// 🟢 Crear Sesión (Tokens + Cookies)
// ===================================================
exports.create = (res, user, isPWA = false) => {
  // 1. Definir TTLs basados en el tipo de sesión (Header del cliente)
  const currentRefreshTTL = isPWA ? REFRESH_TTL_PWA : REFRESH_TTL_WEB;

  // 2. Generar payload seguro (maneja .id o ._id)
  const payload = { 
    id: user.id || user._id, 
    email: user.email, 
    name: user.name 
  };

  // 3. Generar tokens firmados
  const accessToken = signAccess(payload); 
  const refreshToken = signRefresh(payload, currentRefreshTTL); 
  
  const commonOpts = getCookieOptions();

  // 4. Establecer Cookies con maxAge calculado
  // ttlToMs convierte '15m' -> 900000ms
  res.cookie('at', accessToken, { 
      ...commonOpts, 
      maxAge: ttlToMs(ACCESS_TTL) 
  });
  
  res.cookie('rt', refreshToken, { 
      ...commonOpts, 
      maxAge: ttlToMs(currentRefreshTTL) 
  });
};

// ===================================================
// 🟢 Borrar Sesión (Limpiar Cookies)
// ===================================================
exports.clear = (res) => {
  const opts = getCookieOptions();
  
  // Forzamos la expiración inmediata
  res.clearCookie('at', opts);
  res.clearCookie('rt', opts);
};