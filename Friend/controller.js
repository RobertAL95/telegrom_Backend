'use strict';
const service = require('./service');
// 👇 IMPORTANTE: Traemos la función que habla con Redis/WebSockets
const { notifyUser } = require('../wsServer'); 

exports.sendRequest = (req, res) => {
    const { targetUserId } = req.body;
    
    service.sendRequest(req.user.id, targetUserId)
        .then(data => {
            // ✅ ÉXITO: La solicitud se guardó en Mongo.
            
            // 🔥 AHORA: Avisamos en tiempo real al destinatario via Redis->WS
            notifyUser(targetUserId, {
                type: 'friend_request', // El Frontend escucha este evento para el contador rojo
                from: req.user.name     // Opcional: por si quieres mostrar quién fue
            });

            res.status(201).json({ error: false, body: data });
        })
        .catch(err => res.status(500).json({ error: true, message: err.message }));
};

exports.acceptRequest = (req, res) => {
    const { friendshipId } = req.body;
    service.acceptRequest(req.user.id, friendshipId)
        .then(data => res.status(200).json({ error: false, body: data }))
        .catch(err => res.status(500).json({ error: true, message: err.message }));
};

exports.getPendingRequests = (req, res) => {
    service.getPendingRequestsDetails(req.user.id)
        .then(list => res.status(200).json({ error: false, body: list }))
        .catch(err => res.status(500).json({ error: true, message: err.message }));
};

exports.rejectRequest = (req, res) => {
    const { targetUserId } = req.body; 
    service.rejectRequest(req.user.id, targetUserId)
        .then(data => res.status(200).json({ error: false, body: data }))
        .catch(err => res.status(500).json({ error: true, message: err.message }));
};

exports.checkStatus = (req, res) => {
    const { otherUserId } = req.params;
    service.checkStatus(req.user.id, otherUserId)
        .then(data => res.status(200).json({ error: false, body: data }))
        .catch(err => res.status(500).json({ error: true, message: err.message }));
};

exports.listFriends = (req, res) => {
    service.listFriends(req.user.id)
        .then(data => res.status(200).json({ error: false, body: data }))
        .catch(err => res.status(500).json({ error: true, message: err.message }));
};

// Endpoint para obtener el conteo inicial de solicitudes (para la campana)
exports.countPending = (req, res) => {
    service.countPendingReceived(req.user.id)
        .then(count => res.status(200).json({ error: false, body: { count } }))
        .catch(err => res.status(500).json({ error: true, message: err.message }));
};