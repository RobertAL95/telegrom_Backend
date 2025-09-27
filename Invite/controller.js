const service = require('./service');

exports.createInvite = (reqBodyOrUserId) => {
  // si se recibe solo userId
  return service.createInvite(reqBodyOrUserId);
};

exports.acceptInvite = async (token, guestName) => {
  return await service.acceptInvite(token, guestName);
};
