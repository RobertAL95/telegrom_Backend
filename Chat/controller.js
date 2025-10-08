const chatService = require('./service');

exports.getOrCreateConversation = (participants) => chatService.getOrCreateConversation(participants);
exports.sendMessage = (conversationId, sender, text) => chatService.sendMessage(conversationId, sender, text);
exports.getMessages = (conversationId) => chatService.getMessages(conversationId);
exports.getByUser = (userId) => chatService.getByUser(userId);
exports.generateInvite = (userId) => chatService.generateInvite(userId);
exports.acceptInvite = (token, guestName) => chatService.acceptInvite(token, guestName);
