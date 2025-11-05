'use strict';

require('dotenv').config();

module.exports = {
  // 🌐 General
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 4000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // 🔐 Seguridad
  jwtSecret: process.env.JWT_SECRET || 'fallback_jwt_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  jwtInviteExpiresIn: process.env.JWT_INVITE_EXPIRES_IN || '10m',

  // 🍃 MongoDB
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/flymdb',

  // 🔴 Redis
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',

  // 📩 Google OAuth (opcional)
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || '',
  },
};
