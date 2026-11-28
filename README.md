# Kitchen Hub: inventario y reservas

Aplicación web para gestionar el inventario de las cocinas y permitir que los clientes reserven equipos por hasta 1 hora.

- **Gerencia (admin):** agrega, edita y da de baja ítems; marca cuáles se pueden reservar; ve el historial de movimientos y todas las reservas.
- **Clientes:** se registran, ven los equipos reservables y reservan por 1 hora. Al terminar el tiempo, el equipo se libera solo.

**Tecnologías:** React + Vite (front), Node + Express (API), PostgreSQL, JWT en cookie `httpOnly`, bcrypt.

## Puesta en marcha (macOS)

### 1. Base de datos

```bash
brew install postgresql@16
  brew services start postgresql@16
createdb kitchenhub
```

### 2. Backend

```bash
cd backend
cp .env.example .env     # edita JWT_SECRET, ADMIN_EMAIL y ADMIN_PASSWORD
npm install
npm run init-db          # crea las tablas
npm run seed-admin       # crea la cuenta de gerencia con el correo de .env
npm run dev              # API en http://localhost:4000
```

Para generar un `JWT_SECRET` seguro: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### 3. Frontend (otra terminal)

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

Entra con el correo y la contraseña de gerencia que pusiste en `.env`, o crea una cuenta de cliente desde "Crear cuenta".

## Cómo funciona la reserva de 1 hora

- La tabla `reservas` guarda `inicio` y `fin`. Una restricción de la base de datos impide que `fin` supere `inicio` + 1 hora.
- Otra restricción (`EXCLUDE`) impide dos reservas activas del mismo ítem al mismo tiempo, aunque dos personas pulsen el botón en el mismo instante.
- No hay tareas programadas: un ítem está ocupado solo si existe una reserva vigente que cubra la hora actual. Cuando pasa el `fin`, la consulta deja de encontrarla y el equipo aparece libre.

## Estructura

```
backend/
  sql/schema.sql          tablas y datos iniciales (cocinas, categorías)
  scripts/                initDb.js, seedAdmin.js
  src/app.js              servidor Express
  src/routes/             auth, items, reservas, catalogos
  src/middleware/auth.js  requireAuth y requireAdmin
frontend/
  src/pages/              Acceso, Catalogo, MisReservas, Admin
  src/components/         Navbar, ItemForm
```

## API

| Ruta | Quién |
|---|---|
| `POST /api/auth/registro`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | Público |
| `GET /api/items` | Autenticado (el cliente solo recibe los reservables) |
| `POST /api/items`, `PUT /api/items/:id`, `DELETE /api/items/:id`, `GET /api/items/:id/movimientos` | Solo admin |
| `POST /api/reservas`, `GET /api/reservas`, `PATCH /api/reservas/:id/cancelar` | Autenticado (el cliente solo ve y cancela las suyas) |
| `GET /api/cocinas`, `GET /api/categorias` | Autenticado |

## Producción

`npm run build` en `frontend/`, y luego en `backend/` arranca con `NODE_ENV=production npm start`: Express sirve también el front compilado. Usa HTTPS (la cookie se marca `secure` en producción).

## Ideas para seguir

Pantalla para crear cocinas y categorías, límite de reservas activas por cliente, recuperación de contraseña, pruebas automáticas de la API.
