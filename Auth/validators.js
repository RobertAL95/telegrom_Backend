const Joi = require('joi');

// Esquema para Validar Registro
const registerSchema = Joi.object({
    name: Joi.string().min(3).max(50).required().messages({
        'string.base': 'El nombre debe ser texto',
        'string.min': 'El nombre debe tener al menos 3 caracteres',
        'any.required': 'El nombre es obligatorio'
    }),
    email: Joi.string().email().required().trim().lowercase().messages({
        'string.email': 'Introduce un email válido',
        'any.required': 'El email es obligatorio'
    }),
    // Contraseña: Min 6 caracteres, al menos 1 letra y 1 número
    password: Joi.string().min(6).pattern(new RegExp('^[a-zA-Z0-9]{3,30}$')).required().messages({
        'string.min': 'La contraseña debe tener al menos 6 caracteres',
        'string.pattern.base': 'La contraseña debe contener letras y números'
    })
});

// Esquema para Validar Login
const loginSchema = Joi.object({
    email: Joi.string().email().required().trim().lowercase(),
    password: Joi.string().required()
});

module.exports = {
    registerSchema,
    loginSchema
};