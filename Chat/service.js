'use strict';

const Conversation = require('../globalModels/Conversation');
const User = require('../globalModels/User'); 
const UserGuest = require('../globalModels/UserGuest'); 
const mongoose = require('mongoose');

// =======================================================
// 🟢 Create or retrieve conversation
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
// 🟢 Send message
// =======================================================
exports.sendMessage = async (conversationId, senderId, text, media = null) => { 
    const convo = await Conversation.findById(conversationId);
    if (!convo) throw new Error('Conversación no encontrada');
    
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
        text: text || '', 
        media: media      
    };
    
    // Al hacer push, Mongoose crea el subdocumento (con _id y timestamp si está en el esquema)
    convo.messages.push(message);
    await convo.save();

    return convo.messages[convo.messages.length - 1];
};

// =======================================================
// 🟢 Get messages (Actualizado y Mapeado para el Frontend)
// =======================================================
exports.getMessages = async (conversationId) => {
    // Usamos .lean() para devolver JSON puro (es más rápido)
    const convo = await Conversation.findById(conversationId)
        .populate({ path: 'messages.sender', select: 'name email avatar' })
        .lean(); 
        
    if (!convo) throw new Error('Conversación no encontrada');

    // Formateamos los mensajes para que coincidan con la interfaz de React (from, timestamp, media)
    const formattedMessages = convo.messages.map(msg => ({
        _id: msg._id,
        from: msg.sender ? msg.sender._id.toString() : null, 
        text: msg.text || '',
        media: msg.media || null, 
        timestamp: msg.createdAt || msg.timestamp || new Date().toISOString(), 
        name: msg.sender ? msg.sender.name : 'Desconocido',
        senderModel: msg.senderModel
    }));

    return formattedMessages;
};

// =======================================================
// ⚡ OPTIMIZED QUERY: Get By User (Aggregation)
// =======================================================
exports.getByUser = async (userId) => {
    if (!userId) return [];

    const userObjectId = new mongoose.Types.ObjectId(userId);

    return await Conversation.aggregate([
        { 
            $match: { participants: userObjectId } 
        },
        {
            $lookup: {
                from: 'users', 
                localField: 'participants',
                foreignField: '_id',
                as: 'usersFound'
            }
        },
        {
            $lookup: {
                from: 'userguests', 
                localField: 'participants',
                foreignField: '_id',
                as: 'guestsFound'
            }
        },
        {
            $project: {
                _id: 1,
                updatedAt: 1,
                lastMessageData: { $arrayElemAt: ["$messages", -1] },
                allParticipants: { $concatArrays: ["$usersFound", "$guestsFound"] }
            }
        },
        {
            $project: {
                id: "$_id",
                _id: 1,
                updatedAt: 1,
                lastMessage: {
                    text: "$lastMessageData.text",
                    createdAt: "$lastMessageData.createdAt"
                },
                participants: {
                    $map: {
                        input: "$allParticipants",
                        as: "p",
                        in: {
                            _id: "$$p._id",
                            name: "$$p.name",
                            email: "$$p.email",
                            avatar: "$$p.avatar",
                            friendId: "$$p.friendId", 
                            isGuest: { $ifNull: ["$$p.isGuest", false] } 
                        }
                    }
                }
            }
        },
        {
            $sort: { updatedAt: -1 }
        }
    ]);
};

// =======================================================
// 🔍 FIND USER BY FRIEND ID
// =======================================================
exports.findUserByFriendId = async (friendId) => {
    // Search only necessary fields, no passwords
    const user = await User.findOne({ friendId: friendId })
        .select('_id name avatar friendId email');
    
    if (!user) {
        throw new Error('Usuario no encontrado');
    }
    return user;
};