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
const SYSTEM_CHANNEL = 'system_events'; // ✅ Escuchamos eventos del publisher

// Suscribirse a ambos canales
subClient.subscribe(CHAT_CHANNEL);
subClient.subscribe(SYSTEM_CHANNEL); 

// ===============================================
// 🧠 Estado local
// ===============================================
const rooms = new Map(); // Map<roomId, Set<ws>>
const userSockets = new Map(); // ✅ Map<userId, Set<ws>> (Nuevo: Para notificaciones directas)

// ===============================================
// 👂 Escucha de Redis (El Puente)
// ===============================================
subClient.on('message', (channel, message) => {
  try {
    const parsed = JSON.parse(message);

    // A) Mensajes de Chat Normales
    if (channel === CHAT_CHANNEL) {
      const { roomId, data } = parsed;
      broadcastToRoom(roomId, data);
    } 
    
    // B) Eventos de Sistema (EJ: INVITACIÓN ACEPTADA)
    else if (channel === SYSTEM_CHANNEL) {
      handleSystemEvent(parsed);
    }

  } catch (err) {
    console.error('⚠️ Error procesando mensaje de Redis:', err);
  }
});

// Lógica para manejar eventos del sistema (InviteAccepted)
function handleSystemEvent(event) {
  const { eventType, payload } = event;

  if (eventType === 'InviteAccepted') {
    const { inviter, fullChat } = payload;
    console.log(`📨 Notificando al Host (${inviter}) sobre nuevo chat...`);
    
    // Enviamos el chat completo SOLO al usuario que invitó (Host)
    sendToUser(inviter, {
        type: 'NEW_CHAT_CREATED',
        chat: fullChat
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
      const roomId = params.get('roomId'); // Ahora es OPCIONAL

      // Cookie Fallback
      if (!token && req.headers.cookie) {
        const cookies = cookie.parse(req.headers.cookie);
        token = cookies.at; 
      }

      // 2. Validación (Solo Token es obligatorio ahora)
      if (!token) { 
        ws.close(4000, 'Missing token'); 
        return; 
      }

      // 3. Verificación JWT
      let decoded;
      try { 
        decoded = verify(token); 
      } catch (e) { 
        ws.close(4001, 'Invalid token'); 
        return; 
      }

      const userId = decoded.id;
      const userName = decoded.name || 'Usuario';

      // 4. Registrar en Mapa de Usuarios (Global)
      // Esto permite enviarle mensajes esté en la sala que esté
      if (!userSockets.has(userId)) userSockets.set(userId, new Set());
      userSockets.get(userId).add(ws);

      ws.userId = userId;
      ws.userName = userName;

      // 5. Lógica de Sala (Solo si envió roomId)
      if (roomId) {
         // ACL Check
         const conversation = await Conversation.findById(roomId, 'participants');
         const isParticipant = conversation?.participants.some(p => p.toString() === userId.toString());

         if (!isParticipant) {
             ws.close(4003, 'Forbidden'); 
             return; 
         }

         if (!rooms.has(roomId)) rooms.set(roomId, new Set());
         rooms.get(roomId).add(ws);
         ws.roomId = roomId;

         console.log(`🟢 WS: ${userName} -> Sala ${roomId}`);
         publishToRoom(roomId, { system: true, type: 'user_joined', userName });
      } else {
         console.log(`🔵 WS: ${userName} -> Conectado al Lobby (Notificaciones)`);
      }

      // 6. Manejo de Mensajes (Solo si está en una sala)
      ws.on('message', async (raw) => {
        if (!ws.roomId) return; // Si está en lobby, no puede enviar mensajes de chat
        // ... (Tu lógica existente de mensajes) ...
        // (Mantenla igual que antes, omitida aquí por brevedad pero NO la borres)
        try {
             // ... tu logica de Joi y chatService ...
             const data = JSON.parse(raw);
             const savedMessage = await chatService.sendMessage(ws.roomId, userId, data.text);
             publishToRoom(ws.roomId, { 
                type: 'message', 
                payload: {
                    from: userId, 
                    text: savedMessage.text, 
                    timestamp: savedMessage.timestamp,
                    name: userName
                } 
             });
        } catch(e) { console.error(e); }
      });

      // 7. Desconexión
      ws.on('close', () => {
        // Remover de Sala
        if (ws.roomId) {
          const roomSockets = rooms.get(ws.roomId);
          if (roomSockets) {
            roomSockets.delete(ws);
            if (roomSockets.size === 0) rooms.delete(ws.roomId);
          }
        }
        // Remover de Mapa Global
        if (ws.userId) {
            const uSockets = userSockets.get(ws.userId);
            if (uSockets) {
                uSockets.delete(ws);
                if (uSockets.size === 0) userSockets.delete(ws.userId);
            }
        }
      });

    } catch (err) {
      console.error('❌ Error WS:', err);
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

// Helper: Enviar a Usuario Específico (Local)
function sendToUser(userId, data) {
    const sockets = userSockets.get(userId);
    if (!sockets) return;
    const msg = JSON.stringify(data);
    for (const client of sockets) {
        if (client.readyState === WebSocket.OPEN) client.send(msg);
    }
}

module.exports = { initWSS };