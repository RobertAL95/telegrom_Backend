'use strict';

const service = require('./service');
const jwtUtils = require('../utils/jwt');

// Función auxiliar para estandarizar la respuesta del usuario
// Esto evita repetir código y asegura que siempre mandamos el friendId
function formatUserResponse(user) {
    return {
        id: user._id,
        friendId: user.friendId, // ✨ AQUÍ ESTÁ LA MAGIA
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status
    };
}

// ===================================================
// 🟢 Registro
// ===================================================
exports.register = async (body) => {
  // Nota: service.register ya recibe datos validados por Joi en network
  const savedUser = await service.register(body);

  // Devolvemos usuario formateado
  return formatUserResponse(savedUser);
};

// ===================================================
// 🟢 Login
// ===================================================
exports.login = async ({ email, password }) => {
  const user = await service.login({ email, password });
  
  // Estandarizamos retorno para que network siempre reciba { user: ... }
  return { 
    user: formatUserResponse(user)
  };
};

// ===================================================
// 🟢 OAuth (Google)
// ===================================================
exports.oauth = async (profile) => {
  const user = await service.oauth(profile);
  
  return { 
    user: formatUserResponse(user)
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

  return formatUserResponse(user);
};