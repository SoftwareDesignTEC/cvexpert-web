/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { UNAUTHORIZED_EVENT } from '../services/http';

export interface GoogleUser {
    sub: string;
    name: string;
    email: string;
    picture: string;
}

interface DecodedToken extends GoogleUser {
    exp: number;
}

interface AuthContextValue {
    user: GoogleUser | null;
    isAuthenticated: boolean;
    loginWithCredential: (idToken: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function clearStoredSession() {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('id_token');
}

// Restaurar un id_token ya vencido deja a ProtectedRoute creyendo que hay sesión;
// el primer fetch devuelve 401 y rebota a /login, que es media vuelta del loop.
// Mejor descartarlo acá y arrancar sin sesión.
function readStoredSession(): GoogleUser | null {
    const idToken = localStorage.getItem('id_token');
    const saved = localStorage.getItem('auth_user');
    if (!idToken || !saved) return null;

    try {
        const { exp } = jwtDecode<DecodedToken>(idToken);
        if (!exp || exp * 1000 <= Date.now()) {
            clearStoredSession();
            return null;
        }
        return JSON.parse(saved) as GoogleUser;
    } catch {
        clearStoredSession();
        return null;
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<GoogleUser | null>(readStoredSession);

    // Memoizadas: LoginPage las tiene en las deps de su useEffect, y una identidad
    // nueva en cada render volvía a disparar el efecto en bucle.
    const loginWithCredential = useCallback((idToken: string) => {
        const decoded = jwtDecode<DecodedToken>(idToken);
        localStorage.setItem('auth_user', JSON.stringify(decoded));
        localStorage.setItem('id_token', idToken);
        setUser(decoded);
    }, []);

    const logout = useCallback(() => {
        googleLogout();
        clearStoredSession();
        setUser(null);
    }, []);

    // Un 401 de APIM cierra la sesión por acá, de modo que el estado de React y
    // localStorage nunca quedan desincronizados. El router se encarga de ir a /login.
    useEffect(() => {
        const onUnauthorized = () => {
            clearStoredSession();
            setUser(null);
        };
        window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
        return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({ user, isAuthenticated: user !== null, loginWithCredential, logout }),
        [user, loginWithCredential, logout],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
    return ctx;
}
