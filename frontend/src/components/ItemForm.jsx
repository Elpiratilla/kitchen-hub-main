import { useState } from 'react';
import { api } from '../api';

export default function ItemForm({ item, cocinas, categorias, onGuardado, onCancelar }) {
  const [v, setV] = useState({
    nombre: item?.nombre ?? '',
    descripcion: item?.descripcion ?? '',
    tipo: item?.tipo ?? 'equipo',
    categoria_id: item?.categoria_id ?? '',
    cocina_id: item?.cocina_id ?? '',
    cantidad: item?.cantidad ?? 1,
    cantidad_minima: item?.cantidad_minima ?? 0,
    estado: item?.estado ?? 'disponible',
    reservable: item?.reservable ?? false,
  });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo) => (e) =>
    setV({ ...v, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      if (item) await api(`/items/${item.id}`, { method: 'PUT', body: v });
      else await api('/items', { method: 'POST', body: v });
      onGuardado(item ? 'Cambios guardados' : 'Ítem agregado al inventario');
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <form className="formulario panel" onSubmit={enviar}>
      <h2>{item ? `Editar ${item.nombre}` : 'Nuevo ítem'}</h2>
      <div className="rejilla">
        <label>Nombre
          <input value={v.nombre} onChange={cambiar('nombre')} required minLength={2} maxLength={120} />
        </label>
        <label>Tipo
          <select value={v.tipo} onChange={cambiar('tipo')}>
            <option value="equipo">Equipo</option>
            <option value="utensilio">Utensilio</option>
            <option value="insumo">Insumo</option>
          </select>
        </label>
        <label>Cocina
          <select value={v.cocina_id} onChange={cambiar('cocina_id')}>
            <option value="">Sin asignar</option>
            {cocinas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </label>
        <label>Categoría
          <select value={v.categoria_id} onChange={cambiar('categoria_id')}>
            <option value="">Sin categoría</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </label>
        <label>Cantidad
          <input type="number" min="0" step="1" value={v.cantidad} onChange={cambiar('cantidad')} required />
        </label>
        <label>Stock mínimo
          <input type="number" min="0" step="1" value={v.cantidad_minima} onChange={cambiar('cantidad_minima')} />
          <span className="ayuda">Si la cantidad baja a este número, verás una alerta. Usa 0 para no recibir alerta.</span>
        </label>
        <label>Estado
          <select value={v.estado} onChange={cambiar('estado')}>
            <option value="disponible">Disponible</option>
            <option value="en_uso">En uso</option>
            <option value="mantenimiento">En mantenimiento</option>
            {item?.estado === 'baja' && <option value="baja">Dado de baja</option>}
          </select>
        </label>
      </div>
      <label>Descripción
        <textarea rows="2" value={v.descripcion} onChange={cambiar('descripcion')} />
      </label>
      <label className="check">
        <input type="checkbox" checked={v.reservable} onChange={cambiar('reservable')} />
        Los clientes pueden reservarlo por hasta 1 hora (se reserva como una sola unidad)
      </label>
      {error && <p className="mensaje error" role="alert">{error}</p>}
      <div className="acciones">
        <button className="btn" disabled={enviando}>{item ? 'Guardar cambios' : 'Agregar ítem'}</button>
        <button type="button" className="btn claro" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}
