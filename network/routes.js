'use strict';

const { Router } = require('express');
const router = Router();
const authMiddleware = require('../middleware');

// ===================================================
// 📦 Importación de Sub-rutas
// ===================================================
const authRoutes = require('../Auth/network');
const chatRoutes = require('../Chat/network');
const chatListRoutes = require('../ChatList/network');
const inviteRoutes = require('../Invite/network');
const friendRoutes = require('../Friend/network'); 

// 👇 AQUÍ ESTÁ EL CAMBIO: Usamos el módulo Media nuevo
const mediaRoutes = require('../Media/network'); 

// ===================================================
// 🔓 Rutas Públicas
// ===================================================
router.use('/auth', authRoutes);
router.use('/invite', inviteRoutes);

// ===================================================
// ⚖️ Rutas Híbridas
// ===================================================
router.use('/chat', chatRoutes);
router.use('/friend', friendRoutes); 

// ===================================================
// 🔒 Rutas Protegidas
// ===================================================
router.use('/chatlist', authMiddleware, chatListRoutes);

// 👇 CONECTAMOS LA RUTA MEDIA
// Ahora /media/upload funcionará
router.use('/media', mediaRoutes);

// ===================================================
// 🔸 Health Check
// ===================================================
router.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'success',
    message: 'FlyM API v1 Online 🚀',
    timestamp: new Date().toISOString()
  });
});

// ===================================================
// 🚫 Catch-All 404
// ===================================================
router.use('*', (req, res) => {
  res.status(404).json({
    error: true,
    message: `Ruta no encontrada: ${req.originalUrl}`,
    valid_endpoints: ['/auth', '/invite', '/chat', '/chatlist', '/friend', '/media']
  });
});

module.exports = router;