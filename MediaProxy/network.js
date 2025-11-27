'use strict';
const express = require('express');
const router = express.Router();
const service = require('./service');
const controller = require('./controller');
const response = require('../network/response');
const auth = require('../middleware'); // Middleware para obtener req.user

/* ===================================================
   🟢 Endpoint de Descarga/Servicio de Archivos
   GET /media/files/:key
=================================================== */
// Esta ruta debe ir enlazada en network/routes.js (router.use('/media', mediaProxyRoutes))
router.get('/files/:key', auth, async (req, res) => {
    const fileKey = req.params.key;
    const userId = req.user?.id; // Viene limpio de 'auth' (Usuario o Invitado)

    // 1. Verificación de Autenticación
    if (!userId) {
        // El middleware 'auth' ya debería haber bloqueado esto con 401/403, 
        // pero lo mantenemos como capa de seguridad final.
        return response.error(req, res, 'No autenticado para acceder al archivo', 401);
    }
    
    try {
        // 2. 🔥 Control de Acceso (ACL)
        const hasAccess = await controller.checkFileAccess(userId, fileKey);

        if (!hasAccess) {
            return response.error(req, res, 'Acceso prohibido al archivo', 403);
        }

        // 3. Obtener el Stream del servicio S3
        const fileStream = service.getReadStream(fileKey);

        // 4. Pipelining y Manejo de Errores de Stream
        
        fileStream.on('error', (err) => {
            // El error puede ser "Archivo no encontrado" (404) o un error de S3/conexión.
            console.error('❌ Error en el stream de S3:', err.message);
            
            // Si los headers ya fueron enviados, Express no puede cambiar el status.
            if (res.headersSent) {
                return; 
            }
            // Asumiendo que 404 es el error más común
            response.error(req, res, 'Archivo no encontrado o error interno', 404);
        });

        // 5. Servir el Stream
        // Establecer un Content-Type genérico o inferir el tipo de archivo si es posible
        res.setHeader('Content-Type', 'application/octet-stream'); 
        res.setHeader('Content-Disposition', `attachment; filename="${fileKey.split('/').pop()}"`); // Forzar descarga con el nombre original
        
        fileStream.pipe(res); // 🚀 Canalizar el stream de S3 directamente al cliente
        
    } catch (e) {
        console.error('❌ Error crítico en MediaProxy:', e.message);
        // Respuesta 500 si la lógica del controller falla
        response.error(req, res, 'Error interno del servidor', 500);
    }
});

module.exports = router;