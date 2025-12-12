'use strict';

const service = require('./service');

function getOrCreateConversation(participants) {
    if (!participants || participants.length === 0) {
        return Promise.reject('No hay participantes');
    }
    return service.getOrCreateConversation(participants);
}

function sendMessage(conversationId, senderId, text) {
    if (!conversationId || !senderId || !text) {
        return Promise.reject('Datos inválidos para enviar mensaje');
    }
    return service.sendMessage(conversationId, senderId, text);
}

function getMessages(conversationId) {
    if (!conversationId) {
        return Promise.reject('ID de conversación necesario');
    }
    return service.getMessages(conversationId);
}

function getByUser(userId) {
    if (!userId) {
        return Promise.reject('Usuario inválido');
    }
    // Llama al servicio que contiene el fix de Mongoose
    return service.getByUser(userId);
}

module.exports = {
    getOrCreateConversation,
    sendMessage,
    getMessages,
    getByUser,
};