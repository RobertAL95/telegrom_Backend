const Conversation = require('./model');

// Crear o recuperar una conversación con los mismos participantes
exports.getOrCreateConversation = async (participants) => {
  let convo = await Conversation.findOne({ participants: { $all: participants, $size: participants.length } });
  if (!convo) {
    convo = await Conversation.create({ participants, messages: [] });
  }
  return convo;
};

// Enviar mensaje
exports.sendMessage = async (conversationId, sender, text) => {
  const convo = await Conversation.findById(conversationId);
  if (!convo) throw new Error('Conversación no encontrada');

  const message = { sender, text };
  convo.messages.push(message);
  await convo.save();

  return message;
};

// Obtener mensajes de una conversación
exports.getMessages = async (conversationId) => {
  const convo = await Conversation.findById(conversationId).populate('messages.sender', 'name email');
  if (!convo) throw new Error('Conversación no encontrada');

  return convo.messages;
};

// Obtener todas las conversaciones de un usuario
exports.getByUser = async (userId) => {
  return await Conversation.find({ participants: userId }).populate('participants', 'name email');
};
