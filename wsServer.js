'use strict';
const WebSocket = require('ws');
const Joi = require('joi'); 
const { verify } = require('./utils/jwt');
const Conversation = require('./globalModels/Conversation'); 
const cookie = require('cookie'); 
const redis = require('./utils/redis'); 
const chatService = require('./Chat/service'); 

// ===============================================
// 🔴 Redis: Pub/Sub Unificado
// ===============================================
const pubClient = redis.createClient();
const subClient = redis.createClient();
const CHAT_CHANNEL = 'CHAT_GLOBAL_CHANNEL';
const SYSTEM_CHANNEL = 'system_events'; 

subClient.subscribe(CHAT_CHANNEL);
subClient.subscribe(SYSTEM_CHANNEL); 

// ===============================================
// 🧠 Estado local
// ===============================================
const rooms = new Map(); // Map<roomId, Set<ws>>
const userSockets = new Map(); // Map<userId, Set<ws>>

// ===============================================
// 👂 Escucha de Redis
// ===============================================
subClient.on('message', (channel, message) => {
  try {
    const parsed = JSON.parse(message);

    if (channel === CHAT_CHANNEL) {
      const { roomId, data } = parsed;
      broadcastToRoom(roomId, data);
    } 
    else if (channel === SYSTEM_CHANNEL) {
      handleSystemEvent(parsed);
    }

  } catch (err) {
    console.error('⚠️ Error procesando mensaje de Redis:', err);
  }
});

function handleSystemEvent(event) {
  const { eventType, payload } = event;

  if (eventType === 'InviteAccepted') {
    const { inviter, fullChat } = payload;
    console.log(`📨 Notificando al Host (${inviter}) sobre nuevo chat...`);
    
    // 🔥 IMPORTANTE: Aquí notificamos al Host para que actualice su lista
    sendToUser(inviter, {
        type: 'InviteAccepted', // Debe coincidir con lo que espera el Frontend
        fullChat: fullChat
    });
  }
}

// ===============================================
// 🚀 INICIALIZACIÓN DEL SOCKET
// ===============================================
function initWSS(server) {
  const wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', async (ws, req) => {
    try {
      // 1. Extracción de Credenciales
      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      const params = urlObj.searchParams;
      let token = params.get('token'); 
      // El roomId en URL es opcional (para conexión directa)
      let initialRoomId = params.get('roomId'); 

      if (!token && req.headers.cookie) {
        const cookies = cookie.parse(req.headers.cookie);
        token = cookies.at; 
      }

      if (!token) { 
        ws.close(4000, 'Missing token'); 
        return; 
      }

      let decoded;
      try { 
        decoded = verify(token); 
      } catch (e) { 
        ws.close(4001, 'Invalid token'); 
        return; 
      }

      const userId = decoded.id;
      const userName = decoded.name || 'Usuario';

      // 2. Registrar Usuario Globalmente (Para notificaciones de lobby)
      if (!userSockets.has(userId)) userSockets.set(userId, new Set());
      userSockets.get(userId).add(ws);

      ws.userId = userId;
      ws.userName = userName;
      ws.roomId = null; // Empezamos en null

      // 3. Helper interno para unirse a una sala
      const joinRoomHandler = async (roomIdToJoin) => {
          // ACL Check: ¿Es participante?
          const conversation = await Conversation.findById(roomIdToJoin, 'participants');
          const isParticipant = conversation?.participants.some(p => p.toString() === userId.toString());

          if (!isParticipant) {
             console.warn(`⛔ Acceso denegado a ${userName} para sala ${roomIdToJoin}`);
             return false;
          }

          // Salir de sala anterior si estaba en una
          if (ws.roomId && rooms.has(ws.roomId)) {
              rooms.get(ws.roomId).delete(ws);
          }

          if (!rooms.has(roomIdToJoin)) rooms.set(roomIdToJoin, new Set());
          rooms.get(roomIdToJoin).add(ws);
          ws.roomId = roomIdToJoin;

          console.log(`🟢 WS: ${userName} -> Se unió a Sala ${roomIdToJoin}`);
          return true;
      };

      // 4. Si vino con roomId en la URL, intentamos unirnos
      if (initialRoomId) {
         await joinRoomHandler(initialRoomId);
      } else {
         console.log(`🔵 WS: ${userName} -> Conectado al Lobby`);
      }

      // 5. MANEJO DE MENSAJES (¡AQUÍ ESTABA EL PROBLEMA!)
      ws.on('message', async (raw) => {
        try {
            const data = JSON.parse(raw);

            // CASO A: Unirse a sala dinámicamente (Frontend envía esto ahora)
            if (data.type === 'join_chat' && data.chatId) {
                await joinRoomHandler(data.chatId);
                return;
            }

            // CASO B: Salir de sala
            if (data.type === 'leave_chat') {
                if (ws.roomId && rooms.has(ws.roomId)) {
                    rooms.get(ws.roomId).delete(ws);
                    console.log(`👋 WS: ${userName} salió de sala ${ws.roomId}`);
                }
                ws.roomId = null;
                return;
            }

            // CASO C: Mensaje de Chat Real
            // Solo procesamos si ya tiene sala asignada
            if (!ws.roomId) return; 

            if (data.type === 'message' || data.text) {
                const textToSend = data.text || data.payload?.text;
                if (!textToSend) return;

                const savedMessage = await chatService.sendMessage(ws.roomId, userId, textToSend);
                
                // Publicar a Redis para que llegue a todos (incluyendo este nodo)
                publishToRoom(ws.roomId, { 
                    type: 'message', 
                    payload: {
                        from: userId, 
                        text: savedMessage.text, 
                        timestamp: savedMessage.timestamp,
                        name: userName
                    } 
                });
            }

        } catch (e) {
            console.error('Error handling WS message:', e);
        }
      });

      // 6. Desconexión
      ws.on('close', () => {
        if (ws.roomId && rooms.has(ws.roomId)) {
          const roomSockets = rooms.get(ws.roomId);
          if (roomSockets) {
            roomSockets.delete(ws);
            if (roomSockets.size === 0) rooms.delete(ws.roomId);
          }
        }
        if (ws.userId && userSockets.has(ws.userId)) {
            const uSockets = userSockets.get(ws.userId);
            if (uSockets) {
                uSockets.delete(ws);
                if (uSockets.size === 0) userSockets.delete(ws.userId);
            }
        }
      });

    } catch (err) {
      console.error('❌ Error WS Connection:', err);
      ws.close(4002, 'Internal error');
    }
  });
}

// Helper: Enviar a Sala (Vía Redis)
function publishToRoom(roomId, data) {
  pubClient.publish(CHAT_CHANNEL, JSON.stringify({ roomId, data }));
}

// Helper: Difundir a Sala Local
function broadcastToRoom(roomId, data) {
  const roomSockets = rooms.get(roomId);
  if (!roomSockets) return;
  const msg = JSON.stringify(data);
  for (const client of roomSockets) {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  }
}

// Helper: Enviar a Usuario Específico
function sendToUser(userId, data) {
    // Buscamos todas las conexiones de ese usuario (puede tener varias pestañas)
    const sockets = userSockets.get(userId);
    if (!sockets) return;
    
    const msg = JSON.stringify(data);
    for (const client of sockets) {
        if (client.readyState === WebSocket.OPEN) client.send(msg);
    }
}

module.exports = { initWSS };