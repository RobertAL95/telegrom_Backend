'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./controller');
const response = require('../network/response');
const auth = require('../middleware'); // protege usuarios reales
const { verify } = require('../utils/jwt');


/* =====================================================================
   UTILIDAD: Obtener ID del usuario (real o invitado)
   - Usuario real → cookie "at"
   - Invitado     → header "x-guest-token"
===================================================================== */
function getSenderId(req) {
  // 1) Usuario REAL autenticado
  if (req.cookies?.at) {
    const decoded = verify(req.cookies.at);
    if (decoded?.id) return decoded.id;
  }

  // 2) Invitado autenticado
  const guestToken = req.headers['x-guest-token'];
  if (guestToken) {
    const decoded = verify(guestToken);
    if (decoded?.id) return decoded.id;
  }

  return null;
}


/* =====================================================================
   🟢 Crear/obtener conversación (user REAL o invitado)
===================================================================== */
router.post('/conversation', async (req, res) => {
  try {
    const { participants } = req.body;

    if (!participants || !Array.isArray(participants))
      return response.error(req, res, 'Participantes inválidos', 400);

    const convo = await controller.getOrCreateConversation(participants);

    return response.success(req, res, convo, 201);
  } catch (e) {
    console.error('❌ Error en /chat/conversation:', e.message);
    return response.error(req, res, e.message, 500);
  }
});


/* =====================================================================
   🟢 Enviar mensaje (user REAL + invitados)
===================================================================== */
router.post('/:conversationId/message', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text } = req.body;

    if (!text) return response.error(req, res, 'Texto requerido', 400);

    // Obtener ID del que envía el mensaje
    const senderId = getSenderId(req);
    if (!senderId) return response.error(req, res, 'No autenticado', 401);

    const message = await controller.sendMessage(conversationId, senderId, text);

    return response.success(req, res, message, 201);
  } catch (e) {
    console.error('❌ Error en /chat/:id/message:', e.message);
    return response.error(req, res, e.message, 500);
  }
});


/* =====================================================================
   🟢 Obtener mensajes (user REAL + invitados)
===================================================================== */
router.get('/:conversationId/messages', async (req, res) => {
  try {
    // Validar identidad
    const id = getSenderId(req);
    if (!id) return response.error(req, res, 'No autenticado', 401);

    const messages = await controller.getMessages(req.params.conversationId);

    return response.success(req, res, messages, 200);
  } catch (e) {
    console.error('❌ Error en GET /chat/messages:', e.message);
    return response.error(req, res, e.message, 500);
  }
});


/* =====================================================================
   🟢 Conversaciones del usuario REAL (NO invitados)
===================================================================== */
router.get('/user/me', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const convos = await controller.getByUser(userId);

    return response.success(req, res, convos, 200);
  } catch (e) {
    console.error('❌ Error en /chat/user/me:', e.message);
    return response.error(req, res, e.message, 500);
  }
});

module.exports = router;
