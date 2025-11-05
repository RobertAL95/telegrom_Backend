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
exports.generateInvite = async (inviterId) => {
  // 1. Crear conversación vacía si no existe
  const convo = await Conversation.create({
    participants: [inviterId],
    messages: []
  });

  // 2. Generar token con chatId incluido
  const token = jwtUtils.sign({
    inviterId,
    chatId: convo._id,
    role: 'inviter'
  });

  // 3. Generar link con ese chatId
  const link = `${process.env.FRONTEND_URL}/chat/${convo._id}?invite=${token}`;
  return link;
};


// Aceptar invitación
exports.acceptInvite = async (token, guestName) => {
  const decoded = jwtUtils.verify(token);
  const { inviterId, chatId } = decoded;

  // Validar conversación existente
  const convo = await Conversation.findById(chatId);
  if (!convo) throw new Error('Chat no encontrado');

  // Crear invitado
  const guest = new User({ name: guestName, isGuest: true });
  await guest.save();

  // Agregar invitado a la conversación (si no está)
  if (!convo.participants.includes(guest._id)) {
    convo.participants.push(guest._id);
    await convo.save();
  }

  // Generar token de sesión para el invitado (opcional)
  const sessionToken = jwtUtils.sign({
    userId: guest._id,
    chatId,
    role: 'guest'
  });

  return { convo, sessionToken };
};
