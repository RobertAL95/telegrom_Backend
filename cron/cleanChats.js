const mongoose = require('mongoose');
const { mongoURI } = require('../config');
const Chat = require('../Chat/model');

mongoose.connect(mongoURI).then(async () => {
  await Chat.deleteMany({});
  console.log('Mensajes eliminados');
  process.exit(0);
});