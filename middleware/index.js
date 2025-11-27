'use strict';

const { verify, decode } = require('./utils/jwt');
const revocationService = require('./Auth/service/sessionRevocation'); // <-- Ruta corregida

// ===================================================
// 🛡️ Middleware de Autenticación (Usuario Real o Invitado)
// ===================================================

// 🔥 CRÍTICO: La función DEBE ser ASÍNCRONA (async) para usar await.
async function authMiddleware(req, res, next) { 
  try {
    // 🟢 1. Detección de Dispositivo y Política
    const deviceHeader = req.headers['x-client-device']?.toLowerCase();
    const isPWA = deviceHeader === 'mobile-pwa';
    req.sessionType = isPWA ? 'PWA' : 'WEB'; 

    let token = null;
    let decoded = null;
    let isRevoked = false; // Variable para la verificación

    // ======================================
    // 🟢 2. Usuario Real → cookie "at"
    // ======================================
    if (req.cookies?.at) {
      token = req.cookies.at;
      decoded = verify(token); // Verificado por expiración

      if (decoded) {
        // 🔥 CRÍTICO: 1. Verificar Revocación en Redis
        // Usamos await aquí, por eso la función principal es async.
        isRevoked = await revocationService.isTokenRevoked(decoded.jti, false); // isRefresh=false para AT

        if (isRevoked) {
             console.warn(`🚫 Token revocado en Redis: ${decoded.jti}`);
             return res.status(403).json({ success: false, message: 'Sesión terminada (revocada)' });
        }

        // 2. Si no está revocado, proceder
        req.user = {
          id: decoded.id,
          name: decoded.name,
          email: decoded.email,
          type: 'user', 
          isGuest: false,
          sessionType: req.sessionType
        };
        return next();
      }
    }

    // ======================================
    // 🟡 3. Invitado → header "x-guest-token"
    // ======================================
    // Aquí puedes decidir si los guest tokens también se revocan en Redis.
    // Asumiremos que no, por simplicidad, ya que son efímeros por naturaleza.
    if (req.headers['x-guest-token']) {
        token = req.headers['x-guest-token'];
        decoded = verify(token);

        if (decoded && decoded.isGuest) {
            req.user = {
                id: decoded.id,
                name: decoded.name || 'Invitado',
                inviter: decoded.inviter,
                chatId: decoded.chatId,
                type: 'guest', 
                isGuest: true,
                sessionType: req.sessionType 
            };
            return next();
        }
    }

    // ======================================
    // ❌ Ningún token válido encontrado
    // ======================================
    return res.status(401).json({ success: false, message: 'No autenticado' });

  } catch (err) {
    console.error('❌ Error en authMiddleware:', err.message);
    // El error aquí casi siempre es por fallos en Redis o la DB, no por el token.
    return res.status(403).json({ success: false, message: 'Token inválido, expirado o error interno.' });
  }
}

module.exports = authMiddleware;