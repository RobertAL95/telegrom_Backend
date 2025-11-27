'use strict';
const Conversation = require('../globalModels/Conversation');
// Asumimos que la clave del archivo (fileKey) tiene el formato: [chatId]/[...resto_de_ruta]

/**
 * 🟢 Verifica si un usuario es participante de la conversación asociada a un archivo.
 * @param {string} userId - ID del usuario logueado o invitado.
 * @param {string} fileKey - La clave del archivo en el bucket.
 * @returns {boolean}
 */
exports.checkFileAccess = async (userId, fileKey) => {
    try {
        // 1. Extraer el ID de Conversación.
        // La conversación ID debe ser el primer segmento de la clave (ej: 61a4.../imagen.jpg)
        const chatId = fileKey.split('/')[0];

        if (!chatId) {
            console.warn(`⚠️ ACL: Falta ID de chat en la clave: ${fileKey}`);
            return false;
        }

        // 2. Buscar la conversación
        const convo = await Conversation.findById(chatId);
        
        if (!convo) {
            console.warn(`⚠️ ACL: Conversación no encontrada: ${chatId}`);
            return false;
        }

        // 3. Verificar si el usuario es participante (Usuario o Invitado)
        // Usamos .some para verificar si el ID del usuario existe en el array de participantes
        const hasAccess = convo.participants.some(p => p.toString() === userId.toString());

        if (!hasAccess) {
             console.warn(`🚫 ACL: Acceso denegado. User ${userId} no es participante de ${chatId}`);
        }

        return hasAccess;

    } catch (e) {
        console.error('❌ Error ACL en checkFileAccess:', e.message);
        // En caso de error de DB o formato, denegar el acceso por defecto
        return false; 
    }
};