'use strict';

async function handleUserRegistered(payload) {
  // Aquí podrías enviar un email, crear perfil, etc.
  console.log(`👤 Nuevo usuario registrado: ${payload.email}`);
}

module.exports = { handleUserRegistered };
