const WebSocket = require("ws");

const URL = "ws://localhost:3000";

// Crear 2 clientes simulados
const userA = new WebSocket(URL);
const userB = new WebSocket(URL);

function simulateUser(user, name, delay) {
  let counter = 0;

  user.on("open", () => {
    console.log(`${name} conectado ✅`);

    // Envía mensajes cada X segundos
    const interval = setInterval(() => {
      counter++;
      const msg = `${name}: Hola #${counter}`;
      user.send(msg);
    }, delay);

    // Cierra después de 2 minutos
    setTimeout(() => {
      clearInterval(interval);
      console.log(`${name} terminó la conversación ❌`);
      user.close();
    }, 2 * 60 * 1000);
  });

  user.on("message", (msg) => {
    console.log(`${name} recibió: ${msg}`);
  });
}

// Usuario A escribe cada 3s, B cada 5s
simulateUser(userA, "👤 Usuario A", 3000);
simulateUser(userB, "👤 Usuario B", 5000);
