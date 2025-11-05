const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// ⚠️ Solo inicializar si las variables están definidas
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      (accessToken, refreshToken, profile, done) => {
        return done(null, profile);
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((obj, done) => done(null, obj));

  console.log('✅ Estrategia Google OAuth cargada');
} else {
  console.warn('⚠️ Google OAuth no configurado, se omitirá su inicialización');
}

module.exports = passport;
