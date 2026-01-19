'use strict';
const WebSocket = require('ws');
const { verify } = require('./utils/jwt');
const Conversation = require('./globalModels/Conversation'); 
const User = require('./globalModels/User');
const UserGuest = require('./globalModels/UserGuest');
const cookie = require('cookie'); 
const redis = require('./utils/redis'); 
const chatService = require('./Chat/service'); 

// ===============================================
// 🔴 Redis: Pub/Sub
// ===============================================
// Creamos clientes dedicados para Pub/Sub
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
// 👂 Escucha de Redis (Inter-process communication)
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
    const { inviterId, fullChat } = payload; 
    console.log(`📨 Sistema: Invitación aceptada. Notificando a Host ${inviterId}`);
    
    sendToUser(inviterId, {
        type: 'InviteAccepted', 
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
      // 1. Autenticación (Query param o Cookie)
      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      const params = urlObj.searchParams;
      let token = params.get('token'); 
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
      // Importante: Intentamos determinar si es Guest por el token (si tienes ese flag)
      // Si no, asumimos que el ID es único globalmente (MongoDB ObjectID).
      
      // 2. Registrar Usuario
      if (!userSockets.has(userId)) userSockets.set(userId, new Set());
      userSockets.get(userId).add(ws);

      ws.userId = userId;
      ws.userName = userName;
      ws.roomId = null; 
      ws.isAlive = true; // Para Heartbeat

      // 3. Heartbeat (Ping/Pong) para evitar desconexiones fantasma
      ws.on('pong', () => { ws.isAlive = true; });

      // 4. Helper: Unirse a sala con validación
      const joinRoomHandler = async (roomIdToJoin) => {
          try {
            // Buscamos la conversación y sus participantes
            // .lean() es más rápido si solo leemos
            const conversation = await Conversation.findById(roomIdToJoin, 'participants').lean();
            
            if (!conversation) {
                console.warn(`⚠️ Sala no encontrada: ${roomIdToJoin}`);
                return false;
            }

            // Verificamos si el usuario está en la lista de participantes
            // Convertimos a string para asegurar comparación correcta
            const isParticipant = conversation.participants.some(p => p.toString() === userId.toString());

            if (!isParticipant) {
                console.warn(`⛔ Acceso denegado: ${userName} (${userId}) a sala ${roomIdToJoin}`);
                // Opcional: Enviar error al cliente
                ws.send(JSON.stringify({ type: 'error', message: 'No tienes acceso a este chat' }));
                return false;
            }

            // Salir de sala anterior si existe
            if (ws.roomId && rooms.has(ws.roomId)) {
                rooms.get(ws.roomId).delete(ws);
                if (rooms.get(ws.roomId).size === 0) rooms.delete(ws.roomId);
            }

            // Entrar a nueva sala
            if (!rooms.has(roomIdToJoin)) rooms.set(roomIdToJoin, new Set());
            rooms.get(roomIdToJoin).add(ws);
            ws.roomId = roomIdToJoin;

            console.log(`🟢 WS: ${userName} se unió a ${roomIdToJoin}`);
            
            // Confirmación al cliente
            ws.send(JSON.stringify({ type: 'room_joined', roomId: roomIdToJoin }));
            return true;

          } catch (err) {
              console.error("Error en joinRoomHandler:", err);
              return false;
          }
      };

      // 5. Auto-join inicial (si viene en URL)
      if (initialRoomId) {
         await joinRoomHandler(initialRoomId);
      }

      // 6. Manejo de Mensajes Entrantes
      ws.on('message', async (raw) => {
        try {
            const data = JSON.parse(raw);

            // A. Petición de unión explícita (desde el frontend useChatWS)
            if (data.type === 'join_chat' && data.chatId) {
                await joinRoomHandler(data.chatId);
                return;
            }

            // B. Salir de sala
            if (data.type === 'leave_chat') {
                if (ws.roomId && rooms.has(ws.roomId)) {
                    rooms.get(ws.roomId).delete(ws);
                }
                ws.roomId = null;
                return;
            }

            // C. Mensaje de Chat
            if ((data.type === 'message' || data.text) && ws.roomId) {
                const textToSend = data.text || data.payload?.text;
                if (!textToSend || !textToSend.trim()) return;

                // Guardar en BD
                // Nota: Service maneja la lógica de User vs Guest internamente
                const savedMessage = await chatService.sendMessage(ws.roomId, userId, textToSend);
                
                // Publicar a Redis para distribución global
                publishToRoom(ws.roomId, { 
                    type: 'message', 
                    payload: {
                        from: userId, 
                        text: savedMessage.text, 
                        timestamp: savedMessage.timestamp,
                        name: userName,
                        // Añadimos senderModel por si el frontend lo necesita
                        senderModel: savedMessage.senderModel 
                    } 
                });
            }

        } catch (e) {
            console.error('Error handling WS message:', e);
        }
      });

      // 7. Desconexión
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
      console.error('❌ Error crítico en conexión WS:', err);
      ws.close(4002, 'Internal Error');
    }
  });

  // Intervalo de limpieza de conexiones muertas
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));
}

// ===============================================
// Helpers
// ===============================================

function publishToRoom(roomId, data) {
  pubClient.publish(CHAT_CHANNEL, JSON.stringify({ roomId, data }));
}

function broadcastToRoom(roomId, data) {
  const roomSockets = rooms.get(roomId);
  if (!roomSockets) return;
  const msg = JSON.stringify(data);
  for (const client of roomSockets) {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  }
}

function sendToUser(userId, data) {
    const sockets = userSockets.get(userId);
    if (!sockets) return;
    
    const msg = JSON.stringify(data);
    for (const client of sockets) {
        if (client.readyState === WebSocket.OPEN) client.send(msg);
    }
}

// Función para cerrar conexiones Redis al apagar el servidor
async function closeRedis() {
    console.log("🔌 Cerrando conexiones Pub/Sub de WS...");
    await pubClient.quit();
    await subClient.quit();
}

module.exports = { initWSS, closeRedis };