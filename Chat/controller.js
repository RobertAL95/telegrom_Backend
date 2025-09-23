const service = require('./service');

exports.getOrCreateConversation = (participants) => service.getOrCreateConversation(participants);
exports.sendMessage = (conversationId, sender, text) => service.sendMessage(conversationId, sender, text);
exports.getMessages = (conversationId) => service.getMessages(conversationId);
exports.getByUser = (userId) => service.getByUser(userId);
