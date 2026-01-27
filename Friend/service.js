'use strict';

const Friendship = require('../globalModels/Friendship');
const User = require('../globalModels/User');

// 🟢 Enviar Solicitud de Amistad
exports.sendRequest = async (userId, targetFriendId) => {
    // 1. Verificar que no se auto-agregue
    if (userId === targetFriendId) throw new Error("No puedes agregarte a ti mismo");

    // 2. Verificar si ya existe relación (en cualquier dirección)
    const existing = await Friendship.findOne({
        $or: [
            { requester: userId, recipient: targetFriendId },
            { requester: targetFriendId, recipient: userId }
        ]
    });

    if (existing) {
        if (existing.status === 'accepted') throw new Error("Ya son amigos");
        if (existing.status === 'pending') throw new Error("Ya hay una solicitud pendiente");
    }

    // 3. Crear solicitud
    const newFriendship = await Friendship.create({
        requester: userId,
        recipient: targetFriendId,
        status: 'pending'
    });

    return newFriendship;
};

// 🟢 Aceptar Solicitud
exports.acceptRequest = async (userId, friendshipId) => {
    const friendship = await Friendship.findById(friendshipId);
    if (!friendship) throw new Error("Solicitud no encontrada");

    // Solo el destinatario puede aceptar
    if (friendship.recipient.toString() !== userId) {
        throw new Error("No tienes permiso para aceptar esta solicitud");
    }

    friendship.status = 'accepted';
    await friendship.save();
    return friendship;
};

// 🔴 Rechazar/Cancelar Solicitud (Botón "No aceptar" o "Cancelar")
exports.rejectRequest = async (userId, targetId) => {
    // Buscamos la relación donde participen ambos
    const friendship = await Friendship.findOne({
        $or: [
            { requester: userId, recipient: targetId },
            { requester: targetId, recipient: userId }
        ]
    });

    if (!friendship) throw new Error("No existe relación para eliminar");

    // Borramos la entrada de la base de datos
    await Friendship.findByIdAndDelete(friendship._id);
    return { deleted: true };
};

// 🔍 Verificar Estado (Para el Modal del Frontend)
exports.checkStatus = async (myUserId, otherUserId) => {
    const friendship = await Friendship.findOne({
        $or: [
            { requester: myUserId, recipient: otherUserId },
            { requester: otherUserId, recipient: myUserId }
        ]
    });

    if (!friendship) return { status: 'none' };

    // Si está aceptada
    if (friendship.status === 'accepted') return { status: 'friends', friendshipId: friendship._id };

    // Si está pendiente, hay que ver quién la envió
    if (friendship.requester.toString() === myUserId) {
        return { status: 'sent_pending', friendshipId: friendship._id }; // Yo la envié
    } else {
        return { status: 'received_pending', friendshipId: friendship._id }; // Me la enviaron (mostrar botón Aceptar)
    }
};

// 📜 Listar Amigos (Opcional, para futura lista de contactos)
exports.listFriends = async (userId) => {
    const friends = await Friendship.find({
        $or: [{ requester: userId }, { recipient: userId }],
        status: 'accepted'
    }).populate('requester recipient', 'name avatar email friendId');

    // Limpiar la respuesta para devolver solo al "otro" usuario
    return friends.map(f => {
        const isRequester = f.requester._id.toString() === userId;
        return isRequester ? f.recipient : f.requester;
    });
};
// 🔢 Contar solicitudes pendientes (Para la campana de notificaciones)
exports.countPendingReceived = async (userId) => {
    return await Friendship.countDocuments({ 
        recipient: userId, 
        status: 'pending' 
    });
};

// 📋 Obtener lista detallada de solicitudes pendientes (Para el dropdown)
exports.getPendingRequestsDetails = async (userId) => {
    return await Friendship.find({ 
        recipient: userId, 
        status: 'pending' 
    })
    .populate('requester', 'name avatar email friendId') // Traemos datos del que envía
    .sort({ createdAt: -1 }); // Orden cronológico (más reciente primero)
};