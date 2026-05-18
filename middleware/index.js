'use strict';

const { verify } = require('../utils/jwt');
const response = require('../network/response'); 
const revocationService = require('../Auth/sessionRevocation');
const cookie = require('cookie'); // 🟢 1. Importamos la librería de cookies

async function authMiddleware(req, res, next) {
    try {
        // 1. Metadatos de sesión
        const deviceHeader = req.headers['x-client-device']?.toLowerCase();
        req.sessionType = deviceHeader === 'mobile-pwa' ? 'PWA' : 'WEB';

        // 🟢 2. CORRECCIÓN: Parseamos la cookie manualmente desde los headers
        const cookies = cookie.parse(req.headers.cookie || '');
        let token = cookies.at; 
        
        let isGuest = false;

        // 3. Lógica de Invitado (Fallback)
        if (!token && req.headers['x-guest-token']) {
            token = req.headers['x-guest-token'];
            isGuest = true;
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'No autenticado' });
        }

        // 4. Verificación de Integridad
        const decoded = verify(token);
        if (!decoded) {
            return res.status(401).json({ success: false, message: 'Sesión expirada o inválida' });
        }

        // 5. Verificación de Revocación (Solo para usuarios reales, el AT tiene JTI)
        if (!isGuest && decoded.jti) {
            const isRevoked = await revocationService.isTokenRevoked(decoded.jti, false);
            if (isRevoked) {
                console.warn(`🚫 Intento de acceso con token revocado: ${decoded.jti}`);
                return res.status(403).json({ success: false, message: 'Sesión terminada' });
            }
        }

        // 6. Inyección de Identidad
        req.user = {
            id: decoded.id,
            friendId: decoded.friendId, 
            name: decoded.name || (isGuest ? 'Invitado' : ''),
            email: decoded.email,
            type: isGuest ? 'guest' : 'user',
            isGuest: isGuest,
            ...(isGuest && {
                inviter: decoded.inviter,
                chatId: decoded.chatId
            })
        };

        next();

    } catch (err) {
        console.error('❌ Error crítico en authMiddleware:', err.message);
        return res.status(500).json({ success: false, message: 'Error interno de autenticación' });
    }
}

module.exports = authMiddleware;