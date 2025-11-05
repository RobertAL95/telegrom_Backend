'use strict';

const WebSocket = require('ws');
const url = require('url');
const jwtUtils = require('../utils/jwt');
const redis = require('../utils/redis');

// chatId → Set<WebSocket>
const rooms = new Map();

function initWebSocket(server) {
  const wss = new WebSocket.Server({ noServer: true });
  const subscriber = redis.duplicate();
  const publisher = redis.duplicate();

  subscriber.on('error', (err) => console.error('❌ Redis subscriber error:', err));
  publisher.on('error', (err) => console.error('❌ Redis publisher error:', err));

  // Redis → WS broadcasting
  subscriber.on('message', (channel, message) => {
    try {
      const payload = JSON.parse(message);
      const clients = rooms.get(channel);
      if (!clients) return;
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'message', payload }));
        }
      }
    } catch (err) {
      console.error('❌ Error procesando mensaje Redis:', err);
    }
  });

  // Upgrade HTTP → WS
  server.on('upgrade', async (req, socket, head) => {
    const pathname = url.parse(req.url).pathname;
    if (pathname !== '/ws') return socket.destroy();

    try {
      const parsed = url.parse(req.url, true);
      const token = parsed.query?.token;
      if (!token) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        return socket.destroy();
      }

      // 🔐 Verificar token JWT
      let decoded;
      try {
        decoded = jwtUtils.verify(token);
      } catch (err) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        return socket.destroy();
      }

      const { chatId, userId, inviterId, role } = decoded;
      if (!chatId) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        return socket.destroy();
      }

      // 🔎 Validar que roomId == chatId del token
      req.user = { id: userId || inviterId || 'guest', role };
      req.chatId = chatId;

      // Upgrade
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.userId = req.user.id;
        ws.role = req.user.role;
        ws.chatId = req.chatId;
        wss.emit('connection', ws, req);
      });
    } catch (err) {
      console.error('❌ Error autenticando WS:', err);
      socket.destroy();
    }
  });

  // Nueva conexión WS
  wss.on('connection', async (ws, req) => {
    const { userId, chatId, role } = ws;
    console.log(`🔌 WS conectado userId=${userId} role=${role} chatId=${chatId}`);

    if (!rooms.has(chatId)) {
      rooms.set(chatId, new Set());
      await subscriber.subscribe(chatId);
    }

    rooms.get(chatId).add(ws);
    ws.isAlive = true;
    ws.on('pong', () => (ws.isAlive = true));

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (!msg.text || typeof msg.text !== 'string') return;

        const payload = {
          from: userId,
          role,
          text: msg.text.trim(),
          timestamp: Date.now(),
          chatId,
        };

        // Publicar en Redis
        await publisher.publish(chatId, JSON.stringify(payload));
      } catch (err) {
        console.error('❌ Error procesando mensaje:', err.message);
      }
    });

    ws.on('close', () => {
      console.log(`❌ WS cerrado userId=${userId} chatId=${chatId}`);
      const clients = rooms.get(chatId);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          rooms.delete(chatId);
          subscriber.unsubscribe(chatId);
        }
      }
    });
  });

  // Heartbeat
  setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  console.log('⚡ WebSocket efímero inicializado (chatId-based)');
}

module.exports = { initWebSocket };
