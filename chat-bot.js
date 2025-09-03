const WebSocket = require("ws");

// Diccionario de palabras
const dictionary = [
  "hoy", "clima", "lluvia", "sol", "nublado", "viento", "temperatura",
  "frío", "calor", "humedad", "pronóstico", "cielo", "tormenta", "paraguas",
  "caminar", "planes", "rápido", "despacio", "ráfaga", "paseo"
];

// Función para generar frases aleatorias
function generateSentence(wordCount = 5) {
  let sentence = [];
  for (let i = 0; i < wordCount; i++) {
    const word = dictionary[Math.floor(Math.random() * dictionary.length)];
    sentence.push(word);
  }
  // Capitaliza primera letra y agrega punto
  return sentence.join(" ") + ".";
}

// WebSockets simulados para comunicación local
function createFakeWS() {
  let listeners = [];
  return {
    send(msg) {
      setTimeout(() => listeners.forEach(cb => cb(msg)), 500);
    },
    on(event, cb) {
      if (event === "message") listeners.push(cb);
    }
  };
}

const ws1 = createFakeWS();
const ws2 = createFakeWS();

// Bot1 escucha y responde
ws1.on("message", (msg) => {
  console.log("Bot1 escuchó: " + msg);
  const reply = generateSentence();
  ws2.send("Bot1: " + reply);
});

// Bot2 escucha y responde
ws2.on("message", (msg) => {
  console.log("Bot2 escuchó: " + msg);
  const reply = generateSentence();
  ws1.send("Bot2: " + reply);
});

// Inicia la conversación
ws1.send("Bot1: " + generateSentence());

// Mantener conversación 2 minutos
setTimeout(() => {
  console.log("💤 Fin de la conversación de 2 minutos.");
  process.exit();
}, 120000);