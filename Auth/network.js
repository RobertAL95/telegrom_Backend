const express = require('express');
const router = express.Router();
const response = require('../network/response');
const controller = require('./controller');
const passport = require('../utils/oauth'); // Si usas Google OAuth

// ===================================================
// 🟢 Registro de usuario
// ===================================================
router.post('/register', async (req, res) => {
  try {
    const result = await controller.register(req.body);
    response.success(req, res, result, 201);
    console.log(`✅ Usuario registrado: ${result.email || result.name}`);
  } catch (e) {
    console.error('❌ Error en /auth/register:', e.message);
    response.error(req, res, e.message, 400);
  }
});

// ===================================================
// 🟢 Login de usuario (genera cookie JWT segura)
// ===================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return response.error(req, res, 'Email y contraseña requeridos', 400);
    }

    const { token, user } = await controller.login({ email, password });

    // Seteamos cookie segura con el token
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Solo HTTPS en prod
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Permite cross-domain en dev
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });

    response.success(req, res, { user }, 200);
    console.log(`✅ Usuario "${user.email}" hizo login con éxito`);
  } catch (e) {
    console.error('❌ Error en /auth/login:', e.message);
    response.error(req, res, e.message, 401);
  }
});

// ===================================================
// 🟢 Perfil de usuario (requiere cookie válida)
// ===================================================
router.get('/profile', async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      console.warn('⚠️ Solicitud a /auth/profile sin token');
      return response.error(req, res, 'No autenticado', 401);
    }

    const user = await controller.getUserFromToken(token);
    if (!user) return response.error(req, res, 'Usuario no encontrado', 404);

    response.success(req, res, user, 200);
  } catch (e) {
    console.error('❌ Error en /auth/profile:', e.message);
    response.error(req, res, e.message, 401);
  }
});

// ===================================================
// 🟢 Logout (elimina cookie)
// ===================================================
router.post('/logout', async (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    response.success(req, res, { message: 'Sesión cerrada correctamente' }, 200);
    console.log('👋 Usuario cerró sesión');
  } catch (e) {
    console.error('❌ Error en /auth/logout:', e.message);
    response.error(req, res, e.message, 500);
  }
});

// ===================================================
// 🟢 OAuth Google (si lo usas)
// ===================================================
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  async (req, res) => {
    try {
      const token = await controller.oauth(req.user);
      res.redirect(`${process.env.FRONTEND_URL || '/'}?token=${token}`);
    } catch (e) {
      console.error('❌ Error en /google/callback:', e.message);
      res.redirect(`${process.env.FRONTEND_URL || '/'}?error=oauth_failed`);
    }
  }
);

// ===================================================
// 🟢 /auth/me (usa Authorization: Bearer <token>)
// ===================================================

// ===================================================
// 🟢 /auth/me (acepta cookie o Authorization header)
// ===================================================
router.get('/me', async (req, res) => {
  try {
    let token = null;

    // ✅ Primero intentamos leer cookie
    if (req.cookies?.token) {
      token = req.cookies.token;
    }
    // 🧩 Luego intentamos leer header Authorization si no hay cookie
    else if (req.headers.authorization) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) return response.error(req, res, 'No token provided', 401);

    const user = await controller.getUserFromToken(token);
    if (!user) return response.error(req, res, 'User not found', 404);

    response.success(req, res, user, 200);
  } catch (e) {
    console.error('❌ Error en /auth/me:', e.message);
    response.error(req, res, 'Invalid token', 401);
  }
});


router.get('/validate', async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) return response.error(req, res, 'Token no encontrado', 401);

    const user = await controller.getUserFromToken(token);
    if (!user) return response.error(req, res, 'Token inválido', 401);

    response.success(req, res, { valid: true }, 200);
  } catch (e) {
    console.error('❌ Error en /auth/validate:', e.message);
    response.error(req, res, 'Sesión inválida', 401);
  }
});


module.exports = router;
