'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./controller');
const response = require('../network/response'); 
const auth = require('../middleware'); 

// =====================================================================
// 🔍 SEARCH USER BY FRIEND ID
// =====================================================================
router.get('/search/:friendId', auth, function (req, res) {
    controller.searchUser(req.params.friendId)
        .then((user) => {
            response.success(req, res, user, 200);
        })
        .catch((e) => {
            // 404 if not found
            response.error(req, res, e.message, 404);
        });
});

// =====================================================================
// 🟢 CREATE/GET CONVERSATION (Called when pressing Enter in search)
// =====================================================================
// Adjusted to root '/' to match standard REST and your frontend call likely being /chat
router.post('/', auth, function (req, res) {
    // If the frontend sends { userId: '...' }, we convert it to participants array here
    // OR if it sends { participants: [...] }, we use that.
    let { participants, userId } = req.body;

    if (userId) {
        participants = [req.user.id, userId];
    }
    
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
// 🟢 SEND MESSAGE
// =====================================================================
router.post('/:conversationId/message', auth, function (req, res) {
    const { conversationId } = req.params;
    const { text } = req.body;
    const senderId = req.user.id; 

    controller.sendMessage(conversationId, senderId, text)
        .then((data) => {
            response.success(req, res, data, 201);
        })
        .catch((e) => {
            response.error(req, res, e.message, 500);
        });
});

// =====================================================================
// 🟢 GET MESSAGES
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
// 🟢 MY CHATS
// =====================================================================
router.get('/user/me', auth, function (req, res) {
    if (req.user.isGuest) {
        return response.error(req, res, 'Invitados no tienen historial', 403);
    }

    const userId = req.user.id;

    controller.getByUser(userId)
        .then((list) => {
            response.success(req, res, list, 200);
        })
        .catch((e) => {
            response.error(req, res, e.message, 500);
        });
});

module.exports = router;