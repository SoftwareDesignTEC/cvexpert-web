import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Envuelve las rutas que requieren sesión iniciada — si no hay usuario,
// redirige a /login en vez de dejar pasar a la pantalla protegida.
export default function ProtectedRoute() {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}