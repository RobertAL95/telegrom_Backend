const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const ConversationSchema = new mongoose.Schema({
  chatId: { type: String, unique: true, default: () => new mongoose.Types.ObjectId().toString() },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  messages: [MessageSchema],
  createdAt: { type: Date, default: Date.now },
});


module.exports = mongoose.model('Conversation', ConversationSchema);
