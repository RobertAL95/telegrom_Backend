const Conversation = require('./model');
const User = require('../Auth/model');
const bcrypt = require('bcrypt');
const jwtUtils = require('../utils/jwt');

// Obtener o crear conversación
exports.getOrCreateConversation = async (participants) => {
  const participantIds = [];

  for (const p of participants) {
    if (p === 'guest') {
      // Crear usuario temporal
      const guestUser = new User({
        name: 'Invitado',
        email: `guest_${Date.now()}@flym.local`,
        password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10),
        isGuest: true
      });
      await guestUser.save();
      participantIds.push(guestUser._id);
    } else {
      participantIds.push(p);
    }
  }

  // Buscar conversación existente con mismos participantes
  let convo = await Conversation.findOne({
    participants: { $all: participantIds, $size: participantIds.length }
  });

  if (!convo) {
    convo = await Conversation.create({ participants: participantIds, messages: [] });
  }

  return convo;
};

// Enviar mensaje
exports.sendMessage = async (conversationId, senderId, text) => {
  const convo = await Conversation.findById(conversationId);
  if (!convo) throw new Error('Conversación no encontrada');

  const message = { sender: senderId, text };
  convo.messages.push(message);
  await convo.save();

  return message;
};

// Obtener mensajes
exports.getMessages = async (conversationId) => {
  const convo = await Conversation.findById(conversationId)
    .populate('messages.sender', 'name email');
  if (!convo) throw new Error('Conversación no encontrada');

  return convo.messages;
};

// Obtener conversaciones de usuario
exports.getByUser = async (userId) => {
  return await Conversation.find({ participants: userId }).populate('participants', 'name email');
};

// Generar link de invitación
exports.generateInvite = (inviterId) => {
  const token = jwtUtils.sign({ inviter: inviterId });
  const link = `${process.env.FRONTEND_URL}/chat?invite=${token}`;
  return link;
};

// Aceptar invitación
exports.acceptInvite = async (token, guestName) => {
  const decoded = jwtUtils.verify(token);
  const inviterId = decoded.inviter;

  const guest = new User({ name: guestName, isGuest: true });
  await guest.save();

  const convo = await exports.getOrCreateConversation([inviterId, guest._id]);
  return convo;
};
