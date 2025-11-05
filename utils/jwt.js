const jwt = require('jsonwebtoken');
const config = require('../config');

const SECRET = config.jwtSecret || process.env.JWT_SECRET || 'fallback_secret';

// -------------------------------------------------
// 🟢 Generar token
// -------------------------------------------------
exports.sign = (payload, options = {}) => {
  // Puedes pasar { expiresIn: '10m' } o dejar el default
  const expiresIn = options.expiresIn || '30m';
  return jwt.sign(payload, SECRET, { expiresIn });
};

// -------------------------------------------------
// 🟢 Verificar token (con manejo de errores)
// -------------------------------------------------
exports.verify = (token) => {
  try {
    return jwt.verify(token, SECRET);
  } catch (err) {
    console.error('❌ Error al verificar token JWT:', err.message);
    throw new Error('Token inválido o expirado');
  }
};

// -------------------------------------------------
// 🟢 Decodificar sin verificar (solo lectura no segura)
// -------------------------------------------------
exports.decode = (token) => {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
};
