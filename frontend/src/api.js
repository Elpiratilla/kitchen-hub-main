export async function api(ruta, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${ruta}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  const datos = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(datos?.error || 'Algo salió mal. Intenta de nuevo.');
  return datos;
}
