'use strict';

const express = require('express');
const router = express.Router();
const response = require('../network/response');
const controller = require('./controller');
const passport = require('../utils/oauth');
const auth = require('../middleware');
const { registerSchema, loginSchema } = require('./validators'); 
const sessionService = require('./serviceSession');
const revocationService = require('./sessionRevocation'); // ✅ ÚNICA IMPORTACIÓN

// Importamos todas las utilidades de JWT necesarias
const { verify, decode } = require('../utils/jwt'); 
// Nota: signAccess y signRefresh se usan en serviceSession, no aquí directamente, 
// a menos que tengas lógica inline que los requiera. Los eliminé de aquí para limpiar,
// ya que sessionService.create se encarga de firmar.

// ===================================================
// ⚙️ Middleware Helper de Validación Joi
// ===================================================
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
    response.error(req, res, e.message, 401); 
  }
});

// ===================================================
// 🟢 Perfil protegido (profile)
// ===================================================
router.get('/profile', auth, async (req, res) => {
  try {
    const user = { id: req.user.id, name: req.user.name, email: req.user.email }; 
    response.success(req, res, { 
        user, 
        sessionType: req.sessionType 
    }, 200);
  } catch (e) {
    console.error('❌ Error en /auth/profile:', e.message);
    response.error(req, res, e.message, 401);
  }
});

// ===================================================
// 🟢 Validar Sesión (/me) - Para el frontend initSession
// ===================================================
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.at;
    if (!token) return response.error(req, res, 'No session', 401);

    const user = await controller.getUserFromToken(token);
    response.success(req, res, { user, session: true }, 200);
  } catch (e) {
    // Silencioso para logs, normal si no está logueado
    response.error(req, res, 'Invalid session', 401);
  }
});

// ===================================================
// 🟢 Refresh Token
// ===================================================
router.post('/refresh', async (req, res) => {
  try {
    const rt = req.cookies?.rt;
    const decoded = verify(rt);

    if (!decoded?.id) return response.error(req, res, 'Refresh token inválido o expirado', 401);
    
    const deviceHeader = req.headers['x-client-device']?.toLowerCase();
    const isPWA = deviceHeader === 'mobile-pwa';

    // Generamos una NUEVA sesión
    const user = { id: decoded.id, name: decoded.name, email: decoded.email }; 
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
    const decodedPayload = decode(rt); 
    if (decodedPayload?.jti) {
        // Revocar por 7 días como medida de seguridad máxima
        await revocationService.revokeRefreshToken(decodedPayload.jti, '7d');
    }
  }

  sessionService.clear(res); 
  response.success(req, res, { message: 'Sesión cerrada' }, 200);
});

// ===================================================
// 🟢 OAuth Google
// ===================================================
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  async (req, res) => {
    try {
      const { user } = await controller.oauth(req.user);
      
      const isPWA = req.headers['x-client-device']?.toLowerCase() === 'mobile-pwa';
      sessionService.create(res, user, isPWA); 
      
      res.redirect(`${process.env.FRONTEND_URL || '/'}?login=success`);
    } catch (e) {
      console.error('OAuth Error:', e);
      res.redirect(`${process.env.FRONTEND_URL || '/'}?error=oauth_failed`);
    }
  }
);

module.exports = router;