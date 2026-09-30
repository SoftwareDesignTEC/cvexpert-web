import { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CENTRAL_AUTH_URL, isAllowedReturnUrl, isAuthorizedOrigin } from '../config';

export default function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isAuthenticated, loginWithCredential } = useAuth();
    const [error, setError] = useState<string | null>(null);

    const tokenFromUrl = searchParams.get('token');
    const returnTo = searchParams.get('returnTo');
    const authorized = isAuthorizedOrigin();

    // Se valida en el render, no dentro del efecto: un setState en el efecto vuelve a
    // encadenar renders, que es justo el patrón que causaba el loop.
    const tokenIsValid = useMemo(() => {
        if (!tokenFromUrl) return false;
        try {
            jwtDecode(tokenFromUrl);
            return true;
        } catch {
            return false;
        }
    }, [tokenFromUrl]);

    // El efecto navega y redirige: sin esta guarda, cualquier render extra lo vuelve a
    // ejecutar y se encadenan navegaciones hasta que Chrome las empieza a frenar.
    const handled = useRef(false);

    useEffect(() => {
        if (handled.current) return;

        if (tokenFromUrl) {
            if (!tokenIsValid) return;
            handled.current = true;
            loginWithCredential(tokenFromUrl);
            // replace: deja el token fuera del historial, así el botón "atrás" no
            // vuelve a caer en /login?token=... y reinicia todo el flujo.
            navigate('/', { replace: true });
            return;
        }

        if (!authorized) {
            handled.current = true;
            const target = `${window.location.origin}/login`;
            window.location.replace(`${CENTRAL_AUTH_URL}/login?returnTo=${encodeURIComponent(target)}`);
        }
    }, [tokenFromUrl, tokenIsValid, authorized, loginWithCredential, navigate]);

    const tokenError = tokenFromUrl && !tokenIsValid
        ? 'El token recibido no es válido. Probá iniciar sesión otra vez.'
        : null;

    const message = (text: string) => (
        <div className="min-h-screen flex items-center justify-center px-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">{text}</p>
        </div>
    );

    if (error ?? tokenError) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="w-full max-w-sm flex flex-col items-center gap-4 text-center">
                    <p className="text-sm text-red-500">{error ?? tokenError}</p>
                    <button
                        onClick={() => window.location.replace(`${window.location.origin}/login`)}
                        className="text-sm font-medium text-[#2F7FD4] hover:underline"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    if (isAuthenticated) return <Navigate to="/" replace />;
    if (tokenFromUrl) return message('Procesando inicio de sesión...');
    if (!authorized) return message('Redirigiendo al sitio principal para iniciar sesión...');

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
            <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 flex flex-col items-center gap-6">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">CVMaster</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    Iniciá sesión con tu cuenta de Google para continuar.
                </p>
                <GoogleLogin
                    onSuccess={credentialResponse => {
                        const credential = credentialResponse.credential;
                        if (!credential) {
                            setError('Google no devolvió un id_token.');
                            return;
                        }

                        // Login iniciado desde un preview: le devolvemos el token a su origen.
                        if (returnTo) {
                            // Sin esta validación, ?returnTo=https://cualquier-cosa le entrega
                            // el id_token del usuario a quien haya armado el link.
                            if (!isAllowedReturnUrl(returnTo)) {
                                setError('El destino del inicio de sesión no está autorizado.');
                                return;
                            }
                            const separator = returnTo.includes('?') ? '&' : '?';
                            window.location.replace(`${returnTo}${separator}token=${encodeURIComponent(credential)}`);
                            return;
                        }

                        loginWithCredential(credential);
                        navigate('/', { replace: true });
                    }}
                    onError={() => setError('No se pudo completar el inicio de sesión con Google.')}
                />
            </div>
        </div>
    );
}
