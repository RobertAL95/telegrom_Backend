'use strict';

const { verify } = require('../utils/jwt');

/**
 * Middleware compatible con:
 *  - Usuarios reales (cookie: at)
 *  - Invitados (header: x-guest-token)
 *
 * Requiere que una ruta sea "protegida"
 * pero no bloquea a invitados cuando corresponde.
 */
function authMiddleware(req, res, next) {
  try {
    let token = null;
    let decoded = null;

    // ======================================
    // 🟢 1. Usuario Real → cookie "at"
    // ======================================
    if (req.cookies?.at) {
      token = req.cookies.at;
      decoded = verify(token);

      if (decoded) {
        req.user = {
          id: decoded.id,
          name: decoded.name,
          type: 'user',          // <-- distingue tipo
          isGuest: false
        };
        return next();
      }
    }

    // ======================================
    // 🟡 2. Invitado → header "x-guest-token"
    // ======================================
    if (req.headers['x-guest-token']) {
      token = req.headers['x-guest-token'];

      decoded = verify(token);
      if (decoded && decoded.isGuest) {
        req.user = {
          id: decoded.id,
          name: decoded.name || 'Invitado',
          inviter: decoded.inviter,
          chatId: decoded.chatId,
          type: 'guest',         // <-- distingue tipo
          isGuest: true
        };
        return next();
      }
    }

    // ======================================
    // ❌ Ningún token válido encontrado
    // ======================================
    return res
      .status(401)
      .json({ success: false, message: 'No autenticado' });

  } catch (err) {
    console.error('❌ Error en authMiddleware:', err.message);
    return res
      .status(403)
      .json({ success: false, message: 'Token inválido o expirado' });
  }
}

module.exports = authMiddleware;
