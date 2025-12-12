// Chat/events/handlers.js
'use strict';
const { registerHandler } = require('../../events/dispatcher');

/**
 * Reacciona cuando un usuario nuevo se registra.
 * Ejemplo: Crear configuraciones iniciales de chat o un mensaje de bienvenida del sistema.
 */
async function handleUserRegistered(payload) {
    console.log(`[CHAT EVENT] ⚙️ Inicializando configuración de chat para usuario: ${payload.userId}`);
    // Lógica futura: ChatService.createDefaultSettings(payload.userId)...
}

/**
 * 🟢 Inicializador: Registra los listeners del módulo Chat
 */
exports.init = () => {
    // El módulo de Chat también escucha el evento 'UserRegistered' (Desacoplamiento)
    registerHandler('UserRegistered', handleUserRegistered);
    console.log('✅ Chat handlers registrados.');
};