import { useState } from 'react';
import { Briefcase, UserCircle2 } from 'lucide-react';

// Las URLs de imagen vienen del APIM y muchas no cargan (dominios que bloquean el
// enlace externo, bloqueadores del navegador, enlaces caídos). Sin un respaldo, el
// navegador deja el icono de imagen rota con el texto alternativo al lado.

function initialsOf(name?: string) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
}

// Logo de empresa: cae a la inicial sobre el color que se le pase
export function CompanyLogo({
    src, name, className = '', iconSize = 16,
}: {
    src?: string;
    name: string;
    /** Clases del contenedor: tamaño, color de fondo y de texto */
    className?: string;
    iconSize?: number;
}) {
    const [failed, setFailed] = useState(false);
    const showImage = src && !failed;

    return (
        <div className={`flex items-center justify-center shrink-0 overflow-hidden font-bold ${className}`}>
            {showImage ? (
                <img
                    src={src}
                    alt={name}
                    onError={() => setFailed(true)}
                    className="w-full h-full object-cover"
                />
            ) : name ? (
                <span>{initialsOf(name)}</span>
            ) : (
                <Briefcase size={iconSize} />
            )}
        </div>
    );
}

// Foto de persona: cae a las iniciales en un círculo azul
export function Avatar({
    src, name, size = 32, className = '',
}: {
    src?: string;
    name?: string;
    size?: number;
    className?: string;
}) {
    const [failed, setFailed] = useState(false);
    const showImage = src && !failed;

    if (showImage) {
        return (
            <img
                src={src}
                alt={name ?? 'Foto de perfil'}
                onError={() => setFailed(true)}
                style={{ width: size, height: size }}
                className={`rounded-full object-cover shrink-0 ${className}`}
            />
        );
    }

    if (!name) {
        return <UserCircle2 size={size} className={`text-gray-300 dark:text-gray-700 shrink-0 ${className}`} />;
    }

    return (
        <span
            style={{ width: size, height: size, fontSize: Math.max(11, size * 0.36) }}
            className={`rounded-full bg-primary text-white font-bold flex items-center justify-center shrink-0 ${className}`}
        >
            {initialsOf(name)}
        </span>
    );
}
