import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import Navbar from './components/Navbar';
import Acceso from './pages/Acceso';
import Catalogo from './pages/Catalogo';
import MisReservas from './pages/MisReservas';
import Admin from './pages/Admin';

function Protegida({ children, soloAdmin = false }) {
  const { user, cargando } = useAuth();
  if (cargando) return <main><p>Cargando…</p></main>;
  if (!user) return <Navigate to="/login" replace />;
  if (soloAdmin && user.rol !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Acceso modo="login" />} />
        <Route path="/registro" element={<Acceso modo="registro" />} />
        <Route path="/" element={<Protegida><Catalogo /></Protegida>} />
        <Route path="/mis-reservas" element={<Protegida><MisReservas /></Protegida>} />
        <Route path="/admin" element={<Protegida soloAdmin><Admin /></Protegida>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
