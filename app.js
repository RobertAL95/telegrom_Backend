const express = require('express');
const app = express();
const passport = require('./utils/oauth');
const session = require('express-session');

require('dotenv').config();
app.use(express.json());

app.use(session({ secret: 'demo', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Rutas principales
app.use('/auth', require('./Auth/network'));
app.use('/chatlist', require('./ChatList/network'));
app.use('/chat', require('./Chat/network'));

module.exports = app;