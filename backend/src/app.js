require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

if (!process.env.JWT_SECRET || !process.env.DATABASE_URL) {
  console.error('Faltan JWT_SECRET o DATABASE_URL en el archivo .env');
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo' },
});
app.use('/api/auth/login', limiteAuth);
app.use('/api/auth/registro', limiteAuth);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/items', require('./routes/items'));
app.use('/api/reservas', require('./routes/reservas'));
app.use('/api', require('./routes/catalogos'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// En producción, Express también sirve el front ya compilado.
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error del servidor. Intenta de nuevo en un momento' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API lista en http://localhost:${port}`));
