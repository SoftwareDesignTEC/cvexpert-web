import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
    const navigate = useNavigate();
    const { loginWithCredential } = useAuth();

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