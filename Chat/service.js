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
exports.sendMessage = async (conversationId, senderId, text) => {
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
        text
    };
    
    convo.messages.push(message);
    await convo.save();
    return message;
};

// =======================================================
// 🟢 Get messages
// =======================================================
exports.getMessages = async (conversationId) => {
    const convo = await Conversation.findById(conversationId)
        .populate({ path: 'messages.sender', select: 'name email avatar' });
        
    if (!convo) throw new Error('Conversación no encontrada');
    return convo.messages;
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
// 🔍 FIND USER BY FRIEND ID (New Feature)
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