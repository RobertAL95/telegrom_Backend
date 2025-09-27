const jwtUtils = require('../utils/jwt');
const User = require('../Auth/model');      // ruta relativa desde Invite/
const Conversation = require('../Chat/model');

exports.createInvite = (userId) => {
  // firma un token VARIANTE de invitación (podría tener expiración)
  const token = jwtUtils.sign({ inviter: userId });
  const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/chat?invite=${token}`;
  return link;
};

exports.acceptInvite = async (token, guestName) => {
  const decoded = jwtUtils.verify(token); // { inviter: userId, iat... }
  const inviterId = decoded.inviter || decoded.id || decoded.userId || decoded.id; // por si cambias payload
  if (!inviterId) throw new Error('Token inválido - no inviter');

  // crear usuario invitado temporal
  const guest = new User({ name: guestName, isGuest: true });
  await guest.save();

  // crear conversación entre inviter y guest
  const convo = await Conversation.create({
    participants: [inviterId, guest._id],
    messages: []
  });

  return convo;
};
