/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { UNAUTHORIZED_EVENT, describeError } from '../services/http';
import { profileService } from '../services/profileService';
import type { UserProfile } from '../types/models';

// Del id_token sólo se leen la identidad y la vigencia. Los datos que se muestran
// en pantalla (nombre, foto, correo) se piden al APIM y viven únicamente en memoria:
// al recargar sin conexión no debe quedar rastro del usuario en el dispositivo.
interface TokenClaims {
    sub: string;
    exp: number;
}

interface AuthContextValue {
    userId: string | null;
    profile: UserProfile | null;
    loadingProfile: boolean;
    profileError: string | null;
    isAuthenticated: boolean;
    loginWithCredential: (idToken: string) => void;
    reloadProfile: () => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Hasta la v0.4.0 el perfil se guardaba en localStorage bajo 'auth_user'. Dejar de
// escribirlo no basta: en los dispositivos donde ya se habia iniciado sesion el valor
// sigue ahi, asi que se borra al cargar la aplicacion.
try {
    localStorage.removeItem('auth_user');
} catch {
    // Si el navegador bloquea el almacenamiento no hay nada que limpiar
}

// Lo único que se persiste es el token: es la credencial, no información del usuario.
function readValidUserId(): string | null {
    const idToken = localStorage.getItem('id_token');
    if (!idToken) return null;

    try {
        const { sub, exp } = jwtDecode<TokenClaims>(idToken);
        if (!sub || !exp || exp * 1000 <= Date.now()) {
            localStorage.removeItem('id_token');
            return null;
        }
        return sub;
    } catch {
        localStorage.removeItem('id_token');
        return null;
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [userId, setUserId] = useState<string | null>(readValidUserId);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    const loginWithCredential = useCallback((idToken: string) => {
        const { sub } = jwtDecode<TokenClaims>(idToken);
        localStorage.setItem('id_token', idToken);
        setUserId(sub);
    }, []);

    const logout = useCallback(() => {
        googleLogout();
        localStorage.removeItem('id_token');
        setUserId(null);
        setProfile(null);
        setProfileError(null);
    }, []);

    const reloadProfile = useCallback(() => setReloadKey(k => k + 1), []);

    // El perfil se trae en cada arranque: sin red no hay datos que mostrar.
    useEffect(() => {
        if (!userId) return;

        let cancelled = false;

        const load = async () => {
            setLoadingProfile(true);
            setProfileError(null);
            try {
                const res = await profileService.getById(userId);
                if (!cancelled) setProfile(res);
            } catch (err) {
                if (!cancelled) {
                    setProfileError(describeError(err, 'cargar tu perfil'));
                }
            } finally {
                if (!cancelled) setLoadingProfile(false);
            }
        };
        load();

        return () => { cancelled = true; };
    }, [userId, reloadKey]);

    // Un 401 del APIM cierra la sesión acá, así el estado y el token no se desincronizan.
    useEffect(() => {
        const onUnauthorized = () => {
            localStorage.removeItem('id_token');
            setUserId(null);
            setProfile(null);
        };
        window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
        return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({
            userId,
            profile,
            loadingProfile,
            profileError,
            // La sesión depende del token, no del perfil: sin red se entra igual,
            // pero sin datos que mostrar.
            isAuthenticated: userId !== null,
            loginWithCredential,
            reloadProfile,
            logout,
        }),
        [userId, profile, loadingProfile, profileError, loginWithCredential, reloadProfile, logout],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
    return ctx;
}
