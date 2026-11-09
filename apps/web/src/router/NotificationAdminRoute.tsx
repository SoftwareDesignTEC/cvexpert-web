import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/ui/Feedback';
import { useNotificationAdmin } from '../context/NotificationAdminContext';

// Deja pasar sólo si el usuario puede editar las plantillas de notificaciones. Sin
// permiso se trata como una ruta desconocida: vuelve al inicio, igual que el comodín '*'.
export default function NotificationAdminRoute({ children }: { children: React.ReactNode }) {
    const { canEditTemplates } = useNotificationAdmin();

    if (canEditTemplates === null) return <LoadingSpinner />;
    if (!canEditTemplates) return <Navigate to="/" replace />;
    return <>{children}</>;
}
