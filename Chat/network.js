'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./controller');
const response = require('../network/response');
const auth = require('../middleware'); 

const optionalAuth = (req, res, next) => {

    auth(req, res, next);
}

// =====================================================================
// 🟢 Crear/obtener conversación (user REAL o invitado)
// =====================================================================
router.post('/conversation', auth, async (req, res) => { // 👈 Protegido por 'auth'
  try {
    const { participants } = req.body;

    // Validación extra: asegurarse de que el usuario que hace la petición es uno de los participantes
    if (!req.user || !participants.includes(req.user.id)) {
        return response.error(req, res, 'El usuario debe ser un participante', 403);
    }

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
router.post('/:conversationId/message', auth, async (req, res) => { // 👈 Protegido por 'auth'
  try {
    const { conversationId } = req.params;
    const { text } = req.body;

    if (!text) return response.error(req, res, 'Texto requerido', 400);

    // Obtener ID del que envía el mensaje: ¡Usamos req.user.id!
    const senderId = req.user.id; 
    
    // Si authMiddleware falla, se devuelve 401/403 antes de llegar aquí.
    // No es necesario el check 'if (!senderId)'.
    
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
router.get('/:conversationId/messages', auth, async (req, res) => { // 👈 Protegido por 'auth'
  try {
    // Validar identidad: ¡Usamos req.user.id!
    const id = req.user.id;
    
    // No es necesario el check 'if (!id)'.
    
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
    // Check de política extra: Solo usuarios reales deberían usar esta ruta
    if (req.user.isGuest) {
        return response.error(req, res, 'Invitados no tienen lista de chats persistente', 403);
    }
    
    const userId = req.user.id;
    const convos = await controller.getByUser(userId);

    return response.success(req, res, convos, 200);
  } catch (e) {
    console.error('❌ Error en /chat/user/me:', e.message);
    return response.error(req, res, e.message, 500);
  }
});

module.exports = router;