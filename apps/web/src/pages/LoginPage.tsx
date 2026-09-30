import { useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CENTRAL_AUTH_URL } from '../config';

export default function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { loginWithCredential } = useAuth();

    useEffect(() => {
        const currentOrigin = window.location.origin;
        const tokenFromUrl = searchParams.get('token');

        // 1. Si venimos redirigidos de la URL Central con el token
        if (tokenFromUrl) {
            loginWithCredential(tokenFromUrl);
            navigate('/', { replace: true });
            return;
        }

        // 2. Si estamos en un Preview de Azure (que no es localhost ni la URL Central)
        if (currentOrigin !== CENTRAL_AUTH_URL && !currentOrigin.includes('localhost')) {
            const returnTo = encodeURIComponent(window.location.href);
            window.location.href = `${CENTRAL_AUTH_URL}/login?returnTo=${returnTo}`;
        }
    }, [loginWithCredential, navigate, searchParams]);

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

                        // Si vinimos redirigidos desde un Preview, devolvemos el token a esa URL
                        if (returnTo) {
                            const decodedReturnUrl = decodeURIComponent(returnTo);
                            const separator = decodedReturnUrl.includes('?') ? '&' : '?';
                            window.location.href = `${decodedReturnUrl}${separator}token=${credentialResponse.credential}`;
                            return;
                        }

                        // Si estamos directamente en la URL Central o en Localhost
                        loginWithCredential(credentialResponse.credential);
                        navigate('/', { replace: true });
                    }}
                    onError={() => {
                        // Sin manejo de error visual por ahora
                    }}
                />
            </div>
        </div>
    );
}
