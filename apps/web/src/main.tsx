/* eslint-disable react-refresh/only-export-components */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { router } from './router';
import './index.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// LanguageProvider va por fuera de AuthProvider porque este sincroniza el idioma
// de las notificaciones con el servidor en cuanto hay sesión.
createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <LanguageProvider>
                <AuthProvider>
                    <ThemeProvider>
                        <RouterProvider router={router} />
                    </ThemeProvider>
                </AuthProvider>
            </LanguageProvider>
        </GoogleOAuthProvider>
    </StrictMode>,
);