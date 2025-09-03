require('dotenv').config();

module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'secret123',
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/telegram-demo',
  google: {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  }
};