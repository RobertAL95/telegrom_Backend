'use strict';

const service = require('./service');
const sessionService = require('../Auth/serviceSession'); 

// Helper para manejo de errores async (lo mantenemos igual)
const catchAsync = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ===================================================
// 🟢 1. Crear invitación
// ===================================================
exports.createInvite = catchAsync(async (req, res) => {
    // Obtenemos ID del usuario de forma segura
    const userId = req.user ? (req.user._id || req.user.id) : null;
    
    if (!userId) {
        return res.status(401).json({ error: true, message: 'Usuario no autenticado' });
    }

    // Pasamos el body (que puede estar vacío ahora) y el userId
    const result = await service.createInvite(req.body, userId);
    
    res.status(201).json({
        error: false,
        body: result
    });
});

// ===================================================
// 🟢 2. Validar token
// ===================================================
exports.validateToken = catchAsync(async (req, res) => {
    const { token } = req.params;
    
    // El servicio devuelve: { valid: true, inviterName: '...', type: '...' }
    const result = await service.validateInvite(token); 

    // Devolvemos status 200 siempre que no haya explotado el servidor.
    // El frontend leerá body.valid para saber si muestra el formulario o error.
    res.status(200).json({
        error: false,
        body: result
    });
});

// ===================================================
// 🟢 3. Aceptar invitación
// ===================================================
exports.acceptInvite = catchAsync(async (req, res) => {
    const { token, guestName } = req.body;

    if (!token) {
        return res.status(400).json({ error: true, message: 'Token requerido' });
    }

    const finalName = guestName?.trim() || 'Invitado';

    // 1. Llamar al servicio (Crea usuario guest y el chat)
    // Devuelve: { user, chat, inviterId }
    const result = await service.acceptInvite(token, finalName);

    // 2. 🔥 CRÍTICO: Crear Cookie de Sesión para el Invitado
    // Esto es lo que permite que el invitado use el chat inmediatamente sin login.
    if (result.user) {
        // false indica que NO es una PWA (usa tiempos de expiración web)
        sessionService.create(res, result.user, false);
    }

    // 3. Responder al Frontend
    // Aseguramos que 'roomId' vaya poblado para compatibilidad con tu frontend
    const roomId = result.chat.id || result.chat._id;

    res.status(201).json({
        error: false,
        body: {
            user: result.user,
            chat: result.chat, // Objeto chat completo (name, avatar, etc.)
            roomId: roomId     // ID explícito para redirección fácil
        }
    });
});