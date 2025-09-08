const app = require('./app');
const mongoose = require('mongoose');
const { mongoURI } = require('./config');
const WebSocket = require('ws');
const http = require('http');

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSockets
wss.on('connection', (ws) => {
  console.log('Cliente conectado al WS');
  ws.on('message', (message) => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) client.send(message);
    });
  });
});

// Conexión a MongoDB
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("✅ Conectado a MongoDB");

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
  });
})
.catch((err) => {
  console.error("❌ Error al conectar a MongoDB:", err);
});
