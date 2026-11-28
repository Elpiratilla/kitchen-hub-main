const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Inicia sesión para continuar' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Tu sesión venció. Inicia sesión de nuevo' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.rol !== 'admin') return res.status(403).json({ error: 'Solo gerencia puede hacer esto' });
  next();
}

module.exports = { requireAuth, requireAdmin };
