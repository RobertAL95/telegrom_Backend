const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  email: String,
  password: String,
  name: String
});

module.exports = mongoose.model('User', schema);