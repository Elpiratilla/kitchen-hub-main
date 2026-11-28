const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const wrap = require('../wrap');

const COOKIE = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 3600 * 1000,
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emitirSesion(res, u) {
  const token = jwt.sign({ id: u.id, rol: u.rol, nombre: u.nombre }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, COOKIE);
  return { id: u.id, nombre: u.nombre, rol: u.rol };
}

// Registro público: SIEMPRE crea clientes. El rol nunca se lee del body.
router.post('/registro', wrap(async (req, res) => {
  const nombre = String(req.body.nombre || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (nombre.length < 2 || nombre.length > 100) return res.status(400).json({ error: 'Escribe tu nombre (2 a 100 caracteres)' });
  if (!EMAIL_RE.test(email) || email.length > 150) return res.status(400).json({ error: 'Escribe un correo válido' });
  if (password.length < 8 || password.length > 72) return res.status(400).json({ error: 'La contraseña debe tener entre 8 y 72 caracteres' });

  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, 'cliente') RETURNING id, nombre, rol`,
      [nombre, email, hash]
    );
    res.status(201).json({ user: emitirSesion(res, rows[0]) });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Ese correo ya está registrado' });
    throw e;
  }
}));

router.post('/login', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
  const u = rows[0];
  // Mensaje genérico: no revela si falló el correo o la contraseña.
  if (!u || !(await bcrypt.compare(password, u.password_hash))) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  }
  res.json({ user: emitirSesion(res, u) });
}));

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.status(204).end();
});

router.get('/me', (req, res) => {
  try {
    const p = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    res.json({ user: { id: p.id, nombre: p.nombre, rol: p.rol } });
  } catch {
    res.json({ user: null });
  }
});

module.exports = router;
