'use strict';
const AWS = require('aws-sdk');
const fs = require('fs');
const config = require('../config'); 

// ===================================================
// ⚙️ Inicialización de S3/Spaces
// ===================================================

// Es crucial que config.js contenga todas las variables de entorno S3.
const s3 = new AWS.S3({
    endpoint: config.s3Endpoint, // Ej: nyc3.digitaloceanspaces.com
    accessKeyId: config.s3AccessKeyId,
    secretAccessKey: config.s3SecretAccessKey,
    region: config.s3Region,
    s3ForcePathStyle: true, // Requerido por algunos proveedores compatibles con S3
});

const BUCKET_NAME = config.s3BucketName;

/**
 * 🟢 Subir un archivo al bucket (usado por el chat o la lógica de upload)
 * @param {string} filePath - Ruta local del archivo temporal.
 * @param {string} key - Nombre de archivo deseado en S3 (ej: chatId/messageID/filename.jpg).
 */
exports.uploadFile = (filePath, key) => {
    return new Promise((resolve, reject) => {
        const fileStream = fs.createReadStream(filePath);
        
        const uploadParams = {
            Bucket: BUCKET_NAME,
            Key: key,
            Body: fileStream,
            ACL: 'private', // 🔥 CRÍTICO: No es público, solo accesible vía este Proxy
        };

        s3.upload(uploadParams, (err, data) => {
            // fs.unlinkSync(filePath); // Descomentar para limpiar temporales después de la subida
            if (err) return reject(err);
            resolve(data.Key); 
        });
    });
};

/**
 * 🟢 Obtener un Stream del archivo para servirlo
 * @param {string} key - La clave del archivo en el bucket.
 */
exports.getReadStream = (key) => {
    const downloadParams = {
        Bucket: BUCKET_NAME,
        Key: key,
    };
    // Devuelve el Stream de lectura que se canalizará a la respuesta HTTP
    return s3.getObject(downloadParams).createReadStream();
};