'use strict';

const service = require('./service');
const User = require('../globalModels/User');     // modelo global REAL

// ===================================================
// 🟢 Crear invitación (requiere user real existente)
// ===================================================
exports.createInvite = async (userId) => {
  if (!userId) {
    throw new Error('UserId requerido');
  }

  // Validar que el usuario existe
  const exists = await User.findById(userId);
  if (!exists) {
    throw new Error('Usuario no encontrado');
  }

  return service.createInvite(userId);
};

// ===================================================
// 🟡 Validar token de invitación
// ===================================================
exports.validateInvite = async (token) => {
  if (!token) throw new Error('Token requerido');
  return service.validateInvite(token);
};

// ===================================================
// 🟢 Aceptar invitación
// ===================================================
exports.acceptInvite = async (token, guestName) => {
  if (!token) throw new Error('Token requerido');

  // nombre por defecto si el front no manda uno
  const finalName = guestName?.trim() || 'Invitado';

  return service.acceptInvite(token, finalName);
};
