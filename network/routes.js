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
// ===================================================
// 🔓 Rutas Públicas (Public Layer)
// ===================================================
router.use('/auth', authRoutes);
router.use('/invite', inviteRoutes);

// ===================================================
// ⚖️ Rutas Híbridas (Auth delegada al controlador)
// ===================================================
/* El componente Chat maneja su propia lógica de seguridad:
  - Tokens de usuario real vs. Tokens de invitado.
*/
router.use('/chat', chatRoutes);

// ===================================================
// 🔒 Rutas Protegidas (Secure Layer)
// ===================================================
// Middleware aplicado explícitamente antes de entrar al componente
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
// 🚫 Catch-All 404 (Para evitar HTML en la API)
// ===================================================
// Esto asegura que si piden una ruta que no existe, reciban JSON y no HTML
router.use('*', (req, res) => {
  res.status(404).json({
    error: true,
    message: `Ruta no encontrada: ${req.originalUrl}`,
    valid_endpoints: ['/auth', '/invite', '/chat', '/chatlist']
  });
});

module.exports = router;