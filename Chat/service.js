'use strict';

const Conversation = require('../globalModels/Conversation');
const User = require('../globalModels/User'); 
const UserGuest = require('../globalModels/UserGuest'); 

// =======================================================
// 🟢 Crear o recuperar conversación
// =======================================================
exports.getOrCreateConversation = async (participants) => {
    const ids = [];
    const models = [];
    
    for (const p of participants) {
        const user = await User.findById(p) || await UserGuest.findById(p);
        if (!user) throw new Error('Usuario no encontrado: ' + p);
        
        ids.push(user._id);
        models.push(user.isGuest ? 'UserGuest' : 'User');
    }
    
    let convo = await Conversation.findOne({
        participants: { $all: ids, $size: ids.length }
    });
    
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
// 🟢 Enviar mensaje
// =======================================================
exports.sendMessage = async (conversationId, senderId, text) => {
    const convo = await Conversation.findById(conversationId);
    if (!convo) throw new Error('Conversación no encontrada');
    
    // Determinar modelo del sender
    let sender = await User.findById(senderId);
    let senderModel = 'User';
    
    if (!sender) {
        sender = await UserGuest.findById(senderId);
        senderModel = 'UserGuest';
    }
    if (!sender) throw new Error('Sender inválido');

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
// 🟢 Obtener mensajes
// =======================================================
exports.getMessages = async (conversationId) => {
    const convo = await Conversation.findById(conversationId)
        .populate({ path: 'messages.sender', select: 'name email avatar' });
        
    if (!convo) throw new Error('Conversación no encontrada');
    return convo.messages;
};

// =======================================================
// 🟢 Obtener conversaciones por usuario
// =======================================================
exports.getByUser = async (userId) => {
    if (!userId) return [];

    // 🔥 FIX: Usamos $in para evitar el error de Mongoose con strings
    return await Conversation.find({
        participants: { $in: [userId] }
    })
    .populate({
        path: 'participants',
        select: 'name email avatar'
    })
    .populate({
        path: 'messages.sender',
        select: 'name'
    })
    .sort({ updatedAt: -1 });
};