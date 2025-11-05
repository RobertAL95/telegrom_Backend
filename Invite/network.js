const express = require('express');
const router = express.Router();
const response = require('../network/response');
const controller = require('./controller');
const jwtUtils = require('../utils/jwt');

// ===================================================
// 🟢 Generar link de invitación (usuario autenticado)
// ===================================================
router.post('/', async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) return response.error(req, res, 'No autenticado', 401);

    const decoded = jwtUtils.verify(token);
    if (!decoded?.id) return response.error(req, res, 'Token inválido', 401);

    const link = await controller.createInvite(decoded.id);
    response.success(req, res, { link }, 200);
  } catch (e) {
    console.error('❌ Error en /invite:', e.message);
    response.error(req, res, e.message, 500);
  }
});

// ===================================================
// 🟡 Validar token de invitación (sin login)
// ===================================================
router.get('/validate/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const valid = await controller.validateInvite(token);
    response.success(req, res, { valid }, 200);
  } catch (e) {
    response.error(req, res, e.message, 400);
  }
});

// ===================================================
// 🟢 Aceptar invitación y crear sesión de chat efímero
// ===================================================
router.post('/accept', async (req, res) => {
  try {
    const { token, guestName } = req.body;
    if (!token || !guestName) return response.error(req, res, 'Faltan datos', 400);

    const result = await controller.acceptInvite(token, guestName);
    response.success(req, res, result, 201);
  } catch (e) {
    response.error(req, res, e.message, 400);
  }
});


module.exports = router;
