import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setCargando(false));
  }, []);

  const login = async (email, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { email, password } });
    setUser(d.user);
    return d.user;
  };
  const registro = async (nombre, email, password) => {
    const d = await api('/auth/registro', { method: 'POST', body: { nombre, email, password } });
    setUser(d.user);
    return d.user;
  };
  const logout = async () => {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return <Ctx.Provider value={{ user, cargando, login, registro, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
