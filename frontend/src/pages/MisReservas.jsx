import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { formatoFecha, formatoHora, formatoRestante, useAhora } from '../tiempo';

export default function MisReservas() {
  const ahora = useAhora();
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      setReservas(await api('/reservas'));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  async function cancelar(r) {
    setError('');
    try {
      await api(`/reservas/${r.id}/cancelar`, { method: 'PATCH' });
      await cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  const activa = (r) => !r.cancelada && new Date(r.fin).getTime() > ahora;

  return (
    <main>
      <h1>Mis reservas</h1>
      <p className="sub">Aquí ves lo que tienes reservado ahora y tu historial reciente.</p>
      {error && <p className="mensaje error" role="alert">{error}</p>}
      {cargando ? (
        <p>Cargando…</p>
      ) : reservas.length === 0 ? (
        <p className="vacio">Aún no has reservado nada. Ve a Equipos y elige el que necesites.</p>
      ) : (
        <ul className="lista">
          {reservas.map((r) => (
            <li className="fila reserva" key={r.id}>
              <div className="fila-nombre"><strong>{r.item}</strong></div>
              <div className="fila-dato" data-etiqueta="Horario">{formatoFecha(r.inicio)} a {formatoHora(r.fin)}</div>
              <div className="fila-estado">
                {r.cancelada ? <span className="etiqueta">Cancelada</span>
                  : activa(r) ? (
                    <div className="ocupado mio">
                      <span className="tiempo">{formatoRestante(new Date(r.fin).getTime() - ahora)}</span>
                      <button className="btn claro chico" onClick={() => cancelar(r)}>Cancelar reserva</button>
                    </div>
                  ) : <span className="etiqueta">Terminada</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
