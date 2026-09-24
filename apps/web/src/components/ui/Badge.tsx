import type { ApplicationStatus } from '../../types/models';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'gray';

interface BadgeProps {
    label: string;
    variant?: BadgeVariant;
    dot?: boolean;       // muestra un círculo de color antes del texto
}

const variantStyles: Record<BadgeVariant, string> = {
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    danger:  'bg-red-100  text-red-700  dark:bg-red-900/30  dark:text-red-400',
    info:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    gray:    'bg-gray-100 text-gray-600 dark:bg-gray-800    dark:text-gray-400',
};

const dotStyles: Record<BadgeVariant, string> = {
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    danger:  'bg-red-500',
    info:    'bg-blue-500',
    gray:    'bg-gray-400',
};

// Badge genérico
export default function Badge({ label, variant = 'gray', dot = false }: BadgeProps) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[variant]}`} />}
            {label}
    </span>
    );
}

// Badge específico para el estado de una postulación (Kanban)
const applicationStatusConfig: Record<ApplicationStatus, { label: string; variant: BadgeVariant }> = {
    'applied':     { label: 'Aplicado',    variant: 'info'    },
    'in-progress': { label: 'En proceso',  variant: 'warning' },
    'interview':   { label: 'Entrevista',  variant: 'success' },
    'rejected':    { label: 'Rechazado',   variant: 'danger'  },
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
    const config = applicationStatusConfig[status];
    return <Badge label={config.label} variant={config.variant} dot />;
}

// Badge de Online/Offline para el header
export function OnlineStatusBadge({ isOnline }: { isOnline: boolean }) {
    return (
        <Badge
            label={isOnline ? 'Online' : 'Offline'}
            variant={isOnline ? 'success' : 'danger'}
            dot
        />
    );
}
