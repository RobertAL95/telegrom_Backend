// network/routes.js
'use strict';

const express = require('express');
const router = express.Router();

// Importar módulos de red
const authRoutes = require('../Auth/network');
const chatRoutes = require('../Chat/network');
const chatListRoutes = require('../ChatList/network');
const inviteRoutes = require('../Invite/network');

// Montar rutas
router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);
router.use('/chatlist', chatListRoutes);
router.use('/invite', inviteRoutes);

// Ruta base de prueba
router.get('/', (req, res) => {
  res.json({ message: 'API Online 🚀' });
});

module.exports = router;
