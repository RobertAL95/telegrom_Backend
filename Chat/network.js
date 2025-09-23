const express = require('express');
const controller = require('./controller');
const response = require('../network/response');

const router = express.Router();

// Crear o recuperar conversación
router.post('/conversation', async (req, res) => {
  try {
    const { participants } = req.body; // array de userIds
    const convo = await controller.getOrCreateConversation(participants);
    response.success(req, res, convo, 201);
  } catch (e) {
    response.error(req, res, e.message, 500);
  }
});

// Enviar mensaje
router.post('/:conversationId/message', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { sender, text } = req.body;

    const message = await controller.sendMessage(conversationId, sender, text);
    response.success(req, res, message, 201);
  } catch (e) {
    response.error(req, res, e.message, 500);
  }
});

// Obtener mensajes de una conversación
router.get('/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await controller.getMessages(conversationId);
    response.success(req, res, messages, 200);
  } catch (e) {
    response.error(req, res, e.message, 500);
  }
});

// Obtener todas las conversaciones de un usuario
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const convos = await controller.getByUser(userId);
    response.success(req, res, convos, 200);
  } catch (e) {
    response.error(req, res, e.message, 500);
  }
});

module.exports = router;
