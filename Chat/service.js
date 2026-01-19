'use strict';

const Conversation = require('../globalModels/Conversation');
const User = require('../globalModels/User'); 
const UserGuest = require('../globalModels/UserGuest'); 
const mongoose = require('mongoose');

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
    
    // Buscar si existe (coincidencia exacta de participantes)
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
    // lastMessage se actualiza solo gracias a tu middleware .pre('save')
    await convo.save();
    return message;
};

// =======================================================
// 🟢 Obtener mensajes
// =======================================================
exports.getMessages = async (conversationId) => {
    // Aquí mantenemos populate porque es una sola conversación y es eficiente
    // para paginación futura.
    const convo = await Conversation.findById(conversationId)
        .populate({ path: 'messages.sender', select: 'name email avatar' });
        
    if (!convo) throw new Error('Conversación no encontrada');
    return convo.messages;
};

// =======================================================
// ⚡ QUERY OPTIMIZADA: Get By User (Aggregation)
// =======================================================
exports.getByUser = async (userId) => {
    if (!userId) return [];

    const userObjectId = new mongoose.Types.ObjectId(userId);

    return await Conversation.aggregate([
        // 1. MATCH: Filtrar chats donde estoy yo
        { 
            $match: { participants: userObjectId } 
        },

        // 2. LOOKUP POLIMÓRFICO: 
        // Como 'participants' tiene IDs mezclados de Users y Guests, 
        // y Aggregation no lee 'refPath', hacemos lookup a ambas tablas.
        {
            $lookup: {
                from: 'users', // Colección real de MongoDB
                localField: 'participants',
                foreignField: '_id',
                as: 'usersFound'
            }
        },
        {
            $lookup: {
                from: 'userguests', // Colección real de MongoDB
                localField: 'participants',
                foreignField: '_id',
                as: 'guestsFound'
            }
        },

        // 3. PROYECCIÓN INTELIGENTE
        // Fusionamos los usuarios encontrados y extraemos el último mensaje del array
        {
            $project: {
                _id: 1,
                updatedAt: 1,
                // Extraer el último mensaje del array embebido 'messages'
                lastMessageData: { $arrayElemAt: ["$messages", -1] },
                
                // Unir los dos arrays de usuarios encontrados en uno solo
                allParticipants: { $concatArrays: ["$usersFound", "$guestsFound"] }
            }
        },

        // 4. LIMPIEZA FINAL
        // Formateamos para que el Frontend reciba exactamente lo que espera
        {
            $project: {
                id: "$_id",
                _id: 1,
                updatedAt: 1,
                
                // Info del último mensaje
                lastMessage: {
                    text: "$lastMessageData.text",
                    createdAt: "$lastMessageData.createdAt"
                },

                // Lista de participantes limpia (sin passwords, etc.)
                participants: {
                    $map: {
                        input: "$allParticipants",
                        as: "p",
                        in: {
                            _id: "$$p._id",
                            name: "$$p.name",
                            email: "$$p.email",
                            avatar: "$$p.avatar",
                            friendId: "$$p.friendId", // Tu nueva feature
                            isGuest: { $ifNull: ["$$p.isGuest", false] } // Flag útil
                        }
                    }
                }
            }
        },

        // 5. SORT: Lo más reciente primero (usando el timestamp del chat o del mensaje)
        {
            $sort: { updatedAt: -1 }
        }
    ]);
};