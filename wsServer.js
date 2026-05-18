'use strict';
const WebSocket = require('ws');
const { verify } = require('./utils/jwt');
const Conversation = require('./globalModels/Conversation');
const cookie = require('cookie');
const redis = require('./utils/redis');
const chatService = require('./Chat/service');

const pubClient = redis.createClient();
const subClient = redis.createClient();
const CHAT_CHANNEL = 'CHAT_GLOBAL_CHANNEL';
const NOTIFICATION_CHANNEL = 'NOTIFICATION_CHANNEL';

// Estado local optimizado
const rooms = new Map(); // roomId -> Set<ws>
const userSockets = new Map(); // userId -> Set<ws>

function initWSS(server) {
    const wss = new WebSocket.Server({ server, path: '/ws' });

    subClient.subscribe(CHAT_CHANNEL);
    subClient.subscribe(NOTIFICATION_CHANNEL);

    subClient.on('message', (channel, message) => {
        const parsed = JSON.parse(message);
        if (channel === CHAT_CHANNEL) broadcastToRoomLocal(parsed.roomId, parsed.data);
        if (channel === NOTIFICATION_CHANNEL) sendToUserLocal(parsed.userId, parsed.payload);
    });

    wss.on('connection', async (ws, req) => {
        const user = await authenticate(ws, req);
        if (!user) return;

        setupUser(ws, user);

        ws.on('message', (raw) => handleIncomingMessage(ws, raw));
        ws.on('pong', () => { ws.isAlive = true; });
        ws.on('close', () => cleanup(ws));
    });

    // Heartbeat cada 30s
    const interval = setInterval(() => {
        wss.clients.forEach(ws => {
            if (!ws.isAlive) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);
}

// --- Lógica de Autenticación y Registro ---

async function authenticate(ws, req) {
    try {
        const cookies = cookie.parse(req.headers.cookie || '');
        const token = cookies.at; 
        if (!token) throw new Error('No token');
        
        const decoded = verify(token);
        return { id: decoded.id.toString(), name: decoded.name };
    } catch (e) {
        ws.close(4001, 'Unauthorized');
        return null;
    }
}

function setupUser(ws, user) {
    ws.userId = user.id;
    ws.userName = user.name;
    ws.isAlive = true;
    ws.activeRooms = new Set(); // Guardamos las salas autorizadas en el socket

    if (!userSockets.has(user.id)) userSockets.set(user.id, new Set());
    userSockets.get(user.id).add(ws);
}

// --- Manejador de Mensajes (El Corazón) ---

async function handleIncomingMessage(ws, raw) {
    try {
        const data = JSON.parse(raw);

        switch (data.type) {
            case 'join_chat':
                await handleJoinChat(ws, data.chatId);
                break;
            
            case 'message':
                await handleChatMessage(ws, data);
                break;

            case 'typing': // ⌨️ Nueva lógica: Ligera y sin DB
                handleTyping(ws, data);
                break;

            case 'leave_chat':
                handleLeaveChat(ws, data.chatId);
                break;
        }
    } catch (e) {
        console.error('WS Error:', e);
    }
}

// --- Acciones Específicas ---

async function handleJoinChat(ws, chatId) {
    // Solo consultamos DB al UNIRSE, no en cada mensaje
    const conversation = await Conversation.findById(chatId, 'participants').lean();
    if (!conversation || !conversation.participants.some(p => p.toString() === ws.userId)) {
        return ws.send(JSON.stringify({ type: 'error', message: 'Access denied' }));
    }

    if (!rooms.has(chatId)) rooms.set(chatId, new Set());
    rooms.get(chatId).add(ws);
    ws.activeRooms.add(chatId);
    
    ws.send(JSON.stringify({ type: 'room_joined', chatId }));
}

async function handleChatMessage(ws, data) {
    try {
        // 🟢 1. Validamos seguridad buscando los participantes reales en MongoDB
        const conversation = await Conversation.findById(data.chatId, 'participants').lean();
        if (!conversation || !conversation.participants.some(p => p.toString() === ws.userId)) {
            return ws.send(JSON.stringify({ type: 'error', message: 'No tienes acceso a este chat' }));
        }

        // 2. Guardar en la Base de Datos
        const saved = await chatService.sendMessage(data.chatId, ws.userId, data.text, data.media);

        const payload = {
            type: 'message',
            chatId: data.chatId,
            payload: {
                _id: saved._id,
                from: ws.userId,
                text: saved.text,
                media: saved.media,
                timestamp: saved.timestamp || new Date().toISOString(),
                name: ws.userName
            }
        };

        // 🟢 3. MULTI-CAST DEFINITIVO: Enviamos el mensaje a cada participante por su ID único
        // Esto garantiza que les llegue a su interfaz estén donde estén navegando en la app
        conversation.participants.forEach(participantId => {
            pubClient.publish(NOTIFICATION_CHANNEL, JSON.stringify({
                userId: participantId.toString(),
                payload: payload
            }));
        });

    } catch (err) {
        console.error('❌ Error procesando mensaje en WS:', err.message);
    }
}
function handleTyping(ws, data) {
    if (!ws.activeRooms.has(data.chatId)) return;

    // El evento 'typing' NO se guarda en base de datos. Es efímero.
    const payload = {
        type: 'typing',
        chatId: data.chatId,
        userId: ws.userId,
        isTyping: data.isTyping // true o false
    };

    // Se envía solo a la habitación, el servidor es transparente
    pubClient.publish(CHAT_CHANNEL, JSON.stringify({ roomId: data.chatId, data: payload }));
}

// --- Helpers de Red ---

function broadcastToRoomLocal(roomId, data) {
    const clients = rooms.get(roomId);
    if (!clients) return;
    const msg = JSON.stringify(data);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(msg);
    });
}

function sendToUserLocal(userId, data) {
    const sockets = userSockets.get(userId);
    if (sockets) {
        const msg = JSON.stringify(data);
        sockets.forEach(s => s.send(msg));
    }
}

function cleanup(ws) {
    if (ws.userId) {
        const sockets = userSockets.get(ws.userId);
        if (sockets) {
            sockets.delete(ws);
            if (sockets.size === 0) userSockets.delete(ws.userId);
        }
    }
    ws.activeRooms?.forEach(chatId => {
        const r = rooms.get(chatId);
        if (r) {
            r.delete(ws);
            if (r.size === 0) rooms.delete(chatId);
        }
    });
}

module.exports = { initWSS };