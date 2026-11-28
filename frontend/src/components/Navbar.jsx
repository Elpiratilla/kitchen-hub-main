import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navegar = useNavigate();
  const activo = ({ isActive }) => (isActive ? 'activo' : undefined);

  async function salir() {
    await logout();
    navegar('/login');
  }

  return (
    <header className="barra">
      <Link to="/" className="logo">Kitchen Hub</Link>
      {user ? (
        <>
          <NavLink to="/" end className={activo}>Equipos</NavLink>
          {user.rol === 'admin' ? (
            <NavLink to="/admin" className={activo}>Panel de gerencia</NavLink>
          ) : (
            <NavLink to="/mis-reservas" className={activo}>Mis reservas</NavLink>
          )}
          <span className="usuario">{user.nombre}</span>
          <button className="btn claro chico" onClick={salir}>Cerrar sesión</button>
        </>
      ) : (
        <>
          <NavLink to="/login" className={activo}>Iniciar sesión</NavLink>
          <NavLink to="/registro" className={activo}>Crear cuenta</NavLink>
        </>
      )}
    </header>
  );
}
