// events/handlers/chatHandler.js
'use strict';
const { registerHandler } = require('../dispatcher'); // Importar el dispatcher central
// const chatService = require('../../Chat/service'); // El servicio que contendrá la lógica

// Lógica que se ejecuta al recibir el evento 'UserRegistered'
async function handleUserRegistered(payload) {
    const { userId } = payload;
    
    // Aquí puedes inicializar la configuración de chat del nuevo usuario
    console.log(`[Chat Handler] Inicializando metadata de chat para userId: ${userId}`);
    // await chatService.initializeUserSettings(userId); 
}

// 🟢 Función de inicialización y registro
exports.init = () => {
    // Registra el handler para el evento 'UserRegistered'
    registerHandler('UserRegistered', handleUserRegistered); 
    
    // Si tuvieras un evento 'ChatDeleted', lo registras aquí:
    // registerHandler('ChatDeleted', handleChatCleanup); 
};