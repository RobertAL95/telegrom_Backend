'use strict';
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../middleware'); // Tu middleware de auth

// Todas las rutas requieren estar logueado
router.use(auth);

router.post('/request', controller.sendRequest);   // Enviar solicitud
router.post('/accept', controller.acceptRequest);  // Aceptar solicitud
router.post('/reject', controller.rejectRequest);  // Rechazar o Cancelar
router.get('/status/:otherUserId', controller.checkStatus); // Ver estado con X persona
router.get('/', controller.listFriends);           // Listar mis amigos
router.get('/pending-count', controller.countPending);
router.get('/pending-list', controller.getPendingRequests);

module.exports = router;