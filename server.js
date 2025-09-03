const app = require('./app');
const mongoose = require('mongoose');
const { mongoURI } = require('./config');
const WebSocket = require('ws');
const http = require('http');

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Cliente conectado al WS');
  ws.on('message', (message) => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) client.send(message);
    });
  });
});

mongoose.connect(mongoURI).then(() => {
  console.log('DB conectada');
  server.listen(3000, () => console.log('Servidor corriendo en puerto 3000'));
});