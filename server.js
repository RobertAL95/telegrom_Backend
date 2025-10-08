// server.js
'use strict';
require('dotenv').config();

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('./utils/oauth'); // OAuth si lo usas
const WebSocket = require('ws');
const url = require('url');
const { ObjectId } = require('mongodb');
const jwtUtils = require('./utils/jwt');
const redis = require('./utils/redis'); // tu archivo de Redis con ioredis
const Conversation = require('./Chat/model');
const config = require('./config');
const routes = require('./network/routes');

const { z } = require('zod'); // Validación payload

// =========================
//  🔗 Configuración inicial
// =========================
const PORT = process.env.PORT || 4000;
const app = express();
const server = http.createServer(app);

// =========================
//  🔗 Conexión a MongoDB
// =========================
mongoose.connect(config.mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => {
    console.error('❌ Error conectando a MongoDB:', err);
    process.exit(1);
  });

// =========================
//  ⚙️ Middlewares Express
// =========================
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET || 'session_demo_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: config.mongoURI, ttl: 14 * 24 * 60 * 60 }),
  cookie: {
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    secure: config.nodeEnv === 'production',
  },
}));

app.use(passport.initialize());
app.use(passport.session());
app.use('/', routes);

// =========================
//  🔌 WebSocket Server
// =========================
const wss = new WebSocket.Server({ noServer: true });

// Redis pub/sub
const subscriber = redis.duplicate();
const publisher = redis.duplicate();

subscriber.on('connect', () => console.log('✅ Subscriber Redis conectado'));
subscriber.on('error', err => console.error('❌ Error Subscriber Redis:', err));

publisher.on('connect', () => console.log('✅ Publisher Redis conectado'));
publisher.on('error', err => console.error('❌ Error Publisher Redis:', err));

subscriber.subscribe('chat_messages', (err) => {
  if (err) console.error('❌ Error al suscribirse a chat_messages', err);
});

subscriber.on('message', (channel, message) => {
  if (channel !== 'chat_messages') return;
  try {
    const data = JSON.parse(message);
    const convoIdStr = data.conversationId.toString();
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN &&
          client.conversationId?.toString() === convoIdStr) {
        client.send(JSON.stringify({ type: 'message', payload: data.message }));
      }
    });
  } catch (e) {
    console.error('❌ Error procesando mensaje Redis', e);
  }
});

// =========================
//  🔐 Autenticación WS
// =========================
server.on('upgrade', async (req, socket, head) => {
  try {
    const parsed = url.parse(req.url, true);
    const token = parsed.query?.token;
    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    let decoded;
    try { decoded = jwtUtils.verify(token); } 
    catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    req.user = { id: decoded.id, email: decoded.email };
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.userId = decoded.id;
      wss.emit('connection', ws, req);
    });
  } catch (err) {
    console.error('❌ Error autenticando WS:', err);
    socket.destroy();
  }
});

// =========================
//  🧠 Manejo de conexiones WS
// =========================
const joinSchema = z.object({ conversationId: z.string().min(1) });
const messageSchema = z.object({ text: z.string().min(1) });

wss.on('connection', (ws, req) => {
  console.log(`🔌 WS conectado userId=${ws.userId}`);
  ws.isAlive = true;
  ws.conversationId = null;

  ws.on('pong', () => ws.isAlive = true);

  ws.on('message', async (raw) => {
    let data;
    try { data = JSON.parse(raw); } 
    catch { return ws.send(JSON.stringify({ type: 'error', message: 'JSON inválido' })); }

    const { type, payload } = data;
    try {
      switch (type) {

        case 'join': {
          const parsed = joinSchema.safeParse(payload);
          if (!parsed.success) return ws.send(JSON.stringify({ type: 'error', message: 'conversationId inválido' }));

          const convoId = parsed.data.conversationId;
          if (!ObjectId.isValid(convoId)) return ws.send(JSON.stringify({ type: 'error', message: 'conversationId inválido' }));

          const convo = await Conversation.findById(convoId).lean();
          if (!convo) return ws.send(JSON.stringify({ type: 'error', message: 'Conversación no encontrada' }));

          if (!convo.participants.some(p => p.toString() === ws.userId.toString()))
            return ws.send(JSON.stringify({ type: 'error', message: 'No perteneces a esta conversación' }));

          ws.conversationId = convoId;
          ws.send(JSON.stringify({ type: 'joined', conversationId: convoId }));
          console.log(`Usuario ${ws.userId} unido a ${convoId}`);
          break;
        }

        case 'message': {
          if (!ws.conversationId) return ws.send(JSON.stringify({ type: 'error', message: 'No estás en una conversación' }));
          const parsed = messageSchema.safeParse(payload);
          if (!parsed.success) return ws.send(JSON.stringify({ type: 'error', message: 'Mensaje inválido' }));

          const messageDoc = { sender: ws.userId, text: parsed.data.text, createdAt: new Date().toISOString() };
          await Conversation.findByIdAndUpdate(ws.conversationId, { $push: { messages: messageDoc } });

          const outgoing = { conversationId: ws.conversationId, message: messageDoc };
          publisher.publish('chat_messages', JSON.stringify(outgoing));
          break;
        }

        case 'leave':
          ws.conversationId = null;
          ws.send(JSON.stringify({ type: 'left' }));
          break;

        default:
          ws.send(JSON.stringify({ type: 'error', message: 'Tipo no soportado' }));
      }
    } catch (err) {
      console.error('❌ Error manejando WS:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'Error interno' }));
    }
  });

  ws.on('close', () => {
    console.log(`🔌 WS cerrado userId=${ws.userId}`);
    ws.conversationId = null;
  });
});

// =========================
//  🩺 Limpieza de conexiones muertas
// =========================
setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30_000);

// =========================
//  🚀 Iniciar servidor
// =========================
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
