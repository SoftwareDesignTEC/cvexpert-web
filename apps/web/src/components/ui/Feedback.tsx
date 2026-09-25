import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

// Componente de error — aparece cuando el APIM no responde
interface ErrorMessageProps {
    message: string;
    onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <AlertCircle size={36} className="text-red-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                {message}
            </p>
            {onRetry && (
                <Button variant="secondary" size="sm" onClick={onRetry}>
                    <RefreshCw size={14} />
                    Reintentar
                </Button>
            )}
        </div>
    );
}

// Spinner de carga
export function LoadingSpinner() {
    return (
        <div className="flex justify-center items-center py-10">
            <svg className="animate-spin h-8 w-8 text-[#2F7FD4]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
        </div>
    );
}
