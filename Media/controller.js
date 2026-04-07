'use strict';
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const compressor = require('./compressor');
const cloudinary = require('../utils/cloudinary');

// ✅ Usamos process.cwd()
const TEMP_OUTPUT_DIR = path.join(process.cwd(), 'temp_processed');

if (!fs.existsSync(TEMP_OUTPUT_DIR)) fs.mkdirSync(TEMP_OUTPUT_DIR, { recursive: true });

exports.uploadMedia = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: true, message: 'No se ha subido ningún archivo' });
    }
    
    const rawFilePath = req.file.path;
    const fileId = uuidv4(); 
    let processedFileName = '';

    try {
        const mime = req.file.mimetype;
        let resourceType = 'auto';

        // ======================================================
        // 1. IMÁGENES (Comprimir)
        // ======================================================
        if (mime.startsWith('image/')) {
            processedFileName = await compressor.compressImage(rawFilePath, TEMP_OUTPUT_DIR, fileId);
            resourceType = 'image';
        } 
        // ======================================================
        // 2. VIDEOS (Comprimir)
        // ======================================================
        else if (mime.startsWith('video/')) {
            processedFileName = await compressor.compressVideo(rawFilePath, TEMP_OUTPUT_DIR, fileId);
            resourceType = 'video';
        } 
        // ======================================================
        // 3. AUDIOS Y ARCHIVOS ENCRIPTADOS (Paso Directo)
        // ======================================================
        // Cloudinary requiere 'resource_type: video' para archivos de audio (.mp3, .webm, .wav)
        // 'application/octet-stream' es el tipo MIME de los archivos encriptados
        else if (mime.startsWith('audio/') || mime === 'application/octet-stream') {
            // NO comprimimos aquí. Copiamos el archivo tal cual para no romper la encriptación
            // ni recomprimir lo que ya viene en Opus.
            processedFileName = `${fileId}${path.extname(req.file.originalname)}`;
            fs.copyFileSync(rawFilePath, path.join(TEMP_OUTPUT_DIR, processedFileName));
            
            resourceType = 'video'; // ⚠️ IMPORTANTE: Cloudinary trata el audio como 'video'
        } 
        // ======================================================
        // 4. OTROS (Raw)
        // ======================================================
        else {
            processedFileName = `${fileId}${path.extname(req.file.originalname)}`;
            fs.copyFileSync(rawFilePath, path.join(TEMP_OUTPUT_DIR, processedFileName));
            resourceType = 'raw';
        }

        const processedPath = path.join(TEMP_OUTPUT_DIR, processedFileName);

        // Subida a Cloudinary
        const cloudRes = await cloudinary.uploader.upload(processedPath, {
            resource_type: resourceType,
            public_id: `chat_app/${fileId}`,
            overwrite: true
        });

        // Limpieza
        if (fs.existsSync(rawFilePath)) fs.unlinkSync(rawFilePath);
        if (fs.existsSync(processedPath)) fs.unlinkSync(processedPath);

        res.status(201).json({ 
            error: false, 
            body: { 
                url: cloudRes.secure_url, 
                // Devolvemos el mime original para que el frontend sepa si es audio/video/img
                type: mime, 
                public_id: cloudRes.public_id
            } 
        });

    } catch (error) {
        console.error("❌ Error en subida Multimedia:", error);
        // Intentar limpiar residuos
        if (fs.existsSync(rawFilePath)) fs.unlinkSync(rawFilePath);
        res.status(500).json({ error: true, message: 'Error procesando el archivo' });
    }
};