const service = require('./service');
const jwtUtils = require('../utils/jwt'); // tiene sign/verify

// Registrar -> devolvemos usuario "limpio"
exports.register = async (data) => {
  const created = await service.register(data);
  return { id: created._id, name: created.name, email: created.email };
};

// Login -> devolvemos token y user (para que el frontend no tenga que llamar /me inmediatamente)
exports.login = async (data) => {
  const token = await service.login(data);
  const user = await service.findByEmail(data.email);
  const userSanitized = user ? { id: user._id, name: user.name, email: user.email } : null;
  return { token, user: userSanitized };
};

exports.oauth = async (profile) => {
  return await service.oauth(profile); // devuelve token
};

// Obtener usuario a partir de un token JWT
exports.getUserFromToken = async (token) => {
  const decoded = jwtUtils.verify(token); // lanzará si inválido
  if (!decoded || !decoded.id) throw new Error('Token inválido');
  const user = await service.findById(decoded.id);
  if (!user) return null;
  return { id: user._id, name: user.name, email: user.email };
};
