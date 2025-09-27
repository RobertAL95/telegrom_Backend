const express = require('express');
const router = express.Router();
const response = require('../network/response');
const controller = require('./controller');
const passport = require('../utils/oauth'); // si usas Google OAuth

// Register
router.post('/register', async (req, res) => {
  try {
    const result = await controller.register(req.body);
    response.success(req, res, result, 201);
    console.log('Usuario registrado, status 201');
  } catch (e) {
    response.error(req, res, e.message, 400);
  }
});

// Login (devuelve token y usuario)
// routes.js
router.post('/login', async (req, res) => {
  try {
    const { token, user } = await controller.login(req.body);

    // Setear cookie segura con el token
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // solo https en prod
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });

    response.success(req, res, { user }, 200); // devolvemos solo user
    console.log('Usuario hizo login, status 200');
  } catch (e) {
    response.error(req, res, e.message, 401);
  }
});

router.get('/profile', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return response.error(req, res, 'No autenticado', 401);

    const user = await controller.getUserFromToken(token);
    if (!user) return response.error(req, res, 'Usuario no encontrado', 404);

    response.success(req, res, user, 200);
  } catch (e) {
    response.error(req, res, e.message, 401);
  }
});

// OAuth Google (si lo usas)
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  async (req, res) => {
    const token = await controller.oauth(req.user);
    // rediriges con token al frontend (o cambiar a flow que prefieras)
    res.redirect(`${process.env.FRONTEND_URL || '/'}?token=${token}`);
  });

// /auth/me -> devuelve user a partir del Authorization: Bearer <token>
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return response.error(req, res, 'No token provided', 401);

    const token = authHeader.split(' ')[1];
    const user = await controller.getUserFromToken(token);
    if (!user) return response.error(req, res, 'User not found', 404);

    response.success(req, res, user, 200);
  } catch (e) {
    response.error(req, res, 'Invalid token', 401);
  }
});

module.exports = router;
