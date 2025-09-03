const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  contacts: [mongoose.Schema.Types.ObjectId]
});

module.exports = mongoose.model('ChatList', schema);