'use strict';
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ✅ CORRECCIÓN: Usamos process.cwd() para apuntar a la raíz del proyecto (/app)
const TEMP_DIR = path.join(process.cwd(), 'temp_uploads');

// Si la carpeta no existe, la creamos
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, TEMP_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } 
});

module.exports = upload;