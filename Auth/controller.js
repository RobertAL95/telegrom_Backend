'use strict';

const service = require('./service');
const jwtUtils = require('../utils/jwt');

// ===================================================
// 🟢 Registro
// ===================================================
exports.register = async (body) => {
  // Nota: service.register ya recibe datos validados por Joi en network
  const savedUser = await service.register(body);

  // Devolvemos DTO limpio (sin password, ni __v)
  return {
    id: savedUser._id,
    name: savedUser.name,
    email: savedUser.email,
  };
};

// ===================================================
// 🟢 Login
// ===================================================
exports.login = async ({ email, password }) => {
  const user = await service.login({ email, password });
  
  // Estandarizamos retorno para que network siempre reciba { user: ... }
  return { 
    user: { 
      id: user._id, 
      name: user.name, 
      email: user.email 
    } 
  };
};

// ===================================================
// 🟢 OAuth (Google)
// ===================================================
exports.oauth = async (profile) => {
  const user = await service.oauth(profile);
  
  // Corrección: Devolvemos 'user' explícitamente, no 'token'
  return { 
    user: {
      id: user._id,
      name: user.name,
      email: user.email
    }
  };
};

// ===================================================
// 🟢 Obtener User desde Token
// ===================================================
exports.getUserFromToken = async (token) => {
  const decoded = jwtUtils.verify(token);
  if (!decoded?.id) throw new Error('Token inválido');

  const user = await service.findById(decoded.id);
  if (!user) throw new Error('Usuario no encontrado');

  return { id: user._id, name: user.name, email: user.email };
};