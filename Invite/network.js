'use strict';
const express = require('express');
const router = express.Router();
const response = require('../network/response');
const controller = require('./controller');
const auth = require('../middleware'); // se usa SOLO en POST /invite

/* ===================================================
   🟢 Crear link de invitación (solo anfitrión logueado)
   POST /invite
   Protected
=================================================== */
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return response.error(req, res, 'No autenticado', 401);

    const { link, chatId } = await controller.createInvite(userId);

    return response.success(req, res, { link, chatId }, 200);
  } catch (e) {
    console.error('❌ Error al generar invitación:', e.message);
    return response.error(req, res, e.message, 500);
  }
});

/* ===================================================
   🟡 Validar token de invitación
   GET /invite/validate/:token
   Público
=================================================== */
router.get('/validate/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const valid = await controller.validateInvite(token);

    // 👈 Respuesta consistente con frontend
    return response.success(req, res, { valid }, 200);
  } catch (e) {
    console.error('❌ Error en validateInvite:', e.message);
    return response.error(req, res, e.message, 400);
  }
});

/* ===================================================
   🟢 Aceptar invitación
   POST /invite/accept
   Público
=================================================== */
router.post('/accept', async (req, res) => {
  try {
    const { token, guestName } = req.body;

    if (!token)
      return response.error(req, res, 'Token requerido', 400);

    // guestName ahora es opcional, controller lo normaliza
    const result = await controller.acceptInvite(token, guestName);

    // 👈 compatibilidad 100% con frontend
    return response.success(req, res, {
      roomId: result.roomId,
      guestToken: result.guestToken,
      guestId: result.guestId
    }, 201);
  } catch (e) {
    console.error('❌ Error en acceptInvite:', e.message);
    return response.error(req, res, e.message, 400);
  }
});

module.exports = router;
