const service = require('./service');

exports.addContact = (params) => service.addContact(params);
exports.getContacts = (userId) => service.getContacts(userId);
