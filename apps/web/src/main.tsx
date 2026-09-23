/* eslint-disable react-refresh/only-export-components */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext.tsx';
import { router } from './router/router-index.tsx';
import './index.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        {/* GoogleOAuthProvider va en el nivel más alto — envuelve todo */}
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            {/* AuthProvider da acceso al usuario logueado en toda la app */}
            <AuthProvider>
                <RouterProvider router={router} />
            </AuthProvider>
        </GoogleOAuthProvider>
    </StrictMode>,
);
