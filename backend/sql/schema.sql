CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol           VARCHAR(20) NOT NULL DEFAULT 'cliente' CHECK (rol IN ('admin', 'cliente')),
  creado_en     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cocinas (
  id        SERIAL PRIMARY KEY,
  nombre    VARCHAR(100) UNIQUE NOT NULL,
  ubicacion VARCHAR(200),
  activa    BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS categorias (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(80) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id              SERIAL PRIMARY KEY,
  nombre          VARCHAR(120) NOT NULL,
  descripcion     TEXT,
  tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('equipo', 'utensilio', 'insumo')),
  categoria_id    INT REFERENCES categorias(id),
  cocina_id       INT REFERENCES cocinas(id),
  cantidad        INT NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  cantidad_minima INT NOT NULL DEFAULT 0 CHECK (cantidad_minima >= 0),
  estado          VARCHAR(20) NOT NULL DEFAULT 'disponible'
                  CHECK (estado IN ('disponible', 'en_uso', 'mantenimiento', 'baja')),
  reservable      BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en       TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movimientos (
  id         SERIAL PRIMARY KEY,
  item_id    INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  usuario_id INT REFERENCES usuarios(id),
  tipo       VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste', 'cambio_estado')),
  cantidad   INT,
  nota       TEXT,
  fecha      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reservas (
  id         SERIAL PRIMARY KEY,
  item_id    INT NOT NULL REFERENCES items(id),
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  inicio     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fin        TIMESTAMPTZ NOT NULL,
  cancelada  BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (fin > inicio),
  CHECK (fin <= inicio + INTERVAL '1 hour'),
  EXCLUDE USING gist (item_id WITH =, tstzrange(inicio, fin) WITH &&) WHERE (NOT cancelada)
);

CREATE INDEX IF NOT EXISTS idx_items_cocina ON items(cocina_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_item ON movimientos(item_id);
CREATE INDEX IF NOT EXISTS idx_reservas_usuario ON reservas(usuario_id);

INSERT INTO cocinas (nombre) VALUES ('Cocina 1'), ('Cocina 2'), ('Cocina 3') ON CONFLICT DO NOTHING;
INSERT INTO categorias (nombre) VALUES
  ('Hornos y cocción'), ('Refrigeración'), ('Preparación'), ('Utensilios'), ('Insumos')
ON CONFLICT DO NOTHING;
