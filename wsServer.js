const WebSocket = require('ws');
const Redis = require('ioredis');
const Joi = require('joi'); // 📦 Nueva librería
const { verify } = require('./utils/jwt');
const Conversation = require('./globalModels/Conversation');
const config = require('./config');

// ===============================================
// 🔴 Configuración Redis Pub/Sub
// ===============================================
const pubClient = new Redis(config.redisUrl);
const subClient = new Redis(config.redisUrl);
const CHAT_CHANNEL = 'CHAT_GLOBAL_CHANNEL';

subClient.subscribe(CHAT_CHANNEL, (err) => {
  if (err) console.error('❌ Error suscribiendo a Redis:', err);
});

// ===============================================
// 🛡️ Esquemas de Validación (Joi)
// ===============================================
const messageSchema = Joi.object({
  type: Joi.string().valid('message').required(),
  text: Joi.string().trim().min(1).max(2000).required(), // Max 2000 caracteres, no vacío
});

// ===============================================
// 🧠 Estado local
// ===============================================
const rooms = new Map();

// Escuchar mensajes de otras instancias (Redis)
subClient.on('message', (channel, message) => {
  if (channel === CHAT_CHANNEL) {
    try {
      const { roomId, data } = JSON.parse(message);
      broadcastLocal(roomId, data);
    } catch (err) {
      console.error('⚠️ Error procesando mensaje de Redis:', err);
    }
  }
});

function initWSS(server) {
  const wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', async (ws, req) => {
    // ... (Lógica de conexión y token igual que antes) ...
    // Para ahorrar espacio, asumo que la parte de conexión/verify token se mantiene igual
    // Si necesitas que la repita completa, dímelo.
    
    // Aquí abajo pego la lógica mejorada dentro del connection:
    try {
      const params = new URLSearchParams(req.url.replace('/ws?', ''));
      const token = params.get('token');
      const roomId = params.get('roomId');

      if (!token || !roomId) { ws.close(4000, 'Missing params'); return; }

      let decoded;
      try { decoded = verify(token); } 
      catch { ws.close(4001, 'Invalid token'); return; }

      const userId = decoded.id;
      const userName = decoded.name || 'Invitado';

      if (!rooms.has(roomId)) rooms.set(roomId, new Set());
      rooms.get(roomId).add(ws);
      ws.roomId = roomId;

      // 📢 Notificar entrada
      publishToRoom(roomId, { system: true, type: 'user_joined', userName, timestamp: Date.now() });

      ws.on('message', async (raw) => {
        try {
          // 1. Parseo seguro
          let data;
          try { data = JSON.parse(raw); } 
          catch { return; } // Ignorar JSON inválido

          // 2. Validación con Joi
          const { error, value } = messageSchema.validate(data);
          if (error) {
            ws.send(JSON.stringify({ 
              system: true, type: 'error', message: error.details[0].message 
            }));
            return;
          }

          const payload = {
            from: userId,
            text: value.text, // Usamos el valor limpio/validado
            timestamp: Date.now(),
          };

          // 3. Persistencia ROBUSTA (Primero guardamos, luego enviamos)
          try {
            await Conversation.findByIdAndUpdate(roomId, { 
              $push: { messages: payload } 
            });
            
            // Si llegamos aquí, se guardó en Mongo ✅. Ahora sí difundimos.
            publishToRoom(roomId, { type: 'message', payload });

          } catch (dbError) {
            console.error('❌ Error guardando mensaje en DB:', dbError.message);
            ws.send(JSON.stringify({ 
              system: true, type: 'error', message: 'Error guardando mensaje. Intenta de nuevo.' 
            }));
          }

        } catch (err) {
          console.error('❌ Error crítico WS:', err.message);
        }
      });

      ws.on('close', () => {
        const roomSockets = rooms.get(roomId);
        if (roomSockets) {
          roomSockets.delete(ws);
          if (roomSockets.size === 0) rooms.delete(roomId);
        }
      });

    } catch (err) {
      console.error('❌ Error conexión WS:', err.message);
      ws.close(4002, 'Internal error');
    }
  });
}

function publishToRoom(roomId, data) {
  pubClient.publish(CHAT_CHANNEL, JSON.stringify({ roomId, data }));
}

function broadcastLocal(roomId, data) {
  const roomSockets = rooms.get(roomId);
  if (!roomSockets) return;
  const msg = JSON.stringify(data);
  for (const client of roomSockets) {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  }
}

// Función para cerrar conexiones Redis desde fuera
async function closeRedis() {
  await pubClient.quit();
  await subClient.quit();
  console.log('🔴 Conexiones Redis WS cerradas');
}

module.exports = { initWSS, closeRedis };