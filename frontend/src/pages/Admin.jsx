import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import ItemForm from '../components/ItemForm';
import { estaOcupado, formatoFecha, formatoRestante, useAhora } from '../tiempo';

const TIPO = { equipo: 'Equipo', utensilio: 'Utensilio', insumo: 'Insumo' };
const ESTADO = { disponible: 'Disponible', en_uso: 'En uso', mantenimiento: 'En mantenimiento', baja: 'Dado de baja' };
const MOV = { entrada: 'Alta', salida: 'Salida', ajuste: 'Ajuste de cantidad', cambio_estado: 'Cambio de estado' };

export default function Admin() {
  const ahora = useAhora();
  const [pestana, setPestana] = useState('inventario');
  const [items, setItems] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [cocinas, setCocinas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [mostrarBaja, setMostrarBaja] = useState(false);
  const [form, setForm] = useState(null); // null | 'nuevo' | item a editar
  const [historial, setHistorial] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const avisar = (tipo, texto) => setMensaje({ tipo, texto });

  const cargarItems = useCallback(
    () => api(`/items${mostrarBaja ? '?baja=1' : ''}`).then(setItems).catch((e) => avisar('error', e.message)),
    [mostrarBaja]
  );
  const cargarReservas = useCallback(
    () => api('/reservas').then(setReservas).catch((e) => avisar('error', e.message)),
    []
  );

  useEffect(() => {
    api('/cocinas').then(setCocinas).catch(() => {});
    api('/categorias').then(setCategorias).catch(() => {});
  }, []);
  useEffect(() => {
    cargarItems();
    const t = setInterval(cargarItems, 15000);
    return () => clearInterval(t);
  }, [cargarItems]);
  useEffect(() => { if (pestana === 'reservas') cargarReservas(); }, [pestana, cargarReservas]);

  async function darDeBaja(item) {
    if (!window.confirm(`¿Dar de baja "${item.nombre}"? Se cancelarán sus reservas activas y se conserva su historial.`)) return;
    try {
      await api(`/items/${item.id}`, { method: 'DELETE' });
      avisar('ok', `${item.nombre} fue dado de baja`);
      cargarItems();
    } catch (e) { avisar('error', e.message); }
  }

  async function verHistorial(item) {
    try {
      setHistorial({ item, movs: await api(`/items/${item.id}/movimientos`) });
    } catch (e) { avisar('error', e.message); }
  }

  async function cancelarReserva(r) {
    try {
      await api(`/reservas/${r.id}/cancelar`, { method: 'PATCH' });
      avisar('ok', `Se canceló la reserva de ${r.item}`);
      cargarReservas();
      cargarItems();
    } catch (e) { avisar('error', e.message); }
  }

  const stockBajo = items.filter((i) => i.stock_bajo && i.estado !== 'baja').length;

  return (
    <main className="ancho">
      <h1>Panel de gerencia</h1>
      <div className="pestanas" role="tablist">
        <button role="tab" aria-selected={pestana === 'inventario'} onClick={() => setPestana('inventario')}>Inventario</button>
        <button role="tab" aria-selected={pestana === 'reservas'} onClick={() => setPestana('reservas')}>Reservas</button>
      </div>

      {mensaje && <p className={`mensaje ${mensaje.tipo}`} role="status">{mensaje.texto}</p>}

      {pestana === 'inventario' && (
        <>
          <div className="barra-acciones">
            <button className="btn" onClick={() => setForm('nuevo')}>Agregar ítem</button>
            <label className="check">
              <input type="checkbox" checked={mostrarBaja} onChange={(e) => setMostrarBaja(e.target.checked)} />
              Mostrar ítems dados de baja
            </label>
            {stockBajo > 0 && <span className="alerta">{stockBajo} {stockBajo === 1 ? 'ítem con stock bajo' : 'ítems con stock bajo'}</span>}
          </div>

          {form && (
            <ItemForm key={form === 'nuevo' ? 'nuevo' : form.id} item={form === 'nuevo' ? null : form}
              cocinas={cocinas} categorias={categorias}
              onGuardado={(t) => { setForm(null); avisar('ok', t); cargarItems(); }}
              onCancelar={() => setForm(null)} />
          )}

          <div className="tabla-scroll">
            <table>
              <thead>
                <tr><th>Ítem</th><th>Cocina</th><th>Cantidad</th><th>Estado</th><th>Reservable</th><th><span className="solo-lector">Acciones</span></th></tr>
              </thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan="6" className="vacio">Aún no hay ítems. Agrega el primero con el botón de arriba.</td></tr>}
                {items.map((i) => (
                  <tr key={i.id} className={i.estado === 'baja' ? 'apagada' : undefined}>
                    <td><strong>{i.nombre}</strong><br /><span className="ayuda">{TIPO[i.tipo]}{i.categoria ? `, ${i.categoria}` : ''}</span></td>
                    <td>{i.cocina || 'Sin asignar'}</td>
                    <td>
                      {i.cantidad}
                      {i.stock_bajo && i.estado !== 'baja' && <span className="alerta chica"> Stock bajo</span>}
                    </td>
                    <td>
                      {estaOcupado(i, ahora)
                        ? <>Reservado, quedan <strong>{formatoRestante(new Date(i.ocupado_hasta).getTime() - ahora)}</strong></>
                        : ESTADO[i.estado]}
                    </td>
                    <td>{i.reservable ? 'Sí' : 'No'}</td>
                    <td className="acciones-fila">
                      {i.estado !== 'baja' && <button className="btn claro chico" onClick={() => setForm(i)}>Editar</button>}
                      <button className="btn claro chico" onClick={() => verHistorial(i)}>Historial</button>
                      {i.estado !== 'baja' && <button className="btn peligro chico" onClick={() => darDeBaja(i)}>Dar de baja</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {historial && (
            <section className="panel">
              <div className="encabezado-panel">
                <h2>Historial de {historial.item.nombre}</h2>
                <button className="btn claro chico" onClick={() => setHistorial(null)}>Cerrar historial</button>
              </div>
              {historial.movs.length === 0 ? <p className="vacio">Sin movimientos todavía.</p> : (
                <ul className="historial">
                  {historial.movs.map((m) => (
                    <li key={m.id}>
                      <strong>{MOV[m.tipo]}</strong>
                      {m.nota ? `: ${m.nota}` : ''}
                      <span className="ayuda"> {formatoFecha(m.fecha)}, {m.usuario || 'sistema'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      {pestana === 'reservas' && (
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr><th>Equipo</th><th>Cliente</th><th>Desde</th><th>Hasta</th><th>Estado</th><th><span className="solo-lector">Acciones</span></th></tr>
            </thead>
            <tbody>
              {reservas.length === 0 && <tr><td colSpan="6" className="vacio">Todavía no hay reservas.</td></tr>}
              {reservas.map((r) => {
                const activa = !r.cancelada && new Date(r.fin).getTime() > ahora;
                return (
                  <tr key={r.id}>
                    <td><strong>{r.item}</strong></td>
                    <td>{r.usuario}<br /><span className="ayuda">{r.email}</span></td>
                    <td>{formatoFecha(r.inicio)}</td>
                    <td>{formatoFecha(r.fin)}</td>
                    <td>{r.cancelada ? 'Cancelada' : activa ? <>Activa, quedan <strong>{formatoRestante(new Date(r.fin).getTime() - ahora)}</strong></> : 'Terminada'}</td>
                    <td>{activa && <button className="btn peligro chico" onClick={() => cancelarReserva(r)}>Cancelar</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
