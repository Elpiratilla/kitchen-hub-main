import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { estaOcupado, formatoHora, formatoRestante, useAhora } from '../tiempo';

const ESTADO_TEXTO = { disponible: 'Disponible', en_uso: 'En uso', mantenimiento: 'En mantenimiento' };

function Estado({ item, ahora, userId, onReservar, reservando }) {
  if (estaOcupado(item, ahora)) {
    const hasta = new Date(item.ocupado_hasta).getTime();
    const desde = new Date(item.ocupado_desde).getTime();
    const restante = hasta - ahora;
    const pct = Math.max(0, (restante / (hasta - desde)) * 100);
    const mio = item.reservado_por === userId;
    return (
      <div className={`ocupado ${mio ? 'mio' : ''}`}>
        <span className="tiempo">{formatoRestante(restante)}</span>
        <span className="detalle">{mio ? 'Reservado por ti' : 'Reservado'} hasta las {formatoHora(hasta)}</span>
        <div className="barra-tiempo" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
      </div>
    );
  }
  if (item.estado !== 'disponible') return <span className="etiqueta">{ESTADO_TEXTO[item.estado]}</span>;
  if (!item.reservable) return <span className="etiqueta">Solo consulta</span>;
  return (
    <button className="btn chico" disabled={reservando} onClick={() => onReservar(item)}>
      Reservar 1 hora
    </button>
  );
}

export default function Catalogo() {
  const { user } = useAuth();
  const ahora = useAhora();
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);
  const [reservando, setReservando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [soloLibres, setSoloLibres] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setItems(await api('/items'));
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 15000);
    return () => clearInterval(t);
  }, [cargar]);

  async function reservar(item) {
    setMensaje(null);
    setReservando(true);
    try {
      await api('/reservas', { method: 'POST', body: { item_id: item.id, minutos: 60 } });
      setMensaje({ tipo: 'ok', texto: `Reservaste ${item.nombre} por 1 hora. Se libera solo al terminar.` });
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    }
    await cargar();
    setReservando(false);
  }

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return items.filter((i) => {
      if (soloLibres && (estaOcupado(i, ahora) || i.estado !== 'disponible')) return false;
      return !q || [i.nombre, i.cocina, i.categoria].some((t) => t?.toLowerCase().includes(q));
    });
  }, [items, busqueda, soloLibres, ahora]);

  return (
    <main>
      <h1>Equipos de las cocinas</h1>
      <p className="sub">Reserva el equipo que necesitas por hasta 1 hora. Cuando se acaba el tiempo, otra persona puede tomarlo.</p>

      <div className="filtros">
        <input type="search" placeholder="Buscar por equipo, cocina o categoría" value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar equipos" />
        <label className="check">
          <input type="checkbox" checked={soloLibres} onChange={(e) => setSoloLibres(e.target.checked)} />
          Solo disponibles ahora
        </label>
      </div>

      {mensaje && <p className={`mensaje ${mensaje.tipo}`} role="status">{mensaje.texto}</p>}

      {cargando ? (
        <p>Cargando equipos…</p>
      ) : visibles.length === 0 ? (
        <p className="vacio">
          {items.length === 0 ? 'Gerencia todavía no ha publicado equipos para reservar.' : 'Ningún equipo coincide con tu búsqueda.'}
        </p>
      ) : (
        <ul className="lista">
          {visibles.map((i) => (
            <li className="fila" key={i.id}>
              <div className="fila-nombre">
                <strong>{i.nombre}</strong>
                {i.descripcion && <p>{i.descripcion}</p>}
              </div>
              <div className="fila-dato" data-etiqueta="Cocina">{i.cocina || 'Sin asignar'}</div>
              <div className="fila-dato" data-etiqueta="Categoría">{i.categoria || 'Sin categoría'}</div>
              <div className="fila-estado">
                <Estado item={i} ahora={ahora} userId={user.id} onReservar={reservar} reservando={reservando} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
