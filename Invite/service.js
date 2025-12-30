'use strict';

const { signAccess, verify } = require('../utils/jwt');
const User = require('../globalModels/User');
const UserGuest = require('../globalModels/UserGuest');
const Conversation = require('../globalModels/Conversation');
const { publishEvent } = require('../events/publisher');

// ... (createInvite y validateInvite se quedan igual) ...

// ===================================================
// 🟢 Aceptar invitación (LÓGICA BLINDADA)
// ===================================================
exports.acceptInvite = async (token, guestName) => {
  try {
    const realToken = decodeURIComponent(token);
    const decoded = verify(realToken);
    const { inviter, chatId } = decoded;

    if (!inviter || !chatId) throw new Error('Token inválido');

    // 1) Asegurar que la conversación existe
    const convo = await Conversation.findById(chatId);
    if (!convo) throw new Error('El chat no existe o fue eliminado');

    // 2) Crear usuario invitado (Vinculación fuerte al chatId)
    const guest = await UserGuest.create({
      name: guestName,
      email: `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}@flym.temp`,
      inviterId: inviter, 
      chatId: chatId,    
      isGuest: true
    });

    // 3) Añadir invitado al chat (Evitando duplicados)
    // Convertimos a string para comparar, ya que son ObjectIds
    const isAlreadyIn = convo.participants.some(p => p.toString() === guest._id.toString());
    
    if (!isAlreadyIn) {
        convo.participants.push(guest._id);
        convo.participantsModel.push('UserGuest'); 
        
        // Mensaje de sistema (Opcional pero recomendado para consistencia)
        convo.messages.push({
            sender: guest._id,
            senderModel: 'UserGuest',
            text: '👋 Se ha unido al chat'
        });
        
        await convo.save();
    }

    // 4) 🔍 OBTENER DATOS REALES PARA EL FRONTEND
    // Necesitamos saber cómo se llama el Host para mostrárselo al Invitado
    // Como el Host siempre es el creador (index 0 generalmente), o lo buscamos por ID:
    const hostUser = await User.findById(inviter).select('name avatar');

    // Construimos el objeto de chat "inicial" para el invitado
    const chatForGuest = {
        id: convo._id.toString(),
        name: hostUser ? hostUser.name : "Chat de Invitación", // ✅ El nombre real del Host
        avatar: hostUser ? hostUser.avatar : null,
        lastMessage: '👋 Se ha unido al chat',
        timestamp: Date.now(),
        isGuestChat: true
    };

    // Evento para Analytics (o WebSockets en Paso 3)
    if (publishEvent) {
      await publishEvent('InviteAccepted', {
        chatId,
        inviter,
        guestId: guest._id.toString(),
        guestName,
        fullChat: chatForGuest // Enviamos esto para que el socket lo use luego
      });
    }

    return {
      user: guest,
      chat: chatForGuest, // ✅ Devolvemos el Chat Completo
      inviterId: inviter,
    };
  } catch (e) {
    console.error('❌ Error en acceptInvite:', e);
    throw e; 
  }
};