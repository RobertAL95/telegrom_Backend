require('dotenv').config();

module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'secret123',

  // Si no encuentra MONGO_URI en .env, usa tu base local por defecto
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/telegram-demo',

  google: {
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
  }
};
