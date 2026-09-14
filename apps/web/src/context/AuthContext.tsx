import { createContext, useContext, useState } from 'react';
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

    // useGoogleLogin con flow 'implicit' devuelve un access_token directamente
    // Con ese token se consulta el perfil del usuario a Google
    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            const userInfo = await fetch(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
            ).then(res => res.json()) as GoogleUser;

            setUser(userInfo);
            localStorage.setItem('auth_user', JSON.stringify(userInfo));
        },
        onError: () => {
            //
        },
    });

    const logout = () => {
        googleLogout();
        setUser(null);
        localStorage.removeItem('auth_user');
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