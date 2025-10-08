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

// Generar link de invitación
router.post('/invite', (req, res) => {
  try {
    const link = controller.generateInvite(req.body.userId);
    response.success(req, res, { link }, 200);
  } catch (e) {
    response.error(req, res, e.message, 500);
  }
});

// Aceptar invitación
router.post('/accept-invite', async (req, res) => {
  try {
    const convo = await controller.acceptInvite(req.body.token, req.body.guestName);
    response.success(req, res, convo, 201);
  } catch (e) {
    response.error(req, res, e.message, 500);
  }
});

module.exports = router;
