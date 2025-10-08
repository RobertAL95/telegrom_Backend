module.exports = {
  // 🔐 JWT
  jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret',

  // 🍃 MongoDB
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/mydb',

  // 🌐 CORS / Frontend URL
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // 🌎 Entorno actual
  nodeEnv: process.env.NODE_ENV || 'development',

  // 🔑 OAuth (Google, etc.)
  google: {
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5001/auth/google/callback',
  },
};
