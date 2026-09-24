interface CardProps {
    children: React.ReactNode;
    className?: string;
}

interface CardHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;  // botón o link en la esquina derecha
}

// Componente principal
export default function Card({ children, className = '' }: CardProps) {
    return (
        <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 ${className}`}>
            {children}
        </div>
    );
}

// Header opcional con título, subtítulo y acción
export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
    return (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
                {subtitle && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
                )}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}

// Cuerpo con padding estándar
export function CardBody({ children, className = '' }: CardProps) {
    return (
        <div className={`px-6 py-4 ${className}`}>
            {children}
        </div>
    );
}

// Footer opcional
export function CardFooter({ children, className = '' }: CardProps) {
    return (
        <div className={`px-6 py-4 border-t border-gray-200 dark:border-gray-800 ${className}`}>
            {children}
        </div>
    );
}
