// Auth/events/handlers.js
'use strict';
const { registerHandler } = require('../../events/dispatcher');
// const service = require('../service'); // Aquí importarías el servicio si necesitas lógica de DB

/**
 * Maneja el evento cuando un usuario se registra exitosamente.
 * Payload esperado: { userId, email, name, provider }
 */
async function handleUserRegistered(payload) {
    try {
        console.log(`[AUTH EVENT] 👤 Nuevo usuario registrado: ${payload.email} (${payload.userId})`);
        // Aquí podrías: Enviar email de bienvenida, Crear registro de auditoría, etc.
    } catch (error) {
        console.error('[AUTH EVENT ERROR]', error);
    }
}

/**
 * 🟢 Inicializador: Registra los listeners del módulo Auth
 */
exports.init = () => {
    registerHandler('UserRegistered', handleUserRegistered);
    console.log('✅ Auth handlers registrados.');
};