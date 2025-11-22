const ChatList = require('../globalModels/ChatList');
const User = require('../globalModels/User');
const UserGuest = require('../globalModels/UserGuest');

function resolveModel(id) {
  return User.findById(id)
    .then(u => u ? { model: "User", user: u } : null)
    .then(async found => found || {
      model: "UserGuest",
      user: await UserGuest.findById(id)
    });
}

exports.addContact = async ({ userId, contactId }) => {
  // Resolver modelo del usuario
  const userInfo = await resolveModel(userId);
  if (!userInfo || !userInfo.user) throw new Error("Usuario no encontrado");

  const contactInfo = await resolveModel(contactId);
  if (!contactInfo || !contactInfo.user) throw new Error("Contacto no encontrado");

  // Buscar lista existente
  let list = await ChatList.findOne({ userId });

  if (!list) {
    list = await ChatList.create({
      userId,
      userModel: userInfo.model,
      contacts: [],
      contactsModel: []
    });
  }

  // Verificar que no exista el contacto
  const already = list.contacts.some(c => c.toString() === contactId);
  if (already) return list; // No duplicar

  // Añadir contacto respetando modelo User/UserGuest
  list.contacts.push(contactId);
  list.contactsModel.push(contactInfo.model);

  await list.save();
  return list;
};

exports.getContacts = async (userId) => {
  return ChatList.findOne({ userId })
    .populate("contacts", "name email avatar isGuest")
    .lean();
};
