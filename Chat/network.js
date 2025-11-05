const express = require('express');
const router = express.Router();
const controller = require('./controller');
const response = require('../network/response');

// Crear o recuperar conversación
router.post('/conversation', async (req, res) => {
  try {
    const convo = await controller.getOrCreateConversation(req.body.participants);
    response.success(req, res, convo, 201);
  } catch (e) {
    response.error(req, res, e.message, 500);
  }
});

// Enviar mensaje
router.post('/:conversationId/message', async (req, res) => {
  try {
    const { sender, text } = req.body;
    const message = await controller.sendMessage(req.params.conversationId, sender, text);
    response.success(req, res, message, 201);
  } catch (e) {
    response.error(req, res, e.message, 500);
  }
});

// Obtener mensajes
router.get('/:conversationId/messages', async (req, res) => {
  try {
    const messages = await controller.getMessages(req.params.conversationId);
    response.success(req, res, messages, 200);
  } catch (e) {
    response.error(req, res, e.message, 500);
  }
});

// Conversaciones de un usuario
router.get('/user/:userId', async (req, res) => {
  try {
    const convos = await controller.getByUser(req.params.userId);
    response.success(req, res, convos, 200);
  } catch (e) {
    response.error(req, res, e.message, 500);
  }
});

// ===================================================
// 🟢 Generar link de invitación (crea chatId asociado)
// ===================================================
router.post('/invite', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return response.error(req, res, 'Falta userId', 400);

    // Generar link y chatId desde el controlador
    const { link, chatId } = await controller.generateInvite(userId);

    response.success(req, res, { link, chatId }, 200);
  } catch (e) {
    console.error('❌ Error en /invite:', e.message);
    response.error(req, res, e.message, 500);
  }
});


// ===================================================
// 🟢 Aceptar invitación (usa chatId del token JWT)
// ===================================================
router.post('/accept-invite', async (req, res) => {
  try {
    const { token, guestName } = req.body;
    if (!token || !guestName) return response.error(req, res, 'Faltan datos', 400);

    // Controlador devuelve { convo, sessionToken }
    const { convo, sessionToken } = await controller.acceptInvite(token, guestName);

    response.success(req, res, { chatId: convo._id, sessionToken }, 201);
  } catch (e) {
    console.error('❌ Error en /accept-invite:', e.message);
    response.error(req, res, e.message, 500);
  }
});

module.exports = router;
