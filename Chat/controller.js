'use strict';

const service = require('./service');

exports.getOrCreateConversation = (participants) =>
  service.getOrCreateConversation(participants);

exports.sendMessage = (conversationId, senderId, text) =>
  service.sendMessage(conversationId, senderId, text);

exports.getMessages = (conversationId) =>
  service.getMessages(conversationId);

exports.getByUser = (userId) =>
  service.getByUser(userId);
