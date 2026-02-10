'use strict';
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const compressor = require('./compressor');
const cloudinary = require('../utils/cloudinary');

// ✅ CORRECCIÓN: Usamos process.cwd() para apuntar a la raíz del proyecto (/app)
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

        // Procesamiento
        if (mime.startsWith('image/')) {
            processedFileName = await compressor.compressImage(rawFilePath, TEMP_OUTPUT_DIR, fileId);
            resourceType = 'image';
        } 
        else if (mime.startsWith('video/')) {
            processedFileName = await compressor.compressVideo(rawFilePath, TEMP_OUTPUT_DIR, fileId);
            resourceType = 'video';
        } 
        else if (mime.startsWith('audio/')) {
            processedFileName = await compressor.compressAudio(rawFilePath, TEMP_OUTPUT_DIR, fileId);
            resourceType = 'video';
        } 
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
                type: mime,
                public_id: cloudRes.public_id
            } 
        });

    } catch (error) {
        console.error("❌ Error en subida Multimedia:", error);
        if (fs.existsSync(rawFilePath)) fs.unlinkSync(rawFilePath);
        res.status(500).json({ error: true, message: 'Error procesando el archivo' });
    }
};