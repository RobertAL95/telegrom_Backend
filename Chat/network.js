'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./controller');
const response = require('../network/response'); // Ajusta la ruta a tu helper de respuesta
const auth = require('../middleware'); // Ajusta la ruta a tu middleware

// =====================================================================
// 🟢 Crear/obtener conversación
// =====================================================================
router.post('/conversation', auth, function (req, res) {
    const { participants } = req.body;
    
    // Validación básica de HTTP antes de llamar al controller
    if (!participants || !Array.isArray(participants)) {
        return response.error(req, res, 'Participantes inválidos', 400);
    }

    controller.getOrCreateConversation(participants)
        .then((data) => {
            response.success(req, res, data, 201);
        })
        .catch((e) => {
            response.error(req, res, e.message, 500);
        });
});

// =====================================================================
// 🟢 Enviar mensaje
// =====================================================================
router.post('/:conversationId/message', auth, function (req, res) {
    const { conversationId } = req.params;
    const { text } = req.body;
    const senderId = req.user.id; // Extraído por el middleware

    controller.sendMessage(conversationId, senderId, text)
        .then((data) => {
            response.success(req, res, data, 201);
        })
        .catch((e) => {
            response.error(req, res, e.message, 500);
        });
});

// =====================================================================
// 🟢 Obtener mensajes de un chat
// =====================================================================
router.get('/:conversationId/messages', auth, function (req, res) {
    controller.getMessages(req.params.conversationId)
        .then((list) => {
            response.success(req, res, list, 200);
        })
        .catch((e) => {
            response.error(req, res, e.message, 500);
        });
});

// =====================================================================
// 🟢 Mis Chats (El que fallaba)
// =====================================================================
router.get('/user/me', auth, function (req, res) {
    // Validación de capa de red: Invitados no pasan
    if (req.user.isGuest) {
        return response.error(req, res, 'Invitados no tienen historial', 403);
    }

    const userId = req.user.id;

    controller.getByUser(userId)
        .then((list) => {
            response.success(req, res, list, 200);
        })
        .catch((e) => {
            // Aquí caerá el error si el service falla, pero ya lo arreglamos
            response.error(req, res, e.message, 500);
        });
});

module.exports = router;