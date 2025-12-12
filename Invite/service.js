'use strict';

const { signAccess, verify } = require('../utils/jwt');
const User = require('../globalModels/User');
const UserGuest = require('../globalModels/UserGuest');
const Conversation = require('../globalModels/Conversation');
const { publishEvent } = require('../events/publisher');

// ===================================================
// 🟢 Crear invitación (host ya logueado)
// ===================================================
exports.createInvite = async (userId) => {
  try {
    // 1) Crear conversación vacía
    // Guardamos participantsModel para coincidir con el Schema nuevo
    const convo = await Conversation.create({
      participants: [userId],
      participantsModel: ['User'], // Asumimos que el creador es un User registrado
      messages: [],
    });

    // 2) Token firmado con chatId + hostId
    const token = signAccess({
      inviter: userId,
      chatId: convo._id.toString(),
      type: 'invite-token',
    });

    // 3) Generar link
    const safeToken = encodeURIComponent(token);
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const link = `${baseUrl}/invite/${safeToken}`;

    // Evento (Analytics)
    if (publishEvent) {
      await publishEvent('InviteCreated', {
        inviter: userId,
        chatId: convo._id.toString(),
        link,
      });
    }

    return { link, chatId: convo._id.toString() };
  } catch (e) {
    console.error('❌ Error en createInvite:', e);
    throw new Error('No se pudo crear la invitación');
  }
};

// ===================================================
// 🟡 Validar token de invitación
// ===================================================
exports.validateInvite = async (token) => {
  try {
    const realToken = decodeURIComponent(token);
    const decoded = verify(realToken);
    return !!decoded?.chatId;
  } catch (e) {
    console.error('❌ validateInvite:', e.message);
    return false;
  }
};

// ===================================================
// 🟢 Aceptar invitación (Fix InviterId + ChatId + Models)
// ===================================================
exports.acceptInvite = async (token, guestName) => {
  try {
    const realToken = decodeURIComponent(token);
    const decoded = verify(realToken);

    const { inviter, chatId } = decoded;

    if (!inviter || !chatId) throw new Error('Token inválido');

    // 1) Asegurar que la conversación existe
    const convo = await Conversation.findById(chatId);
    if (!convo) throw new Error('El chat no existe');

    // 2) Crear usuario invitado efímero
    // 🔥 AQUÍ ESTÁ EL FIX: Agregamos 'chatId' que faltaba
    const guest = await UserGuest.create({
      name: guestName,
      email: `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}@flym.temp`,
      inviterId: inviter, // Requerido por Schema
      chatId: chatId,     // Requerido por Schema (El que fallaba)
      isGuest: true
    });

    // 3) Añadir invitado al chat (multiusuario)
    // Sincronizamos participants y participantsModel manualmente
    const isAlreadyIn = convo.participants.some(p => p.toString() === guest._id.toString());
    
    if (!isAlreadyIn) {
        convo.participants.push(guest._id);
        convo.participantsModel.push('UserGuest'); // Indispensable para el nuevo Schema
        await convo.save();
    }

    // Evento
    if (publishEvent) {
      await publishEvent('InviteAccepted', {
        chatId,
        inviter,
        guestId: guest._id.toString(),
        guestName,
      });
    }

    // Retornamos el objeto para que el Controller genere la cookie
    return {
      user: guest,
      roomId: chatId,
      inviterId: inviter,
    };
  } catch (e) {
    console.error('❌ Error en acceptInvite:', e);
    throw e; 
  }
};