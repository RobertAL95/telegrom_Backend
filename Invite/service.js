const jwtUtils = require('../utils/jwt');
const User = require('../Auth/model');
const Conversation = require('../Chat/model');

exports.acceptInvite = async (token, guestName) => {
  const decoded = jwtUtils.verify(token);
  const inviterId = decoded.inviter;
  if (!inviterId) throw new Error('Token inválido');

  // Crear invitado
  const guest = await User.create({
    name: guestName,
    email: `guest_${Date.now()}@flym.local`,
    isGuest: true,
  });

  // Crear conversación efímera
  const convo = await Conversation.create({
    participants: [inviterId, guest._id],
    messages: [],
  });

  // 🔸 Nuevo: generar token para el invitado
  const guestToken = jwtUtils.sign(
    {
      id: guest._id.toString(),
      name: guestName,
      inviter: inviterId,
      isGuest: true,
    },
    '12h'
  );

  return {
    roomId: convo._id.toString(),
    guestToken,
    inviterId,
  };
};
