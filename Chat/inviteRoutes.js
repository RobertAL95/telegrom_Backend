const express = require('express');
const response = require('../network/response');
const jwtUtils = require('../utils/jwt');
const controller = require('./controller');
const User = require('../User/model');

const router = express.Router();

// Generar link de invitación
router.post('/invite', (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return response.error(req, res, 'Falta userId', 400);

    const token = jwtUtils.sign({ inviter: userId });
    const link = `${process.env.FRONTEND_URL}/chat?invite=${token}`;

    response.success(req, res, { link }, 200);
  } catch (e) {
    response.error(req, res, e.message, 500);
  }
});

// Aceptar invitación
router.post('/accept-invite', async (req, res) => {
  try {
    const { token, guestName } = req.body;
    if (!token || !guestName) return response.error(req, res, 'Faltan datos', 400);

    const decoded = jwtUtils.verify(token);
    const inviterId = decoded.inviter;

    const guest = await User.create({ name: guestName, isGuest: true });

    const convo = await controller.getOrCreateConversation([inviterId, guest._id]);
    response.success(req, res, convo, 201);
  } catch (e) {
    response.error(req, res, e.message, 500);
  }
});

module.exports = router;
