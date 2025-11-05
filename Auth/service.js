'use strict';

const User = require('./model');
const bcrypt = require('bcrypt');
const { sign } = require('../utils/jwt');
const { publishEvent } = require('../events/publisher'); // importamos publisher

// ===================================================
// 🔹 Registro de usuario
// ===================================================
exports.register = async (data) => {
  const hashed = await bcrypt.hash(data.password, 10);
  const user = new User({ ...data, password: hashed });
  const saved = await user.save(); // guardamos usuario

  // Emitir evento al registrar un nuevo usuario
  await publishEvent('UserRegistered', {
    id: saved._id,
    email: saved.email,
    name: saved.name,
  });

  return saved; // devuelve doc completo (sanitización en controller)
};

// ===================================================
// 🔹 Login de usuario
// ===================================================
exports.login = async (data) => {
  const user = await User.findOne({ email: data.email });
  if (!user) throw new Error('No encontrado');

  const match = await bcrypt.compare(data.password, user.password);
  if (!match) throw new Error('Credenciales inválidas');

  return sign({ id: user._id, email: user.email }); // devuelve token (string)
};

// ===================================================
// 🔹 OAuth Google / Facebook
// ===================================================
exports.oauth = async (profile) => {
  const email = profile.emails[0].value;
  let user = await User.findOne({ email });

  if (!user) {
    user = await new User({ email, name: profile.displayName }).save();

    // Emitir evento al crear usuario vía OAuth
    await publishEvent('UserRegistered', {
      id: user._id,
      email: user.email,
      name: user.name,
    });
  }

  return sign({ id: user._id, email: user.email });
};

// ===================================================
// 🔹 Utilities para controller
// ===================================================
exports.findById = async (id) => {
  return User.findById(id).select('-password');
};

exports.findByEmail = async (email) => {
  return User.findOne({ email }).select('-password');
};
