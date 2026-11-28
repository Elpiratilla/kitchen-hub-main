require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/db');

(async () => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error('Define ADMIN_EMAIL y ADMIN_PASSWORD en .env');
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const { rowCount } = await pool.query(
    `INSERT INTO usuarios (nombre, email, password_hash, rol)
     VALUES ('Gerencia', $1, $2, 'admin')
     ON CONFLICT (email) DO NOTHING`,
    [ADMIN_EMAIL.toLowerCase(), hash]
  );
  console.log(rowCount ? 'Admin creado.' : 'Ese admin ya existía; no se cambió nada.');
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
