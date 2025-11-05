'use strict';
const redis = require('../utils/redis'); // tu ioredis ya configurado

const publisher = redis.duplicate();

async function publishEvent(eventType, payload) {
  try {
    await publisher.publish('system_events', JSON.stringify({
      eventType,
      payload,
      timestamp: Date.now(),
    }));
    console.log(`📢 Evento emitido: ${eventType}`);
  } catch (err) {
    console.error(`❌ Error publicando evento ${eventType}:`, err);
  }
}

module.exports = { publishEvent };
