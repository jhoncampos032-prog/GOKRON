const jwt = require('jsonwebtoken');

// Verifica el token JWT y adjunta el usuario (con su empresaId y rol) a la request.
// Esto es lo que garantiza el aislamiento multi-empresa: cada request
// solo puede ver/tocar datos de req.user.empresaId.
function autenticar(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { userId, empresaId, rol }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Restringe una ruta a ciertos roles. Ej: requireRol('ADMIN', 'SUPERVISOR')
function requireRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }
    next();
  };
}

module.exports = { autenticar, requireRol };
