import { useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CENTRAL_AUTH_URL } from '../config';

function isCentralOrLocal(): boolean {
    const { origin } = window.location;
    return origin === CENTRAL_AUTH_URL || origin.includes('localhost');
}

export default function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { loginWithCredential } = useAuth();

    const tokenFromUrl = searchParams.get('token');
    const authorized = isCentralOrLocal();

    useEffect(() => {
        // 1. Venimos redirigidos de la URL Central con el token
        if (tokenFromUrl) {
            loginWithCredential(tokenFromUrl);
            navigate('/', { replace: true });
            return;
        }

        // 2. Estamos en un Preview de Azure (no es localhost ni la URL Central)
        if (!authorized) {
            const returnTo = encodeURIComponent(window.location.href);
            window.location.href = `${CENTRAL_AUTH_URL}/login?returnTo=${returnTo}`;
        }
    }, [tokenFromUrl, authorized, loginWithCredential, navigate]);

    // Mientras estemos procesando el token o esperando la redirección al dominio
    // central, NUNCA montamos <GoogleLogin> — hacerlo en un origen no autorizado
    // es justamente lo que dispara el loop de re-autenticación con Google.
    if (tokenFromUrl) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    Procesando inicio de sesión...
                </p>
            </div>
        );
    }

    if (!authorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    Redirigiendo al sitio principal para iniciar sesión...
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
            <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 flex flex-col items-center gap-6">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">CVMaster</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    Iniciá sesión con tu cuenta de Google para continuar.
                </p>

                <GoogleLogin
                    onSuccess={credentialResponse => {
                        if (!credentialResponse.credential) return;

                        const returnTo = searchParams.get('returnTo');
                        if (returnTo) {
                            const decodedReturnUrl = decodeURIComponent(returnTo);
                            const separator = decodedReturnUrl.includes('?') ? '&' : '?';
                            window.location.href = `${decodedReturnUrl}${separator}token=${credentialResponse.credential}`;
                            return;
                        }

                        loginWithCredential(credentialResponse.credential);
                        navigate('/', { replace: true });
                    }}
                    onError={() => {}}
                />
            </div>
        </div>
    );
}