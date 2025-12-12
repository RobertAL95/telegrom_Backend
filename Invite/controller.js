'use strict';

const service = require('./service');
const sessionService = require('../Auth/serviceSession'); 

// Helper para errores async
const catchAsync = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ===================================================
// 🟢 Crear invitación
// ===================================================
exports.createInvite = catchAsync(async (req, res) => {
    // Obtenemos el ID del usuario logueado (host) desde req.user
    const userId = req.user.id || req.user._id;

    if (!userId) {
        return res.status(401).json({ error: true, message: 'Usuario no autenticado' });
    }

    const result = await service.createInvite(userId);
    res.status(201).json({ error: false, body: result });
});

// ===================================================
// 🟡 Validar token
// ===================================================
exports.validateToken = catchAsync(async (req, res) => {
    // Viene por params: /validate/:token
    const { token } = req.params;
    
    if (!token) return res.status(400).json({ valid: false });

    const isValid = await service.validateInvite(token);
    res.status(200).json({ valid: isValid });
});

// ===================================================
// 🟢 Aceptar invitación (EL FIX ESTÁ AQUÍ)
// ===================================================
exports.acceptInvite = catchAsync(async (req, res) => {
    const { token, guestName } = req.body;

    if (!token) {
        return res.status(400).json({ error: true, message: 'Token requerido' });
    }

    const finalName = guestName?.trim() || 'Invitado';

    // 1. Llamar al servicio (que devuelve { user, roomId, inviterId })
    const result = await service.acceptInvite(token, finalName);

    // 2. 🔥 CREAR LA SESIÓN (COOKIE) AUTOMÁTICA
    // Esto es lo que faltaba. Sin esto, el frontend no tiene credenciales.
    if (result.user) {
        await sessionService.create(res, result.user, false);
    }

    // 3. 🔥 ENVIAR RESPUESTA ESTRUCTURADA
    // El frontend espera: res.body.user y res.body.roomId
    res.status(201).json({
        error: false,
        body: {
            user: result.user,
            roomId: result.roomId
        }
    });
});