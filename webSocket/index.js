'use strict';

const WebSocket = require('ws');
const url = require('url');
const cookie = require('cookie');
const jwtUtils = require('../utils/jwt');
const redis = require('../utils/redis');

// ===================================================
// 🧩 Mapa de rooms: chatId → Set<WebSocket>
// ===================================================
const rooms = new Map();

// ===================================================
// 🚀 Inicializador principal del WebSocket efímero
// ===================================================
function initWebSocket(server) {
  const wss = new WebSocket.Server({ noServer: true });
  const subscriber = redis.duplicate();
  const publisher = redis.duplicate();

  subscriber.on('error', (err) => console.error('❌ Redis subscriber error:', err));
  publisher.on('error', (err) => console.error('❌ Redis publisher error:', err));

  // ===================================================
  // 📡 Redis → broadcast WebSocket
  // ===================================================
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

  // ===================================================
  // 🔐 Upgrade HTTP → WS con validación JWT desde cookie
  // ===================================================
  server.on('upgrade', async (req, socket, head) => {
    const pathname = url.parse(req.url).pathname;
    if (pathname !== '/ws') return socket.destroy();

    try {
      // 🔎 Leer cookies desde el handshake
      const cookies = cookie.parse(req.headers.cookie || '');
      const token = cookies.at; // access token (15 min)

      if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        return socket.destroy();
      }

      const decoded = jwtUtils.verify(token);
      if (!decoded?.id) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        return socket.destroy();
      }

      // Esperamos chatId en query (?roomId=xxx o ?chatId=xxx)
      const parsed = url.parse(req.url, true);
      const chatId = parsed.query?.chatId || parsed.query?.roomId;
      if (!chatId) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        return socket.destroy();
      }

      // Inyectar datos en la request para el upgrade
      req.user = { id: decoded.id, email: decoded.email, name: decoded.name };
      req.chatId = chatId;

      // ✅ Autorizado → Upgrade
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.userId = decoded.id;
        ws.email = decoded.email;
        ws.name = decoded.name;
        ws.chatId = chatId;
        wss.emit('connection', ws, req);
      });
    } catch (err) {
      console.error('❌ Error autenticando WebSocket:', err);
      socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      socket.destroy();
    }
  });

  // ===================================================
  // 🟢 Nueva conexión WS
  // ===================================================
  wss.on('connection', async (ws, req) => {
    const { userId, name, chatId } = ws;
    console.log(`🔌 WS conectado: userId=${userId} name=${name} chatId=${chatId}`);

    if (!rooms.has(chatId)) {
      rooms.set(chatId, new Set());
      await subscriber.subscribe(chatId);
    }

    rooms.get(chatId).add(ws);
    ws.isAlive = true;
    ws.on('pong', () => (ws.isAlive = true));

    // ===================================================
    // ✉️ Mensajes entrantes
    // ===================================================
    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (!msg.text || typeof msg.text !== 'string') return;

        const payload = {
          from: userId,
          name,
          text: msg.text.trim(),
          timestamp: Date.now(),
          chatId,
        };

        await publisher.publish(chatId, JSON.stringify(payload));
      } catch (err) {
        console.error('❌ Error procesando mensaje:', err.message);
      }
    });

    // ===================================================
    // ❌ Desconexión
    // ===================================================
    ws.on('close', () => {
      console.log(`⚪ WS desconectado: userId=${userId} chatId=${chatId}`);
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

  // ===================================================
  // ❤️ Heartbeat (detectar clientes caídos)
  // ===================================================
  setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  console.log('⚡ WebSocket efímero inicializado con validación JWT por cookie (at)');
}

module.exports = { initWebSocket };
