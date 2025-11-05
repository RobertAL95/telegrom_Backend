const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  roomId: String,
  fromUser: String,
  toUserName: String,
  createdAt: { type: Date, default: Date.now, expires: '1d' }, // expira en 24h
});

module.exports = mongoose.model('ChatSession', schema);
