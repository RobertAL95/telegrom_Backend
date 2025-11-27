// utils/logger.js
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, json, errors, splat } = format;

// ===================================================
// Formato de Logs
// ===================================================

// Formato de desarrollo (legible y colorido)
const devFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${message}${stack ? `\n${stack}` : ''}`;
});

// Formato de producción (JSON estructurado)
const prodFormat = combine(
    errors({ stack: true }), // Asegura que el stack trace se incluya
    timestamp(),
    splat(), // Para interpolación de objetos
    json() // Formato JSON
);

// ===================================================
// Creación del Logger Principal
// ===================================================
const logger = createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    
    // El formato cambia según el entorno
    format: process.env.NODE_ENV === 'production' ? prodFormat : combine(
        colorize({ all: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        devFormat
    ),
    
    transports: [
        // Consola: El transporte principal
        new transports.Console(),
        
        // Archivo de Errores (opcional, para persistencia en entorno de ejecución)
        ...(process.env.NODE_ENV === 'production' ? [
            new transports.File({ filename: 'logs/error.log', level: 'error' })
        ] : [])
    ],
    
    // Captura de excepciones críticas (errores que no deben ocurrir)
    exceptionHandlers: [
        new transports.Console({ format: combine(colorize(), timestamp(), devFormat) }),
        ...(process.env.NODE_ENV === 'production' ? [
            new transports.File({ filename: 'logs/exceptions.log' })
        ] : [])
    ],
    
    // Captura de rechazos de promesas no manejados
    rejectionHandlers: [
        new transports.Console({ format: combine(colorize(), timestamp(), devFormat) }),
    ]
});

// ===================================================
// Sobrescribir Consola Global (Mejor Práctica)
// ===================================================
// Esto asegura que TODO tu código existente (incluidos los console.log/error de librerías)
// use el logger estructurado.
console.log = (message, ...args) => logger.info(message, ...args);
console.warn = (message, ...args) => logger.warn(message, ...args);
console.error = (message, ...args) => logger.error(message, ...args);
console.debug = (message, ...args) => logger.debug(message, ...args); // Agregamos debug

module.exports = logger;