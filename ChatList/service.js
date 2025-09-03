const ChatList = require('./model');

exports.addContact = async ({ userId, contactId }) => {
  const list = await ChatList.findOneAndUpdate(
    { userId },
    { $addToSet: { contacts: contactId } },
    { upsert: true, new: true }
  );
  return list;
};

exports.getContacts = async (userId) => {
  return await ChatList.findOne({ userId }).populate('contacts');
};