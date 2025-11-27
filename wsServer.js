'use strict';
const WebSocket = require('ws');
const Joi = require('joi'); 
const { verify } = require('./utils/jwt');
const Conversation = require('./globalModels/Conversation'); // Para el ACL
const config = require('./config');
const redis = require('./utils/redis'); // Utilidad de Redis rastreadora
const chatService = require('./Chat/service'); // Servicio para persistencia robusta

// ===============================================
// 🔴 Configuración Redis Pub/Sub 
// ===============================================
const pubClient = redis.createClient(); // Cliente rastreado (Publisher)
const subClient = redis.createClient(); // Cliente rastreado (Subscriber)
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
// 🧠 Estado local (Conexiones activas por instancia)
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

      // 🔥 CORRECCIÓN CRÍTICA: 1. ACL (Control de Acceso)
      const conversation = await Conversation.findById(roomId, 'participants');
      
      const isParticipant = conversation?.participants.some(p => p.toString() === userId.toString());

      if (!isParticipant) {
          console.warn(`🚫 WS ACL: User ${userId} intentó acceder a chat ${roomId} sin permiso.`);
          ws.close(4003, 'Forbidden: Not a chat member'); 
          return; 
      }
      // ✅ Fin del ACL

      if (!rooms.has(roomId)) rooms.set(roomId, new Set());
      rooms.get(roomId).add(ws);
      ws.roomId = roomId;
      ws.userId = userId; // Almacenamos userId para su uso posterior
      ws.userName = userName; // Almacenamos userName para su uso posterior

      // 📢 Notificar entrada
      publishToRoom(roomId, { system: true, type: 'user_joined', userName, timestamp: Date.now() });

      ws.on('message', async (raw) => {
        try {
          // 1. Parseo seguro y Validación con Joi
          let data;
          try { data = JSON.parse(raw); } 
          catch { return; } 

          const { error, value } = messageSchema.validate(data);
          if (error) {
            ws.send(JSON.stringify({ 
              system: true, type: 'error', message: error.details[0].message 
            }));
            return;
          }

          // 2. Persistencia ROBUSTA (Delegamos a chatService para centralizar la lógica de DB)
          // Usamos el servicio de chat que ya existe para guardar antes de publicar.
          const savedMessage = await chatService.sendMessage(roomId, userId, value.text);

          // 3. Difundir mensaje (usando el objeto guardado de la DB)
          publishToRoom(roomId, { 
                type: 'message', 
                payload: {
                    from: userId,
                    text: savedMessage.text,
                    timestamp: savedMessage.timestamp,
                    name: userName // Incluimos el nombre para el frontend
                } 
            });

        } catch (dbError) {
          console.error('❌ Error guardando mensaje en DB:', dbError);
          ws.send(JSON.stringify({ 
            system: true, type: 'error', message: 'Error guardando mensaje. Intenta de nuevo.' 
          }));
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
      console.error('❌ Error conexión WS:', err);
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
    // Los clientes pubClient y subClient son rastreados y cerrados por redis.closeAllClients()
    console.log('🔴 Conexiones Redis WS (Gestionado por el cierre centralizado)');
}

module.exports = { initWSS, closeRedis };