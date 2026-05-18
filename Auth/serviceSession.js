'use strict';

const { 
    signAccess, 
    signRefresh, 
    ttlToMs, 
    ACCESS_TTL, 
    REFRESH_TTL_WEB, 
    REFRESH_TTL_PWA 
} = require('../utils/jwt');

/**
 * Configuración centralizada de cookies.
 * sameSite: 'lax' es adecuado para desarrollo local y navegación estándar.
 * En producción con dominios diferentes, podrías necesitar 'none' + secure: true.
 */
function getCookieOptions() {
    const isProd = process.env.NODE_ENV === 'production';

    return {
        httpOnly: true,
        secure: isProd, 
        sameSite: 'lax', 
        path: '/',
    };
}

/**
 * 🟢 Crea y establece las cookies de sesión.
 */
exports.create = (res, user, isPWA = false) => {
    const currentRefreshTTL = isPWA ? REFRESH_TTL_PWA : REFRESH_TTL_WEB;

    // Estandarización de ID: MongoDB usa _id, pero en el resto del sistema usamos id.
    const userId = user.id || user._id;

    if (!user.friendId) {
        console.error(`⚠️ Alerta de integridad: Generando sesión para ${userId} sin friendId.`);
    }

    const payload = { 
        id: userId, 
        email: user.email, 
        name: user.name, 
        friendId: user.friendId 
    };

    const accessToken = signAccess(payload); 
    const refreshToken = signRefresh(payload, currentRefreshTTL); 
    
    const opts = getCookieOptions();

    // Inyectamos las cookies
    res.cookie('at', accessToken, { ...opts, maxAge: ttlToMs(ACCESS_TTL) });
    res.cookie('rt', refreshToken, { ...opts, maxAge: ttlToMs(currentRefreshTTL) });
    
    return { accessToken, refreshToken }; // Retornar para logs o tests internos si es necesario
};

/**
 * 🔴 Elimina las cookies de sesión (Logout).
 */
exports.clear = (res) => {
    const opts = getCookieOptions();
    res.clearCookie('at', opts);
    res.clearCookie('rt', opts);
};