const express = require('express');
const router = express.Router();
const response = require('../network/response');
const controller = require('./controller');
const jwtUtils = require('../utils/jwt');

// POST /invite  -> genera link (intenta sacar userId del token Authorization)
router.post('/', async (req, res) => {
  try {
    // Si frontend manda Authorization: Bearer <token> (login token), verificamos y extraemos userId
    let userId = null;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        const decoded = jwtUtils.verify(token);
        userId = decoded.id || decoded.userId || decoded.inviter;
      }
    } catch (e) {
      // no pasa nada, intentaremos leer userId por body
    }

    if (!userId) userId = req.body.userId;
    if (!userId) return response.error(req, res, 'Falta userId', 400);

    const link = controller.createInvite(userId);
    response.success(req, res, { link }, 200);
  } catch (e) {
    response.error(req, res, e.message, 500);
  }
});

// POST /invite/accept -> { token, guestName } -> crea guest y conversación
router.post('/accept', async (req, res) => {
  try {
    const { token, guestName } = req.body;
    if (!token || !guestName) return response.error(req, res, 'Faltan datos', 400);

    const convo = await controller.acceptInvite(token, guestName);
    response.success(req, res, convo, 201);
  } catch (e) {
    response.error(req, res, e.message || 'Error', 400);
  }
});

module.exports = router;
