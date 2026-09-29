import { useTheme } from '../context/ThemeContext';

// ── Bloque de configuración (título + card) ───────────────────────────────────
function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
            {children}
        </div>
    );
}

// ── Fila de acción decorativa (sin funcionalidad en esta fase) ───────────────
function ActionRow({ label, danger }: { label: string; danger?: boolean }) {
    return (
        <button
            type="button"
            disabled
            className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors cursor-not-allowed
                ${danger
                ? 'text-red-500 border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-900/10'
                : 'text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50'
            }`}
        >
            {label}
        </button>
    );
}

// ── Fila de notificación con toggle decorativo (siempre activado) ────────────
function NotificationRow({ label }: { label: string }) {
    return (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
            <span
                aria-hidden="true"
                className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-[#2F7FD4] cursor-not-allowed"
            >
                <span className="inline-block h-4 w-4 translate-x-4 rounded-full bg-white transition-transform" />
            </span>
        </div>
    );
}

// ── Selector decorativo (Idioma / Zona Horaria) ───────────────────────────────
function DisabledSelect({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
            <select
                disabled
                value={value}
                onChange={() => {}}
                className="text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 px-3 py-2 cursor-not-allowed"
            >
                <option>{value}</option>
            </select>
        </div>
    );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="flex flex-col gap-3 sm:gap-6">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white sm:text-2xl">
                Configuración
            </h1>

            {/* ── Preferencias del Sistema (Tema conectado a ThemeContext) ────── */}
            <SettingsCard title="Preferencias del Sistema">
                <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Tema</label>
                        <select
                            value={theme}
                            onChange={e => {
                                const next = e.target.value as 'light' | 'dark';
                                if (next !== theme) toggleTheme();
                            }}
                            className="text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:border-[#2F7FD4]"
                        >
                            <option value="light">Claro</option>
                            <option value="dark">Oscuro</option>
                        </select>
                    </div>

                    <DisabledSelect label="Idioma" value="Español" />
                    <DisabledSelect label="Zona Horaria" value="GMT-6" />
                </div>
            </SettingsCard>

            {/* ── Seguridad de la Cuenta + Notificaciones ──────────────────────── */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <SettingsCard title="Seguridad de la Cuenta">
                    <ActionRow label="Cambiar Contraseña" />
                    <ActionRow label="Cambiar Correo Electrónico" />
                    <ActionRow label="Sesiones Activas" />
                </SettingsCard>

                <SettingsCard title="Notificaciones">
                    <NotificationRow label="Estado de Postulación" />
                    <NotificationRow label="Recomendación de Curso" />
                    <NotificationRow label="Alertas de Empleo" />
                </SettingsCard>
            </div>

            {/* ── Datos ─────────────────────────────────────────────────────────── */}
            <SettingsCard title="Datos">
                <ActionRow label="Descargar mis datos" />
                <ActionRow label="Eliminar Cuenta" danger />
                <ActionRow label="Políticas de Privacidad" />
                <ActionRow label="Términos y Condiciones" />
            </SettingsCard>

            {/* ── Contacto ──────────────────────────────────────────────────────── */}
            <SettingsCard title="Para consultas contactar al soporte técnico">
                <ActionRow label="Enviar Correo Electrónico" />
            </SettingsCard>
        </div>
    );
}