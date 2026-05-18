'use strict';

const express = require('express');
const router = express.Router();
const response = require('../network/response');
const controller = require('./controller');
const passport = require('../utils/oauth');
const auth = require('../middleware');
const { registerSchema, loginSchema } = require('./validators'); 
const sessionService = require('./serviceSession');
const revocationService = require('./sessionRevocation'); 

// Importamos la librería para procesar las cookies manualmente
const cookie = require('cookie'); 
const { verify, decode } = require('../utils/jwt'); 

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
// 🟢 Login (Único y unificado)
// ===================================================
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { user } = await controller.login(req.body);
    const deviceHeader = req.headers['x-client-device']?.toLowerCase();
    const isPWA = deviceHeader === 'mobile-pwa';
    
    const token = sessionService.create(res, user, isPWA); 

    response.success(req, res, { user, sessionType: isPWA ? 'PWA' : 'WEB', token }, 200);
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
    const user = { 
        id: req.user.id, 
        friendId: req.user.friendId, 
        name: req.user.name, 
        email: req.user.email 
    }; 
    
    response.success(req, res, { user, sessionType: req.sessionType }, 200);
  } catch (e) {
    console.error('❌ Error en /auth/profile:', e.message);
    response.error(req, res, e.message, 401);
  }
});

// ===================================================
// 🟢 Validar Sesión (/me) - ¡ULTRARRÁPIDO Y SIN DB!
// ===================================================
router.get('/me', auth, async (req, res) => {
  try {
      // El guardia (middleware 'auth') ya hizo el trabajo pesado.
      // Validó la cookie, la desencriptó y nos dejó los datos en req.user
      // ¡Y gracias a la refactorización anterior, req.user ya tiene el friendId!
      
      response.success(req, res, { user: req.user }, 200);
  } catch (e) {
      console.error('❌ Error en /auth/me:', e);
      response.error(req, res, 'Sesión inválida', 401);
  }
});

// ===================================================
// 🟢 Refresh Token - ¡SIN RIESGO DE CRASH!
// ===================================================
router.post('/refresh', async (req, res) => {
  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const rt = cookies.rt; 

    if (!rt) return response.error(req, res, 'Refresh token inexistente', 401);

    // Decodificamos el Refresh Token manualmente
    const decoded = verify(rt);
    if (!decoded || !decoded.id) throw new Error('Token de refresco inválido o expirado');

    // 🟢 RECONSTRUIMOS EL USUARIO DESDE EL TOKEN (Sin tocar MongoDB)
    const user = {
        id: decoded.id,
        name: decoded.name,
        email: decoded.email,
        friendId: decoded.friendId // Mantenemos vivo el ID Verde
    };
    
    const deviceHeader = req.headers['x-client-device']?.toLowerCase();
    const isPWA = deviceHeader === 'mobile-pwa';

    // Regeneramos las cookies
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
  const cookies = cookie.parse(req.headers.cookie || '');
  const rt = cookies.rt;

  if (rt) {
    const decodedPayload = decode(rt); 
    if (decodedPayload?.jti) {
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