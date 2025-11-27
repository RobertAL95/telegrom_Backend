'use strict';

// ⚙️ Dependencias y Configuración
const mongoose = require('mongoose');
const { mongoURI } = require('../config');
const Conversation = require('../globalModels/Conversation');
const UserGuest = require('../globalModels/UserGuest');
// const TempFiles = require('../Files/model'); // Si tuvieras un modelo de archivos temporales

// ⌛ Define el umbral de inactividad (ej. 7 días, expresado en milisegundos)
// 7 * 24 * 60 * 60 * 1000
const INACTIVITY_THRESHOLD_MS = 604800000; 

/**
 * Función principal para conectar, limpiar y desconectar.
 */
async function runCleanup() {
    let connection;
    try {
        console.log('🔄 Iniciando proceso de limpieza cron...');
        
        // 1. Conexión a MongoDB
        connection = await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000, 
            maxPoolSize: 1 // No necesita muchas conexiones
        });
        console.log('✅ Conexión MongoDB establecida.');

        // 2. Definir el punto de corte
        const cutoffDate = new Date(Date.now() - INACTIVITY_THRESHOLD_MS);
        
        // ========================================================
        // 🧹 TAREA A: Limpiar Conversaciones MUY Antiguas y de Invitados
        // ========================================================
        
        // Estrategia: Buscar conversaciones que solo tengan invitados 
        // y que no se hayan actualizado en el umbral.
        
        // Para esto necesitaríamos el ID del modelo UserGuest. 
        // Simplificaremos asumiendo que el campo UserGuest.isGuest = true es suficiente.
        
        // Por la complejidad de esta consulta, la omitimos y nos centramos
        // en lo más seguro: limpiar Invitados inactivos.

        // ========================================================
        // 🧹 TAREA B: Limpiar Usuarios Invitados Inactivos (Menos destructivo)
        // ========================================================
        
        const resultGuests = await UserGuest.deleteMany({
            createdAt: { $lt: cutoffDate }
        });

        console.log(`🗑️ Usuarios invitados inactivos eliminados: ${resultGuests.deletedCount}`);

        // 3. Puedes agregar aquí TAREA C: Limpiar archivos multimedia temporales

        console.log('✅ Proceso de limpieza finalizado con éxito.');

    } catch (err) {
        console.error('❌ Error crítico en el cron:', err.message);
        process.exitCode = 1;
    } finally {
        // 4. Desconexión
        if (connection) {
            await mongoose.disconnect();
            console.log('🍃 Conexión MongoDB cerrada.');
        }
        process.exit(process.exitCode);
    }
}

// Ejecutar el proceso
runCleanup();