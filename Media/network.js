'use strict';
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const upload = require('./uploadMiddleware');

// Puedes agregar 'auth' aquí si quieres que solo usuarios logueados suban cosas
// const auth = require('../middleware'); 

// POST /media/upload
router.post('/upload', upload.single('file'), controller.uploadMedia);

module.exports = router;