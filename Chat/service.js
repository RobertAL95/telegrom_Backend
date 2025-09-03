const Chat = require('./model');

exports.send = async (data) => {
  const msg = new Chat(data);
  return await msg.save();
};

exports.getByUser = async (userId) => {
  return await Chat.find({ $or: [{ from: userId }, { to: userId }] }).sort({ createdAt: -1 });
};