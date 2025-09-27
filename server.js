const app = require('./app');
const mongoose = require('mongoose');
const { mongoURI } = require('./config');
const WebSocket = require('ws');
const http = require('http');

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 🔹 Conexión WS
wss.on('connection', (ws) => {
  console.log('Cliente conectado al WS');

  // Cada socket puede unirse a una conversación
  ws.conversationId = null;

  ws.on('message', (rawMessage) => {
    let data;
    try {
      data = JSON.parse(rawMessage);
    } catch (err) {
      console.error('JSON inválido', err);
      return;
    }

    const { type, payload } = data;

    switch (type) {
      case 'join':
        ws.conversationId = payload.conversationId;
        console.log(`Socket unido a conversación ${ws.conversationId}`);
        break;

      case 'leave':
        ws.conversationId = null;
        break;

      case 'message':
        // Emitir solo a clientes en la misma conversación
        wss.clients.forEach((client) => {
          if (
            client.readyState === WebSocket.OPEN &&
            client.conversationId === ws.conversationId
          ) {
            client.send(JSON.stringify({ type: 'message', payload: payload.message }));
          }
        });
        break;

      default:
        console.warn('Tipo de mensaje no manejado:', type);
    }
  });

  ws.on('close', () => {
    console.log('Cliente desconectado del WS');
  });
});

// 🔹 Conexión a MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("✅ Conectado a MongoDB");
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Error al conectar a MongoDB:", err);
  });
