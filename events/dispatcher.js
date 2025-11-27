// events/dispatcher.js (Reemplaza subscriber.js)
'use strict';
const redis = require('../utils/redis');

const subscriber = redis.duplicate();
const handlers = new Map();
const GLOBAL_CHANNEL = 'system_events'; // Usamos tu canal actual

/**
 * 🟢 Registra una función manejadora para un tipo de evento específico.
 * @param {string} eventType - El tipo de evento a escuchar (ej: 'UserRegistered').
 * @param {Function} handler - La función a ejecutar (Async function).
 */
function registerHandler(eventType, handler) {
    if (!handlers.has(eventType)) {
        handlers.set(eventType, []);
    }
    handlers.get(eventType).push(handler);
    console.log(`👂 Handler registrado para evento: ${eventType}`);
}

/**
 * 🟢 Inicia la escucha de eventos en Redis.
 */
function initSubscriber() {
    subscriber.subscribe(GLOBAL_CHANNEL, (err) => {
        if (err) {
            console.error('❌ Error suscribiendo al canal global:', err);
            return;
        }
        console.log('✅ Dispatcher de eventos iniciado y suscrito.');
    });

    subscriber.on('message', (channel, message) => {
        if (channel !== GLOBAL_CHANNEL) return;

        try {
            const { eventType, payload } = JSON.parse(message);
            
            if (handlers.has(eventType)) {
                // Ejecutamos todos los handlers registrados para este evento
                handlers.get(eventType).forEach(handler => {
                    // Ejecución asíncrona para no bloquear el loop principal (Mejor práctica)
                    setImmediate(() => {
                        handler(payload).catch(err => {
                            console.error(`❌ Error ejecutando handler para ${eventType}:`, err.message);
                        });
                    });
                });
            } else {
                console.warn(`⚠️ Evento no manejado por ningún handler: ${eventType}`);
            }
        } catch (e) {
            console.error('⚠️ Error procesando mensaje JSON de evento:', e.message);
        }
    });
}

module.exports = {
    registerHandler,
    initSubscriber,
    subscriber, // Exportamos para uso en un graceful shutdown
};