const jwt = require('jsonwebtoken');
const config = require('../config');

exports.sign = (data) => jwt.sign(data, config.jwtSecret, { expiresIn: '15d' });
exports.verify = (token) => jwt.verify(token, config.jwtSecret);