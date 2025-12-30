'use strict';

const {
  signAccess,
  signRefresh,
  ttlToMs,
  ACCESS_TTL,
  REFRESH_TTL_WEB, 
  REFRESH_TTL_PWA, 
} = require('../utils/jwt');

// ===================================================
// ⚙️ Helpers para Cookies Seguras
// ===================================================
function getCookieOptions() {
  // Leemos directo de process.env para evitar problemas si config.js falla
  const isProd = false;

  return {
    httpOnly: true, 
    secure: isProd, 
    sameSite: 'lax', 
    path: '/',
  };
}

// ===================================================
// 🟢 Crear Sesión (Tokens + Cookies)
// ===================================================
exports.create = (res, user, isPWA = false) => {
  const currentRefreshTTL = isPWA ? REFRESH_TTL_PWA : REFRESH_TTL_WEB;

  const payload = { 
    id: user.id || user._id, 
    email: user.email, 
    name: user.name 
  };

  const accessToken = signAccess(payload); 
  const refreshToken = signRefresh(payload, currentRefreshTTL); 
  
  const opts = getCookieOptions();

  // Guardamos la cookie 'at' (Access Token)
  res.cookie('at', accessToken, { 
      ...opts, 
      maxAge: ttlToMs(ACCESS_TTL) 
  });
  
  // Guardamos la cookie 'rt' (Refresh Token)
  res.cookie('rt', refreshToken, { 
      ...opts, 
      maxAge: ttlToMs(currentRefreshTTL) 
  });
  
  // Debug: Ver en consola del backend si se están enviando
  console.log('🍪 Cookies establecidas: at, rt (Secure:', opts.secure, ')');
};

// ===================================================
// 🟢 Borrar Sesión (Limpiar Cookies)
// ===================================================
exports.clear = (res) => {
  const opts = getCookieOptions();
  res.clearCookie('at', opts);
  res.clearCookie('rt', opts);
};