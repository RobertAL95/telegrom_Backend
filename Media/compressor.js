const ffmpeg = require('fluent-ffmpeg');
const sharp = require('sharp');
const path = require('path');

// 🖼️ ALGORITMO DE IMÁGENES
// Convierte a WebP, redimensiona si es gigante y baja calidad al 80%
exports.compressImage = async (filePath, outputDir, fileName) => {
    const outputName = `${fileName}.webp`;
    const outputPath = path.join(outputDir, outputName);

    await sharp(filePath)
        .resize({ width: 1280, withoutEnlargement: true }) // Máximo 1280px de ancho
        .webp({ quality: 80 }) // Formato WebP al 80% de calidad
        .toFile(outputPath);

    return outputName; // Retornamos el nuevo nombre del archivo
};

// 🎥 ALGORITMO DE VIDEO
// Escala a 720p, 24fps, comprime con H.264 y audio AAC
exports.compressVideo = (filePath, outputDir, fileName) => {
    return new Promise((resolve, reject) => {
        const outputName = `${fileName}.mp4`; // Usamos MP4 compatible
        const outputPath = path.join(outputDir, outputName);

        ffmpeg(filePath)
            .videoCodec('libx264')   // Codec estándar
            .size('?x720')           // Escalar alto a 720p (ancho automático)
            .fps(24)                 // Bajar a 24 cuadros por segundo (estilo cine/ahorro)
            .outputOptions([
                '-crf 28',           // Constant Rate Factor (28 es buena compresión/calidad)
                '-preset veryfast',  // Compresión rápida
                '-movflags +faststart' // Permite streaming web inmediato
            ])
            .audioCodec('aac')
            .audioBitrate('64k')     // Audio ligero (64kbps es suficiente para voz)
            .audioChannels(1)        // Mono (ahorra espacio)
            .on('end', () => resolve(outputName))
            .on('error', (err) => reject(err))
            .save(outputPath);
    });
};

// 🎙️ ALGORITMO DE AUDIO
// Convierte a MP3 ligero, mono canal
exports.compressAudio = (filePath, outputDir, fileName) => {
    return new Promise((resolve, reject) => {
        const outputName = `${fileName}.mp3`;
        const outputPath = path.join(outputDir, outputName);

        ffmpeg(filePath)
            .audioCodec('libmp3lame')
            .audioBitrate('64k') // Calidad voz
            .audioChannels(1)    // Mono
            .on('end', () => resolve(outputName))
            .on('error', (err) => reject(err))
            .save(outputPath);
    });
};