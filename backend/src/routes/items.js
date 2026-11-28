const router = require('express').Router();
const pool = require('../db');
const wrap = require('../wrap');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const TIPOS = ['equipo', 'utensilio', 'insumo'];
const ESTADOS = ['disponible', 'en_uso', 'mantenimiento', 'baja'];

// "ocupado" sale de la reserva vigente: cuando pasa su hora de fin, el ítem queda libre solo.
const SELECT_BASE = `
  SELECT i.*, c.nombre AS cocina, cat.nombre AS categoria,
         (i.cantidad_minima > 0 AND i.cantidad <= i.cantidad_minima) AS stock_bajo,
         r.inicio AS ocupado_desde, r.fin AS ocupado_hasta, r.usuario_id AS reservado_por
  FROM items i
  LEFT JOIN cocinas c ON c.id = i.cocina_id
  LEFT JOIN categorias cat ON cat.id = i.categoria_id
  LEFT JOIN LATERAL (
    SELECT inicio, fin, usuario_id FROM reservas
    WHERE item_id = i.id AND NOT cancelada AND NOW() BETWEEN inicio AND fin
    LIMIT 1
  ) r ON TRUE`;

function validar(b) {
  const nombre = String(b.nombre || '').trim();
  if (nombre.length < 2 || nombre.length > 120) return { error: 'El nombre debe tener entre 2 y 120 caracteres' };
  if (!TIPOS.includes(b.tipo)) return { error: 'Elige un tipo válido' };
  const estado = b.estado || 'disponible';
  if (!ESTADOS.includes(estado)) return { error: 'Elige un estado válido' };
  const cantidad = Number(b.cantidad);
  const minima = Number(b.cantidad_minima ?? 0);
  if (!Number.isInteger(cantidad) || cantidad < 0) return { error: 'La cantidad debe ser un número entero de 0 o más' };
  if (!Number.isInteger(minima) || minima < 0) return { error: 'El stock mínimo debe ser un número entero de 0 o más' };
  const idONulo = (v) => (v === '' || v == null ? null : Number(v));
  return {
    datos: {
      nombre,
      descripcion: String(b.descripcion || '').trim() || null,
      tipo: b.tipo,
      categoria_id: idONulo(b.categoria_id),
      cocina_id: idONulo(b.cocina_id),
      cantidad,
      cantidad_minima: minima,
      estado,
      reservable: Boolean(b.reservable),
    },
  };
}

function manejarFK(e, res) {
  if (e.code === '23503') { res.status(400).json({ error: 'La cocina o la categoría elegida no existe' }); return true; }
  return false;
}

// Admin ve todo; el cliente solo ve lo que gerencia marcó como reservable.
router.get('/', requireAuth, wrap(async (req, res) => {
  const esAdmin = req.user.rol === 'admin';
  const where = esAdmin
    ? (req.query.baja === '1' ? '' : "WHERE i.estado <> 'baja'")
    : "WHERE i.reservable AND i.estado <> 'baja'";
  const { rows } = await pool.query(`${SELECT_BASE} ${where} ORDER BY i.nombre`);
  res.json(rows);
}));

router.post('/', requireAuth, requireAdmin, wrap(async (req, res) => {
  const { error, datos: d } = validar(req.body);
  if (error) return res.status(400).json({ error });
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    const { rows } = await cli.query(
      `INSERT INTO items (nombre, descripcion, tipo, categoria_id, cocina_id, cantidad, cantidad_minima, estado, reservable)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [d.nombre, d.descripcion, d.tipo, d.categoria_id, d.cocina_id, d.cantidad, d.cantidad_minima, d.estado, d.reservable]
    );
    await cli.query(
      `INSERT INTO movimientos (item_id, usuario_id, tipo, cantidad, nota) VALUES ($1,$2,'entrada',$3,'Alta del ítem')`,
      [rows[0].id, req.user.id, d.cantidad]
    );
    await cli.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (e) {
    await cli.query('ROLLBACK');
    if (manejarFK(e, res)) return;
    throw e;
  } finally {
    cli.release();
  }
}));

router.put('/:id', requireAuth, requireAdmin, wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Id no válido' });
  const { error, datos: d } = validar(req.body);
  if (error) return res.status(400).json({ error });
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    const previo = (await cli.query('SELECT * FROM items WHERE id = $1 FOR UPDATE', [id])).rows[0];
    if (!previo) { await cli.query('ROLLBACK'); return res.status(404).json({ error: 'No encontramos ese ítem' }); }
    const { rows } = await cli.query(
      `UPDATE items SET nombre=$1, descripcion=$2, tipo=$3, categoria_id=$4, cocina_id=$5, cantidad=$6,
              cantidad_minima=$7, estado=$8, reservable=$9, actualizado_en=NOW()
       WHERE id=$10 RETURNING *`,
      [d.nombre, d.descripcion, d.tipo, d.categoria_id, d.cocina_id, d.cantidad, d.cantidad_minima, d.estado, d.reservable, id]
    );
    const mov = `INSERT INTO movimientos (item_id, usuario_id, tipo, cantidad, nota) VALUES ($1,$2,$3,$4,$5)`;
    if (previo.cantidad !== d.cantidad) {
      await cli.query(mov, [id, req.user.id, 'ajuste', d.cantidad - previo.cantidad, `De ${previo.cantidad} a ${d.cantidad}`]);
    }
    if (previo.estado !== d.estado) {
      await cli.query(mov, [id, req.user.id, 'cambio_estado', null, `De ${previo.estado} a ${d.estado}`]);
    }
    await cli.query('COMMIT');
    res.json(rows[0]);
  } catch (e) {
    await cli.query('ROLLBACK');
    if (manejarFK(e, res)) return;
    throw e;
  } finally {
    cli.release();
  }
}));

// "Eliminar" = dar de baja: se conserva el historial y se cancelan las reservas vigentes.
router.delete('/:id', requireAuth, requireAdmin, wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Id no válido' });
  const cli = await pool.connect();
  try {
    await cli.query('BEGIN');
    const { rowCount } = await cli.query(
      `UPDATE items SET estado='baja', reservable=FALSE, actualizado_en=NOW() WHERE id=$1 AND estado <> 'baja'`, [id]
    );
    if (!rowCount) { await cli.query('ROLLBACK'); return res.status(404).json({ error: 'No encontramos ese ítem' }); }
    await cli.query('UPDATE reservas SET cancelada=TRUE WHERE item_id=$1 AND NOT cancelada AND fin > NOW()', [id]);
    await cli.query(
      `INSERT INTO movimientos (item_id, usuario_id, tipo, nota) VALUES ($1,$2,'cambio_estado','Dado de baja')`,
      [id, req.user.id]
    );
    await cli.query('COMMIT');
    res.status(204).end();
  } catch (e) {
    await cli.query('ROLLBACK');
    throw e;
  } finally {
    cli.release();
  }
}));

router.get('/:id/movimientos', requireAuth, requireAdmin, wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Id no válido' });
  const { rows } = await pool.query(
    `SELECT m.id, m.tipo, m.cantidad, m.nota, m.fecha, u.nombre AS usuario
     FROM movimientos m LEFT JOIN usuarios u ON u.id = m.usuario_id
     WHERE m.item_id = $1 ORDER BY m.fecha DESC, m.id DESC LIMIT 100`, [id]
  );
  res.json(rows);
}));

module.exports = router;
