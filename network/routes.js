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
const mediaProxyRoutes = require('../MediaProxy/network');

// 🔧 CORRECCIÓN AQUÍ: Usamos '../' igual que los demás
const friendRoutes = require('../Friend/network'); 

// ===================================================
// 🔓 Rutas Públicas (Public Layer)
// ===================================================
router.use('/auth', authRoutes);
router.use('/invite', inviteRoutes);

// ===================================================
// ⚖️ Rutas Híbridas (Auth delegada al controlador)
// ===================================================
/* El componente Chat maneja su propia lógica de seguridad */
router.use('/chat', chatRoutes);

// 🔧 RECOMENDACIÓN: Mover aquí o abajo.
// Aunque 'friendRoutes' tiene su propio auth interno (router.use(auth)),
// semánticamente no es pública. Funciona aquí, pero es más ordenado:
router.use('/friend', friendRoutes); 

// ===================================================
// 🔒 Rutas Protegidas (Secure Layer)
// ===================================================
router.use('/chatlist', authMiddleware, chatListRoutes);

// ===================================================
// 🔸 Health Check / Root API
// ===================================================
router.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'success',
    message: 'FlyM API v1 Online 🚀',
    timestamp: new Date().toISOString()
  });
});

router.use('/media', mediaProxyRoutes);

// ===================================================
// 🚫 Catch-All 404
// ===================================================
router.use('*', (req, res) => {
  res.status(404).json({
    error: true,
    message: `Ruta no encontrada: ${req.originalUrl}`,
    valid_endpoints: ['/auth', '/invite', '/chat', '/chatlist', '/friend']
  });
});

module.exports = router;