'use strict';

const User = require('../globalModels/User'); 
const bcrypt = require('bcrypt');
const { publishEvent } = require('../events/publisher'); 

// ===================================================
// 🟢 Registro Manual (Email/Pass)
// ===================================================
exports.register = async ({ name, email, password }) => {
  // Normalizamos el email para evitar duplicados por mayúsculas
  const emailClean = email.trim().toLowerCase();

  const existing = await User.findOne({ email: emailClean });
  if (existing) throw new Error('El correo ya está registrado');

  const hashed = await bcrypt.hash(password, 10);
  
  const user = await User.create({
    name: name.trim(),
    email: emailClean,
    password: hashed,
    status: 'online'
  });

  if (publishEvent) publishEvent('UserRegistered', { id: user._id, type: 'manual' });

  return user;
};

// ===================================================
// 🟢 Login Manual
// ===================================================
exports.login = async ({ email, password }) => {
  const emailClean = email.trim().toLowerCase();

  // Buscamos usuario
  const user = await User.findOne({ email: emailClean });
  
  if (!user) throw new Error('Credenciales inválidas (Usuario no encontrado)');
  
  if (!user.password) throw new Error('Usa el inicio de sesión con Google');

  // Comparamos
  const valid = await bcrypt.compare(password, user.password);
  
  if (!valid) throw new Error('Credenciales inválidas (Password incorrecto)');

  return user;
};

// ... (Resto del archivo oauth y findById igual)