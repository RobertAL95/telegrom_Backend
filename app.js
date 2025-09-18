const path = require('path');
const dotenv = require('dotenv');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('./utils/oauth');
const cors = require('cors');

// 🔹 Cargar .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
console.log('MONGO_URI:', process.env.MONGO_URI);

const app = express();

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

app.use(express.json());

// Sesión con Mongo
app.use(session({
  secret: process.env.SESSION_SECRET || 'demo',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    ttl: 14 * 24 * 60 * 60 // 14 días
  })
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Rutas
app.use('/auth', require('./Auth/network'));
app.use('/chatlist', require('./ChatList/network'));
app.use('/chat', require('./Chat/network'));

module.exports = app;
