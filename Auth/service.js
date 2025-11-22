'use strict';

// 👇 Importamos el modelo GLOBAL correcto
const User = require('../globalModels/User'); 
const bcrypt = require('bcrypt');
const { publishEvent } = require('../events/publisher'); // (Si usas Redis)

// ===================================================
// 🟢 Registro Manual (Email/Pass)
// ===================================================
exports.register = async ({ name, email, password }) => {
  const existing = await User.findOne({ email });
  if (existing) throw new Error('El correo ya está registrado');

  const hashed = await bcrypt.hash(password, 10);
  
  const user = await User.create({
    name,
    email,
    password: hashed,
    status: 'online' // Auto-online al registrarse
  });

  // Tracking opcional
  if (publishEvent) publishEvent('UserRegistered', { id: user._id, type: 'manual' });

  return user;
};

// ===================================================
// 🟢 Login Manual
// ===================================================
exports.login = async ({ email, password }) => {
  // Buscamos usuario y verificamos password explícitamente
  const user = await User.findOne({ email });
  
  if (!user) throw new Error('Credenciales inválidas');
  
  // Si el usuario se creó con Google, no tiene password
  if (!user.password) throw new Error('Usa el inicio de sesión con Google');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error('Credenciales inválidas');

  return user;
};

// ===================================================
// 🟢 OAuth (Google Logic)
// ===================================================
exports.oauth = async (profile) => {
  const email = profile.emails?.[0]?.value;
  if (!email) throw new Error('Email no proporcionado por Google');

  let user = await User.findOne({ email });

  if (!user) {
    // Creamos usuario SIN password
    user = await User.create({
      name: profile.displayName || 'Usuario Google',
      email,
      avatar: profile.photos?.[0]?.value || null,
      status: 'online'
    });

    if (publishEvent) publishEvent('UserRegistered', { id: user._id, type: 'oauth' });
  }

  return user;
};

// ===================================================
// 🧩 Utils
// ===================================================
exports.findById = async (id) => User.findById(id);