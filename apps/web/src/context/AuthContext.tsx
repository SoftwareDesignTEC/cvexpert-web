import { createContext, useContext, useState, useEffect } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';

// Datos del usuario que Google devuelve
export interface GoogleUser {
    sub: string;        // ID único de Google
    name: string;
    email: string;
    picture: string;
}

interface AuthContextValue {
    user: GoogleUser | null;
    isAuthenticated: boolean;
    login: () => void;        // dispara el popup de Google
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<GoogleUser | null>(() => {
        // Restaurar sesión guardada al recargar la página
        const saved = localStorage.getItem('auth_user');
        return saved ? JSON.parse(saved) : null;
    });

    // Login manual desplegado por el usuario
    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            const userInfo = await fetch(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
            ).then(res => res.json()) as GoogleUser;

            setUser(userInfo);
            localStorage.setItem('auth_user', JSON.stringify(userInfo));
            if (tokenResponse.access_token) {
                localStorage.setItem('id_token', tokenResponse.access_token);
            }
        },
        onError: () => {
            //
        },
    });

    // Renovación silenciosa en segundo plano
    const refreshToken = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            if (tokenResponse.access_token) {
                localStorage.setItem('id_token', tokenResponse.access_token);
                console.log('Token de Google renovado silenciosamente');
            }
        },
        onError: (error) => {
            console.error('Error al renovar sesión silenciosamente:', error);
        },
        prompt: 'none', // IMPORTANTE: No muestra la ventana emergente al usuario
    });

    // Temporizador para ejecutar el Silent Refresh cada 55 minutos
    useEffect(() => {
        if (!user) return; // Solo renueva si hay un usuario logueado

        const interval = setInterval(() => {
            refreshToken();
        }, 55 * 60 * 1000); // 55 minutos en milisegundos

        return () => clearInterval(interval);
    }, [user, refreshToken]);

    const logout = () => {
        googleLogout();
        setUser(null);
        localStorage.removeItem('auth_user');
        localStorage.removeItem('id_token');
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: user !== null,
            login: googleLogin,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
    return ctx;
}
