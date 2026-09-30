import { createContext, useContext, useState } from 'react';
import { googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

// Datos que vienen dentro del id_token (JWT) que firma Google —
// coinciden con los campos estándar de un ID token de Google.
export interface GoogleUser {
    sub: string;        // ID único de Google
    name: string;
    email: string;
    picture: string;
}

interface AuthContextValue {
    user: GoogleUser | null;
    isAuthenticated: boolean;
    // Recibe el id_token (JWT) que entrega el botón <GoogleLogin>, lo decodifica
    // para sacar los datos del usuario y lo guarda — es el mismo token que
    // http.ts manda a APIM en cada request.
    loginWithCredential: (idToken: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<GoogleUser | null>(() => {
        // Restaurar sesión guardada al recargar la página
        const saved = localStorage.getItem('auth_user');
        return saved ? JSON.parse(saved) : null;
    });

    const loginWithCredential = (idToken: string) => {
        const decoded = jwtDecode<GoogleUser>(idToken);
        setUser(decoded);
        localStorage.setItem('auth_user', JSON.stringify(decoded));
        // Este es el id_token real (JWT) — APIM lo valida y http.ts lo lee de acá
        localStorage.setItem('id_token', idToken);
    };

    // Sin refresh automático (APIM no lo soporta, según Cabrera): al vencer
    // el token, http.ts limpia la sesión y manda al usuario de vuelta a /login.
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
            loginWithCredential,
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