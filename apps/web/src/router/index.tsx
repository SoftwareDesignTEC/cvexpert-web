/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from '../App';

// Páginas — creá el archivo cuando empieces cada pantalla
// import HomePage from '../pages/HomePage';
// import LoginPage from '../pages/LoginPage';
// import NotFoundPage from '../pages/NotFoundPage';

// Placeholder hasta que tengas las páginas reales
const Placeholder = ({ name }: { name: string }) => (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h2>🚧 {name}</h2>
        <p>Página pendiente de implementar.</p>
    </div>
);

export const router = createBrowserRouter([
    {
        path: '/',
        element: <App />,           // App envuelve con ThemeProvider y el layout base
        children: [
            {
                index: true,
                element: <Placeholder name="Home" />,
            },
            {
                path: 'login',
                element: <Placeholder name="Login" />,
            },
            // Agregar rutas aquí conforme se creen las páginas:
            // { path: 'entidades', element: <HomePage /> },
            // { path: 'entidades/:id', element: <DetallePage /> },
        ],
    },
    {
        // Cualquier ruta desconocida redirige a Home
        path: '*',
        element: <Navigate to="/" replace />,
    },
]);