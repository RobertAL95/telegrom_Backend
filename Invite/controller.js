'use strict';

const service = require('./service');
const sessionService = require('../Auth/serviceSession'); 

const catchAsync = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ... (createInvite y validateToken se quedan igual) ...

// ===================================================
// 🟢 Aceptar invitación (FIXED)
// ===================================================
exports.acceptInvite = catchAsync(async (req, res) => {
    const { token, guestName } = req.body;

    if (!token) {
        return res.status(400).json({ error: true, message: 'Token requerido' });
    }

    const finalName = guestName?.trim() || 'Invitado';

    // 1. Llamar al servicio
    // Ahora devuelve { user, chat, inviterId }
    const result = await service.acceptInvite(token, finalName);

    // 2. Crear Cookie de Sesión
    if (result.user) {
        await sessionService.create(res, result.user, false);
    }

    // ---------------------------------------------------------
    // 🔮 PREPARACIÓN PARA PASO 3 (WEBSOCKETS)
    // Aquí es donde, en el siguiente paso, insertaremos:
    // io.to(result.inviterId).emit('update_chatlist', result.chat);
    // ---------------------------------------------------------

    // 3. Responder al Frontend del Guest
    res.status(201).json({
        error: false,
        body: {
            user: result.user,
            chat: result.chat, // ✅ El objeto chat ya formateado con nombre del Host
            roomId: result.chat.id // Mantenemos compatibilidad por si acaso
        }
    });
});