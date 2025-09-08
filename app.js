const path = require('path');
const dotenv = require('dotenv');

// 🔹 Cargar el .env correcto según el entorno
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// 🔹 Debug: verificar que las variables están cargadas
console.log('Archivo .env cargado:', envFile);
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
console.log('MONGO_URI:', process.env.MONGO_URI);

const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('./utils/oauth'); // passport ahora ve las variables de entorno

const app = express();
app.use(express.json());

// 🔹 Configuración de sesión usando MongoStore
app.use(session({
  secret: process.env.SESSION_SECRET || 'demo',
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    ttl: 14 * 24 * 60 * 60 // 14 días
  })
}));

// 🔹 Inicializar Passport después de la sesión
app.use(passport.initialize());
app.use(passport.session());

// Rutas principales
app.use('/auth', require('./Auth/network'));
app.use('/chatlist', require('./ChatList/network'));
app.use('/chat', require('./Chat/network'));

module.exports = app;
