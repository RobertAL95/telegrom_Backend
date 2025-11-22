'use strict';

const { signAccess, verify } = require('../utils/jwt');
const User = require('../globalModels/User');           // modelo GLOBAL
const UserGuest = require('../globalModels/UserGuest'); // modelo GLOBAL nuevo
const Conversation = require('../globalModels/Conversation'); // modelo GLOBAL
const { publishEvent } = require('../events/publisher');

// ===================================================
// 🟢 Crear invitación (host ya logueado)
// Crea un chat vacío y genera un TOKEN DE INVITACIÓN
// ===================================================
exports.createInvite = async (userId) => {
  try {
    // 1) Crear conversación vacía donde el host ya está adentro
    const convo = await Conversation.create({
      participants: [userId],
      messages: [],
    });

    // 2) Token firmado con chatId + hostId
    const token = signAccess({
      inviter: userId,
      chatId: convo._id.toString(),
      type: 'invite-token',
    });

    // 3) Codificar para URLs
    const safeToken = encodeURIComponent(token);

    // 4) Generar link directo para el frontend
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const link = `${baseUrl}/invite/${safeToken}`;

    // 🔥 Evento opcional (analytics/monitoring)
    await publishEvent?.('InviteCreated', {
      inviter: userId,
      chatId: convo._id.toString(),
      link,
    });

    return { link, chatId: convo._id.toString() };
  } catch (e) {
    console.error('❌ Error en createInvite:', e);
    throw new Error('No se pudo crear la invitación');
  }
};

// ===================================================
// 🟡 Validar token de invitación
// Solo verifica si el token es válido para mostrar UI al usuario
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
// 🟢 Aceptar invitación y unir invitado a un chat existente
// Soporta múltiples invitados al mismo chat
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
    const guest = await UserGuest.create({
      name: guestName,
      inviter: inviter,
      chatId: chatId,
    });

    // 3) Añadir invitado al chat (multiusuario)
    await Conversation.findByIdAndUpdate(chatId, {
      $addToSet: { participants: guest._id },
    });

    // 4) Crear token efímero de sesión del invitado
    const guestToken = signAccess({
      id: guest._id.toString(),
      chatId,
      inviter,
      isGuest: true,
      role: 'guest',
    });

    // 🔥 Evento opcional
    await publishEvent?.('InviteAccepted', {
      chatId,
      inviter,
      guestId: guest._id.toString(),
      guestName,
    });

    return {
      roomId: chatId,
      guestToken,
      guestId: guest._id.toString(),
    };
  } catch (e) {
    console.error('❌ Error en acceptInvite:', e);
    throw new Error('No se pudo aceptar la invitación');
  }
};
