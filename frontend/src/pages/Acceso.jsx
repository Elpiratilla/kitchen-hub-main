import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Acceso({ modo }) {
  const esRegistro = modo === 'registro';
  const { user, login, registro } = useAuth();
  const navegar = useNavigate();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (user) return <Navigate to={user.rol === 'admin' ? '/admin' : '/'} replace />;

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const u = esRegistro ? await registro(nombre, email, password) : await login(email, password);
      navegar(u.rol === 'admin' ? '/admin' : '/', { replace: true });
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <main className="acceso">
      <h1>{esRegistro ? 'Crea tu cuenta' : 'Inicia sesión'}</h1>
      <p className="sub">
        {esRegistro
          ? 'Con una cuenta puedes ver los equipos de las cocinas y reservarlos por hasta 1 hora.'
          : 'Entra para ver los equipos disponibles y reservar el que necesites.'}
      </p>
      <form onSubmit={enviar} className="formulario">
        {esRegistro && (
          <label>Nombre
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" required minLength={2} maxLength={100} />
          </label>
        )}
        <label>Correo
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label>Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete={esRegistro ? 'new-password' : 'current-password'} required minLength={esRegistro ? 8 : 1} />
          {esRegistro && <span className="ayuda">Mínimo 8 caracteres.</span>}
        </label>
        {error && <p className="mensaje error" role="alert">{error}</p>}
        <button className="btn" disabled={enviando}>{esRegistro ? 'Crear cuenta' : 'Iniciar sesión'}</button>
      </form>
      <p className="sub">
        {esRegistro ? <>¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></> : <>¿Eres cliente nuevo? <Link to="/registro">Crea tu cuenta</Link></>}
      </p>
    </main>
  );
}
