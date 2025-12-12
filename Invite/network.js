'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./controller');
const auth = require('../middleware'); // Asegúrate que la ruta al middleware sea correcta

// =====================================================================
// 🟢 RUTAS DE INVITACIÓN
// =====================================================================

// 1. Crear invitación
// POST /invite
// El controlador recibe (req, res), extrae el usuario y responde.
router.post('/', auth, controller.createInvite);

// 2. Validar token (para la UI)
// GET /invite/validate/:token
// El controlador recibe (req, res) y responde si es válido o no.
router.get('/validate/:token', controller.validateToken);

// 3. Aceptar invitación
// POST /invite/accept
// El controlador recibe (req, res), crea el usuario, PONE LA COOKIE y responde.
router.post('/accept', controller.acceptInvite);

module.exports = router;