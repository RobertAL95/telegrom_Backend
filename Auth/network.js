'use strict';

const express = require('express');
const router = express.Router();
const revocationService = require('./sessionRevocation');
const response = require('../network/response');
const controller = require('./controller');
const passport = require('../utils/oauth');
const auth = require('../middleware');
const { registerSchema, loginSchema } = require('./validators'); 
const sessionService = require('./serviceSession'); // 👈 NUEVO!
const { verify, signAccess, signRefresh } = require('../utils/jwt');
const revocationService = require('./sessionRevocation');

// ===================================================
// ⚙️ Middleware Helper de Validación Joi
// ... (mantenemos esta función igual) ...
function validate(schema) {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            const errorMessages = error.details.map(d => d.message).join(', ');
            return response.error(req, res, errorMessages, 400);
        }
        next();
    };
}

// ===================================================
// 🟢 Registro 
// ===================================================
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const user = await controller.register(req.body);
    response.success(req, res, { user }, 201);
  } catch (err) {
    console.error('❌ Error en /auth/register:', err.message);
    // Usamos el helper de respuesta estandarizado
    response.error(req, res, err.message, 400); 
  }
});

// ===================================================
// 🟢 Login (Con Detección de Dispositivo)
// ===================================================
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { user } = await controller.login(req.body);

    // 1. Detección de Dispositivo
    const deviceHeader = req.headers['x-client-device']?.toLowerCase();
    const isPWA = deviceHeader === 'mobile-pwa';
    
    // 2. Usar el nuevo servicio de sesión
    sessionService.create(res, user, isPWA); 

    // 3. Respuesta estandarizada
    response.success(req, res, { user, sessionType: isPWA ? 'PWA' : 'WEB' }, 200);
  } catch (e) {
    console.error('❌ Error en /auth/login:', e.message);
    // Respuesta estandarizada (401 Unauthorized)
    response.error(req, res, e.message, 401); 
  }
});

// ===================================================
// 🟢 Perfil protegido (profile)
// ... (se mantiene igual, ya usa el middleware 'auth')
// ===================================================
router.get('/profile', auth, async (req, res) => {
  try {
    // req.user ya está poblado por el middleware 'auth'
    const user = { id: req.user.id, name: req.user.name, email: req.user.email }; 
    // Usamos el helper de respuesta estandarizado
    response.success(req, res, { 
        user, 
        sessionType: req.sessionType // <-- Usamos la sesión detectada por el middleware
    }, 200);
  } catch (e) {
    console.error('❌ Error en /auth/profile:', e.message);
    response.error(req, res, e.message, 401);
  }
});

// ===================================================
// 🟢 Refresh Token (Con Detección de Dispositivo y Sesión)
// ===================================================
router.post('/refresh', async (req, res) => {
  try {
    const rt = req.cookies?.rt;
    const decoded = verify(rt);

    // Si el RT es inválido o caducó (ej. los 30 min para Web), falla aquí.
    if (!decoded?.id) return response.error(req, res, 'Refresh token inválido o expirado', 401);
    
    // Detección de Dispositivo para saber qué TTL usar
    const deviceHeader = req.headers['x-client-device']?.toLowerCase();
    const isPWA = deviceHeader === 'mobile-pwa';

    // Generamos una NUEVA sesión (mantiene el mismo usuario)
    const user = { id: decoded.id, name: decoded.name, email: decoded.email }; // Asumimos name/email en RT payload
    sessionService.create(res, user, isPWA);

    response.success(req, res, { refreshed: true, sessionType: isPWA ? 'PWA' : 'WEB' }, 200);
  } catch (e) {
    console.error('❌ Error en /auth/refresh:', e.message);
    response.error(req, res, 'No autorizado', 401);
  }
});

// ===================================================
// 🟢 Logout
// ===================================================
router.post('/logout', async (req, res) => {
  const rt = req.cookies?.rt;

  // Si existe RT, lo revocamos inmediatamente
  if (rt) {
    const decodedPayload = decode(rt); // Obtener JTI sin verificar expiración
    if (decodedPayload?.jti) {
        // Asumimos que el TTL del RT en el logout es el máximo (PWA) para ser seguros.
        await revocationService.revokeRefreshToken(decodedPayload.jti, REFRESH_TTL_PWA);
    }
  }

  sessionService.clear(res); 
  response.success(req, res, { message: 'Sesión cerrada' }, 200);
});

// ===================================================
// 🟢 OAuth Google
// ... (mantenemos la lógica de OAuth y callback igual, pero usamos sessionService.create)
// ===================================================
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  async (req, res) => {
    try {
      const { user } = await controller.oauth(req.user);
      
      // Asumimos que OAuth es principalment PWA/WEB, ajustamos si es necesario.
      const isPWA = req.headers['x-client-device']?.toLowerCase() === 'mobile-pwa';
      sessionService.create(res, user, isPWA); // Usamos el nuevo servicio
      
      res.redirect(`${process.env.FRONTEND_URL || '/'}?login=success`);
    } catch (e) {
      console.error('OAuth Error:', e);
      res.redirect(`${process.env.FRONTEND_URL || '/'}?error=oauth_failed`);
    }
  }
);

module.exports = router;