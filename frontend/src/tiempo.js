import { useEffect, useState } from 'react';

// Reloj que se actualiza cada segundo: mueve las cuentas regresivas y libera los equipos al terminar la hora.
export function useAhora(ms = 1000) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return ahora;
}

export const formatoRestante = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
export const formatoHora = (d) => new Date(d).toLocaleTimeString('es-SV', { hour: 'numeric', minute: '2-digit' });
export const formatoFecha = (d) =>
  new Date(d).toLocaleString('es-SV', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export const estaOcupado = (item, ahora) => Boolean(item.ocupado_hasta) && new Date(item.ocupado_hasta).getTime() > ahora;
