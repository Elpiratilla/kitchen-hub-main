const router = require('express').Router();
const pool = require('../db');
const wrap = require('../wrap');
const { requireAuth } = require('../middleware/auth');

// Reservar = tomar el equipo desde ahora, máximo 1 hora. Las validaciones viven aquí y en la base de datos.
router.post('/', requireAuth, wrap(async (req, res) => {
  const itemId = Number(req.body.item_id);
  const minutos = Number(req.body.minutos ?? 60);
  if (!Number.isInteger(itemId)) return res.status(400).json({ error: 'Elige un equipo para reservar' });
  if (!Number.isInteger(minutos) || minutos < 5 || minutos > 60) {
    return res.status(400).json({ error: 'Una reserva dura entre 5 y 60 minutos' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO reservas (item_id, usuario_id, inicio, fin)
       SELECT i.id, $2, NOW(), NOW() + make_interval(mins => $3::int)
       FROM items i WHERE i.id = $1 AND i.reservable AND i.estado = 'disponible'
       RETURNING *`,
      [itemId, req.user.id, minutos]
    );
    if (!rows.length) return res.status(404).json({ error: 'Este equipo no está disponible para reservar' });
    res.status(201).json(rows[0]);
  } catch (e) {
    // 23P01 = la restricción EXCLUDE: alguien ya lo tiene reservado en ese momento.
    if (e.code === '23P01') return res.status(409).json({ error: 'Alguien más acaba de reservar este equipo' });
    throw e;
  }
}));

router.get('/', requireAuth, wrap(async (req, res) => {
  const esAdmin = req.user.rol === 'admin';
  const { rows } = await pool.query(
    `SELECT r.id, r.item_id, r.usuario_id, r.inicio, r.fin, r.cancelada,
            i.nombre AS item, u.nombre AS usuario, u.email
     FROM reservas r
     JOIN items i ON i.id = r.item_id
     JOIN usuarios u ON u.id = r.usuario_id
     ${esAdmin ? '' : 'WHERE r.usuario_id = $1'}
     ORDER BY r.inicio DESC LIMIT 100`,
    esAdmin ? [] : [req.user.id]
  );
  res.json(rows);
}));

router.patch('/:id/cancelar', requireAuth, wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Id no válido' });
  const esAdmin = req.user.rol === 'admin';
  const { rowCount } = await pool.query(
    `UPDATE reservas SET cancelada = TRUE
     WHERE id = $1 AND NOT cancelada AND fin > NOW() AND (usuario_id = $2 OR $3::boolean)`,
    [id, req.user.id, esAdmin]
  );
  if (!rowCount) return res.status(404).json({ error: 'No encontramos una reserva activa con ese id' });
  res.status(204).end();
}));

module.exports = router;
