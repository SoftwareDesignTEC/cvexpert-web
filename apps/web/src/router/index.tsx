/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';

// Páginas — placeholders hasta que se construya cada una
const Placeholder = ({ name }: { name: string }) => (
    <div className="p-8">
        <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-200">🚧 {name}</h2>
        <p className="text-gray-500 mt-2">Página pendiente de implementar.</p>
    </div>
);

export const router = createBrowserRouter([
    {
        path: '/',
        element: <MainLayout />,
        children: [
            { index: true,                    element: <Placeholder name="Panel Principal" /> },
            { path: 'cvs',                    element: <Placeholder name="Mis Currículums" /> },
            { path: 'cvs/new',                element: <Placeholder name="Crear Nuevo CV" /> },
            { path: 'profile',                element: <Placeholder name="Mi Perfil" /> },
            { path: 'skills-gap',             element: <Placeholder name="Análisis de Brechas" /> },
            { path: 'templates',              element: <Placeholder name="Plantillas / Offline" /> },
            { path: 'jobs',                   element: <Placeholder name="Ofertas Laborales" /> },
            { path: 'applications',           element: <Placeholder name="Postulaciones" /> },
            { path: 'settings',               element: <Placeholder name="Configuración" /> },
        ],
    },
    {
        path: '/login',
        element: <Placeholder name="Login" />,
    },
    {
        path: '*',
        element: <Navigate to="/" replace />,
    },
]);
