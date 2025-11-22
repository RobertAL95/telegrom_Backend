'use strict';

// ==================================================
// 🧩 Respuesta estándar de éxito
// ==================================================
exports.success = (req, res, body = null, status = 200) => {
  console.log(`✅ [${req.method}] ${req.originalUrl} → ${status}`);
  res.status(status).json(body);
};


// ==================================================
// 🧩 Respuesta estándar de error
// ==================================================
exports.error = (req, res, message = 'Internal Server Error', status = 500) => {
  console.error(`❌ [${req.method}] ${req.originalUrl} → ${message}`);
  res.status(status).json({
    ok: false,
    status,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
    error: typeof message === 'string' ? message : message?.message || 'Error desconocido',
  });
};
