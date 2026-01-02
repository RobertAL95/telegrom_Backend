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
// ⚙️ Helpers para Cookies (FORZADO PARA LOCALHOST)
// ===================================================
function getCookieOptions() {
  // 👇 MIENTRAS ESTÉS EN LOCALHOST, ESTO DEBE SER FALSE
  // Si Docker tiene NODE_ENV=production, esto te rompía todo.
  const isProd = false; 

  return {
    httpOnly: true, 
    secure: isProd, // false -> Permite HTTP
    sameSite: 'lax', // lax -> Permite navegación local correcta
    path: '/',
  };
}

// ===================================================
// 🟢 Crear Sesión
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

  // Guardamos cookies
  res.cookie('at', accessToken, { ...opts, maxAge: ttlToMs(ACCESS_TTL) });
  res.cookie('rt', refreshToken, { ...opts, maxAge: ttlToMs(currentRefreshTTL) });
  
  // Debug explícito
  console.log('🍪 SET-COOKIE:', { 
      secure: opts.secure, 
      sameSite: opts.sameSite, 
      user: user.email 
  });
};

// ... (El resto del archivo exports.clear sigue igual)
exports.clear = (res) => {
  const opts = getCookieOptions();
  res.clearCookie('at', opts);
  res.clearCookie('rt', opts);
};