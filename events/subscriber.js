'use strict';
const redis = require('../utils/redis');
const { handleUserRegistered } = require('./handlers/userHandlers');
const { handleChatCreated } = require('./handlers/chatHandlers');
const { handleInviteSent } = require('./handlers/inviteHandlers');

const subscriber = redis.duplicate();

subscriber.subscribe('system_events', (err) => {
  if (err) console.error('❌ Error al suscribirse a system_events', err);
});

subscriber.on('message', async (channel, message) => {
  if (channel !== 'system_events') return;
  try {
    const { eventType, payload } = JSON.parse(message);

    switch (eventType) {
      case 'UserRegistered':
        await handleUserRegistered(payload);
        break;
      case 'ChatCreated':
        await handleChatCreated(payload);
        break;
      case 'InviteSent':
        await handleInviteSent(payload);
        break;
      default:
        console.warn(`⚠️ Evento no manejado: ${eventType}`);
    }
  } catch (err) {
    console.error('❌ Error procesando evento:', err);
  }
});

console.log('✅ Subscriber de eventos iniciado');
