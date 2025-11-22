'use strict';

const Conversation = require('../globalModels/Conversation');
const User = require('../globalModels/User');
const UserGuest = require('../globalModels/UserGuest');

// =======================================================
// 🟢 Crear o recuperar conversación multiusuario
// =======================================================
exports.getOrCreateConversation = async (participants) => {
  const ids = [];
  const models = [];

  // -----------------------------------------------
  // Validar que cada ID corresponde a User o Guest
  // -----------------------------------------------
  for (const p of participants) {
    const user =
      await User.findById(p) ||
      await UserGuest.findById(p);

    if (!user) {
      throw new Error('Usuario no encontrado: ' + p);
    }

    ids.push(user._id);

    // IMPORTANTE para Conversation.participantsModel
    models.push(user.isGuest ? 'UserGuest' : 'User');
  }

  // -----------------------------------------------
  // Buscar conversación existente EXACTA
  // -----------------------------------------------
  let convo = await Conversation.findOne({
    participants: { $all: ids, $size: ids.length }
  });

  // -----------------------------------------------
  // Crear conversación si no existe
  // -----------------------------------------------
  if (!convo) {
    convo = await Conversation.create({
      participants: ids,
      participantsModel: models,
      messages: []
    });
  }

  return convo;
};

// =======================================================
// 🟢 Enviar mensaje (usuarios reales o invitados)
// =======================================================
exports.sendMessage = async (conversationId, senderId, text) => {
  const convo = await Conversation.findById(conversationId);
  if (!convo) throw new Error('Conversación no encontrada');

  // -----------------------------------------------
  // Validar sender y determinar modelo
  // -----------------------------------------------
  let sender = await User.findById(senderId);
  let senderModel = 'User';

  if (!sender) {
    sender = await UserGuest.findById(senderId);
    senderModel = 'UserGuest';
  }

  if (!sender) {
    throw new Error('Sender inválido');
  }

  // -----------------------------------------------
  // Crear mensaje con senderModel (refPath REQUIRED)
  // -----------------------------------------------
  const message = {
    sender: sender._id,
    senderModel,
    text
  };

  convo.messages.push(message);
  await convo.save();

  return message;
};

// =======================================================
// 🟢 Obtener mensajes con populate (User + UserGuest)
// =======================================================
exports.getMessages = async (conversationId) => {
  const convo = await Conversation.findById(conversationId)
    .populate({
      path: 'messages.sender',
      select: 'name email avatar'
    });

  if (!convo) throw new Error('Conversación no encontrada');

  return convo.messages;
};

// =======================================================
// 🟢 Obtener conversaciones por usuario real o invitado
// =======================================================
exports.getByUser = async (userId) => {
  return await Conversation.find({ participants: userId })
    .populate({
      path: 'participants',
      select: 'name email avatar'
    })
    .sort({ updatedAt: -1 });
};
