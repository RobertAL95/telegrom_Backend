'use strict';

const mongoose = require('mongoose'); // ✅ NECESARIO para generar IDs
const jwt = require('jsonwebtoken'); 
const User = require('../globalModels/User');
const UserGuest = require('../globalModels/UserGuest');
const Conversation = require('../globalModels/Conversation');
const { publishEvent } = require('../events/publisher');

// ===================================================
// 🟢 1. Crear Invitación
// ===================================================
exports.createInvite = async (body, userId) => {
    const { chatId } = body;

    const payload = {
        inviter: userId,
        type: chatId ? 'group_invite' : 'direct_invite',
        chatId: chatId || null,
        iat: Date.now()
    };

    const secret = process.env.JWT_SECRET || 'secret'; 
    const token = jwt.sign(payload, secret, { expiresIn: '24h' });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const link = `${frontendUrl}/invite/${token}`;

    return { link, token, mode: payload.type };
};

// ===================================================
// 🟢 2. Validar Invitación
// ===================================================
exports.validateInvite = async (token) => {
    try {
        const secret = process.env.JWT_SECRET || 'secret';
        const decoded = jwt.verify(token, secret);

        const inviter = await User.findById(decoded.inviter).select('name avatar');
        
        let chatName = 'Chat Directo';
        if (decoded.chatId) {
             const convo = await Conversation.findById(decoded.chatId);
             if (convo) chatName = convo.name;
        }

        return {
            valid: true,
            type: decoded.type,
            inviterName: inviter ? inviter.name : 'Usuario',
            inviterAvatar: inviter ? inviter.avatar : null,
            chatName: chatName
        };

    } catch (error) {
        return { valid: false, message: 'Invitación expirada o inválida' };
    }
};

// ===================================================
// 🟢 3. Aceptar Invitación (FIX VALIDACIÓN CHATID)
// ===================================================
exports.acceptInvite = async (token, guestName) => {
  try {
    const secret = process.env.JWT_SECRET || 'secret';
    const decoded = jwt.verify(token, secret);
    const { inviter, type, chatId } = decoded;

    if (!inviter) throw new Error('Token inválido');

    // ----------------------------------------------------
    // 🔧 FIX CRÍTICO: PRE-CALCULAR EL CHAT ID
    // ----------------------------------------------------
    // El modelo UserGuest exige un chatId obligatorio.
    // Si es grupo, usamos el que viene. Si es personal, generamos uno nuevo YA.
    let targetChatId = chatId;
    if (!targetChatId) {
        targetChatId = new mongoose.Types.ObjectId(); // Generamos ID virgen
    }

    // 1) Crear el Usuario Invitado (Ahora sí lleva chatId)
    const guest = await UserGuest.create({
      name: guestName,
      email: `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}@flym.temp`,
      inviterId: inviter, 
      isGuest: true,
      chatId: targetChatId // ✅ Satisfacemos la validación "required"
    });

    let targetChat;

    // 2A) ESCENARIO GRUPO (Chat ya existe)
    if (type === 'group_invite' && chatId) {
        targetChat = await Conversation.findById(chatId);
        if (!targetChat) throw new Error('Chat no existe');
        
        const isIn = targetChat.participants.some(p => p.toString() === guest._id.toString());
        if (!isIn) {
            targetChat.participants.push(guest._id);
            targetChat.participantsModel.push('UserGuest');
            await targetChat.save();
        }
    } 
    // 2B) ESCENARIO DIRECTO (Crear Chat con el ID Pre-generado)
    else {
        targetChat = await Conversation.create({
            _id: targetChatId, // ✅ Usamos el mismo ID que le dimos al Guest
            participants: [inviter, guest._id],
            participantsModel: ['User', 'UserGuest'],
            isGroup: false,
            messages: [{
                sender: guest._id,
                senderModel: 'UserGuest',
                text: '👋 Hola, he aceptado tu invitación.',
                timestamp: Date.now()
            }]
        });
    }

    // 3) Respuesta al Frontend
    const hostUser = await User.findById(inviter).select('name avatar');

    const chatForGuest = {
        id: targetChat._id.toString(),
        name: hostUser ? hostUser.name : "Anfitrión", 
        avatar: hostUser ? hostUser.avatar : null,
        lastMessage: '👋 Hola, he aceptado tu invitación.',
        timestamp: Date.now(),
        isGuestChat: true
    };

    // 4) Notificación WS
    if (publishEvent) {
      await publishEvent('InviteAccepted', {
        chatId: targetChat._id.toString(),
        inviterId: inviter,
        guestId: guest._id.toString(),
        guestName,
        fullChat: chatForGuest 
      });
    }

    return {
      user: guest,
      chat: chatForGuest,
      inviterId: inviter,
    };

  } catch (e) {
    console.error('❌ Error en acceptInvite:', e);
    throw e; 
  }
};