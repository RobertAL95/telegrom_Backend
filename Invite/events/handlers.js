// Invite/events/handlers.js
'use strict';
const { registerHandler } = require('../../events/dispatcher');

/**
 * Maneja el evento cuando una invitación es aceptada.
 * Payload esperado: { roomId, guestId, guestName }
 */
async function handleInviteAccepted(payload) {
    console.log(`[INVITE EVENT] 🎟️ Invitación aceptada para Room: ${payload.roomId} por ${payload.guestName}`);
    // Aquí podrías notificar al dueño del chat original
}

/**
 * 🟢 Inicializador: Registra los listeners del módulo Invite
 */
exports.init = () => {
    registerHandler('InviteAccepted', handleInviteAccepted);
    console.log('✅ Invite handlers registrados.');
};