require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/db');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '../sql/schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Tablas creadas.');
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
