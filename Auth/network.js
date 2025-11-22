'use strict';

const express = require('express');
const router = express.Router();
const response = require('../network/response');
const controller = require('./controller');
const passport = require('../utils/oauth');
const auth = require('../middleware');
const { registerSchema, loginSchema } = require('./validators'); // 👈 Importamos Joi

const {
  signAccess,
  signRefresh,
  verify,
  ttlToMs,
  ACCESS_TTL,
  REFRESH_TTL,
} = require('../utils/jwt');

// ===================================================
// ⚙️ Middleware Helper de Validación Joi
// ===================================================
function validate(schema) {
    return (req, res, next) => {
        // 'abortEarly: false' muestra todos los errores, no solo el primero
        const { error } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            const errorMessages = error.details.map(d => d.message).join(', ');
            return response.error(req, res, errorMessages, 400);
        }
        next();
    };
}

// ===================================================
// ⚙️ Helpers para cookies seguras
// ===================================================
function setAuthCookies(res, accessToken, refreshToken) {
  const isProd = process.env.NODE_ENV === 'production';
  const commonOpts = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  };
  res.cookie('at', accessToken, { ...commonOpts, maxAge: ttlToMs(ACCESS_TTL) });
  res.cookie('rt', refreshToken, { ...commonOpts, maxAge: ttlToMs(REFRESH_TTL) });
}

function clearAuthCookies(res) {
  const isProd = process.env.NODE_ENV === 'production';
  const opts = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  };
  res.clearCookie('at', opts);
  res.clearCookie('rt', opts);
}

// ===================================================
// 🟢 Registro (Con Validación Joi)
// ===================================================
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const user = await controller.register(req.body);
    // Ya no hay logs fuera del try, seguro y limpio.
    response.success(req, res, { user }, 201);
  } catch (err) {
    console.error('❌ Error en /auth/register:', err.message);
    response.error(req, res, err.message, 400); // 400 porque suele ser error de usuario (ej. email duplicado)
  }
});

// ===================================================
// 🟢 Login (Con Validación Joi)
// ===================================================
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { user } = await controller.login(req.body);

    // Generar tokens
    const accessToken = signAccess({ id: user.id, email: user.email, name: user.name });
    const refreshToken = signRefresh({ id: user.id });

    // Cookies
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (e) {
    console.error('❌ Error en /auth/login:', e.message);
    // Si falla el login, es 401 Unauthorized
    res.status(401).json({ success: false, message: e.message });
  }
});

// ===================================================
// 🟢 Perfil protegido
// ===================================================
router.get('/profile', auth, async (req, res) => {
  try {
    const { id } = req.user;
    const user = await controller.getUserFromToken(req.cookies.at);
    response.success(req, res, { user, session: true }, 200);
  } catch (e) {
    console.error('❌ Error en /auth/profile:', e.message);
    response.error(req, res, e.message, 401);
  }
});

// ===================================================
// 🟢 /auth/me (check rápido)
// ===================================================
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.at || 
                 (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);

    if (!token) return response.error(req, res, 'Token no proporcionado', 401);

    const user = await controller.getUserFromToken(token);
    response.success(req, res, { user }, 200);
  } catch (e) {
    response.error(req, res, 'Token inválido', 401);
  }
});

// ===================================================
// 🟢 Refresh Token
// ===================================================
router.post('/refresh', async (req, res) => {
  try {
    const rt = req.cookies?.rt;
    const decoded = verify(rt);
    if (!decoded?.id) return response.error(req, res, 'Refresh token inválido', 401);

    const newAccess = signAccess({ id: decoded.id });
    const newRefresh = signRefresh({ id: decoded.id });
    setAuthCookies(res, newAccess, newRefresh);

    response.success(req, res, { refreshed: true }, 200);
  } catch (e) {
    response.error(req, res, 'No autorizado', 401);
  }
});

// ===================================================
// 🟢 Logout
// ===================================================
router.post('/logout', async (req, res) => {
  clearAuthCookies(res);
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
      // Usamos controller.oauth que ahora devuelve { user } correctamente
      const { user } = await controller.oauth(req.user);
      
      const accessToken = signAccess({ id: user.id, email: user.email, name: user.name });
      const refreshToken = signRefresh({ id: user.id });
      setAuthCookies(res, accessToken, refreshToken);

      res.redirect(`${process.env.FRONTEND_URL || '/'}?login=success`);
    } catch (e) {
      console.error('OAuth Error:', e);
      res.redirect(`${process.env.FRONTEND_URL || '/'}?error=oauth_failed`);
    }
  }
);

module.exports = router;