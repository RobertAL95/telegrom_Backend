const service = require('./service');

exports.createInvite = (userId) => service.createInvite(userId);
exports.validateInvite = (token) => service.validateInvite(token);
exports.acceptInvite = (token, guestName) => service.acceptInvite(token, guestName);
