'use strict';

// ⚙️ Dependencias y Configuración
const mongoose = require('mongoose');
const { mongoURI } = require('../config');
const Conversation = require('../globalModels/Conversation');
const UserGuest = require('../globalModels/UserGuest');

// ⌛ Umbral de inactividad: 7 días (para invitados)
const INACTIVITY_THRESHOLD_MS = 604800000; 

/**
 * Función principal para conectar, limpiar y desconectar.
 */
async function runCleanup() {
    let connection;
    let exitCode = 0;
    try {
        console.log('🔄 Iniciando proceso de limpieza cron...');
        
        // 1. Conexión a MongoDB (Usando el pool de conexión principal, pero con maxPoolSize 1 para la tarea)
        connection = await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000, 
            maxPoolSize: 1 
        });
        console.log('✅ Conexión MongoDB establecida.');

        // 2. Definir el punto de corte
        const cutoffDate = new Date(Date.now() - INACTIVITY_THRESHOLD_MS);
        
        // ========================================================
        // 🧹 TAREA 1: Identificar y Eliminar Usuarios Invitados Inactivos
        // ========================================================
        
        // Obtenemos los IDs de los invitados que serán eliminados
        const guestsToDelete = await UserGuest.find({
            createdAt: { $lt: cutoffDate }
        }, '_id'); // Solo necesitamos el campo _id

        const guestIds = guestsToDelete.map(g => g._id);

        if (guestIds.length > 0) {
            
            // 🔥 Ejecución de la eliminación
            const resultGuests = await UserGuest.deleteMany({ _id: { $in: guestIds } });
            console.log(`🗑️ Usuarios invitados inactivos eliminados: ${resultGuests.deletedCount}`);

            // ========================================================
            // 🧹 TAREA 2: Limpieza en Cascada (Cascade Cleanup)
            // ========================================================
            
            // Remover los IDs de los invitados eliminados de todas las conversaciones.
            const resultConvoUpdate = await Conversation.updateMany(
                { participants: { $in: guestIds } },
                { $pull: { participants: { $in: guestIds } } }
            );
            console.log(`🧼 Conversaciones actualizadas: ${resultConvoUpdate.modifiedCount} (participantes removidos).`);
            
            // ⚠️ Limpieza Opcional: Eliminar conversaciones que quedan vacías o con solo un User
            // Decisión de Arquitectura: Recomendamos dejar la conversación si queda el User REAL, 
            // pero si queda completamente vacía, se puede eliminar.
            const resultConvoDelete = await Conversation.deleteMany({
                 participants: { $size: 0 } 
            });
            console.log(`🗑️ Conversaciones vacías eliminadas: ${resultConvoDelete.deletedCount}`);
            
        } else {
            console.log('✅ No se encontraron invitados inactivos para eliminar.');
        }


        // 3. TAREA C: Limpiar archivos multimedia temporales (pendiente de implementación)

        console.log('✅ Proceso de limpieza finalizado con éxito.');

    } catch (err) {
        console.error('❌ Error crítico en el cron:', err.message);
        exitCode = 1; // Marcar fallo
    } finally {
        // 4. Desconexión
        if (connection) {
            await mongoose.disconnect();
            console.log('🍃 Conexión MongoDB cerrada.');
        }
        process.exit(exitCode);
    }
}

// Ejecutar el proceso
runCleanup();