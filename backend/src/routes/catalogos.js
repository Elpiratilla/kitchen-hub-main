const router = require('express').Router();
const pool = require('../db');
const wrap = require('../wrap');
const { requireAuth } = require('../middleware/auth');

router.get('/cocinas', requireAuth, wrap(async (req, res) => {
  const { rows } = await pool.query('SELECT id, nombre FROM cocinas WHERE activa ORDER BY nombre');
  res.json(rows);
}));

router.get('/categorias', requireAuth, wrap(async (req, res) => {
  const { rows } = await pool.query('SELECT id, nombre FROM categorias ORDER BY nombre');
  res.json(rows);
}));

module.exports = router;
