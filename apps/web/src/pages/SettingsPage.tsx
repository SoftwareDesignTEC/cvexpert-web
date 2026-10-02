import { ChevronRight, HelpCircle, KeyRound, Mail, MonitorSmartphone, Download, Trash2, Shield, FileText, Bell, GraduationCap, Briefcase } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import {
    ApplicationAlertsDialog, ChangeEmailDialog, ChangePasswordDialog,
    CourseAlertsDialog, DeleteAccountDialog, JobAlertsDialog,
} from '../components/ui/SettingsDialogs';
import SupportDialog from '../components/ui/SupportDialog';
import LegalDialog from '../components/ui/LegalDialog';
import { ActiveSessionsDialog, ExportDataDialog } from '../components/ui/AccountDialogs';
import type { LegalKind } from '../services/legalService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// ── Tarjeta con título y descripción ─────────────────────────────────────────
function SettingsCard({
    title, subtitle, children, className = '',
}: {
    title: string;
    subtitle: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`bg-surface dark:bg-gray-900 border border-line dark:border-gray-800 rounded-2xl shadow-sm p-5 flex flex-col gap-4 ${className}`}>
            <div>
                <h2 className="text-lg font-bold text-ink dark:text-white">{title}</h2>
                <p className="text-sm text-muted">{subtitle}</p>
            </div>
            <div className="flex flex-col gap-2">{children}</div>
        </div>
    );
}

// ── Fila de acción. Sin funcionalidad en esta fase: va deshabilitada y el cursor
//    de bloqueo lo deja claro al pasar por encima. ────────────────────────────
function ActionRow({
    label, icon: Icon, danger, onClick,
}: {
    label: string;
    icon: LucideIcon;
    danger?: boolean;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!onClick}
            title={onClick ? undefined : 'Todavía no disponible'}
            className={`group w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors
                ${onClick ? 'hover:border-primary cursor-pointer' : 'cursor-not-allowed'}
                ${danger
                ? 'border-rose-200 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20'
                : 'border-line bg-primary-tint/50 dark:border-gray-800 dark:bg-gray-800/40'
            }`}
        >
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white
                ${danger ? 'bg-rose-500' : 'bg-primary'}`}
            >
                <Icon size={15} />
            </span>
            <span className={`flex-1 text-sm font-medium truncate ${danger ? 'text-rose-600 dark:text-rose-400' : 'text-body dark:text-gray-200'}`}>
                {label}
            </span>
            <ChevronRight size={16} className={danger ? 'text-rose-400 shrink-0' : 'text-muted shrink-0'} />
        </button>
    );
}

// ── Selector decorativo (Idioma / Zona Horaria) ───────────────────────────────
function DisabledSelect({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted">{label}</label>
            <select
                disabled
                value={value}
                onChange={() => {}}
                title="Todavía no disponible"
                className="text-sm rounded-xl border border-line dark:border-gray-800 bg-canvas/60 dark:bg-gray-800/50 text-muted px-3 py-2.5 cursor-not-allowed"
            >
                <option>{value}</option>
            </select>
        </div>
    );
}

// ── Página ────────────────────────────────────────────────────────────────────
type OpenDialog = 'password' | 'email' | 'delete' | 'applications' | 'courses' | 'jobs' | 'support' | 'sessions' | 'export' | null;

export default function SettingsPage() {
    const { theme, toggleTheme } = useTheme();
    const { profile, userId } = useAuth();
    const [dialog, setDialog] = useState<OpenDialog>(null);
    const [legal, setLegal] = useState<LegalKind | null>(null);

    return (
        <div className="flex flex-col gap-4 sm:gap-6">

            <PageHeader eyebrow="Tu cuenta" title="Configuración" />

            {/* Tres bloques en escritorio, apilados en móvil */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
                <SettingsCard
                    title="Seguridad de la Cuenta"
                    subtitle="Administra el acceso y protege tu información."
                >
                    <ActionRow label="Cambiar Contraseña" icon={KeyRound} onClick={() => setDialog('password')} />
                    <ActionRow label="Cambiar Correo Electrónico" icon={Mail} onClick={() => setDialog('email')} />
                    <ActionRow label="Sesiones Activas" icon={MonitorSmartphone} onClick={() => setDialog('sessions')} />
                </SettingsCard>

                <SettingsCard
                    title="Notificaciones"
                    subtitle="Elige qué novedades quieres recibir."
                >
                    <ActionRow label="Estado de Postulación" icon={Bell} onClick={() => setDialog('applications')} />
                    <ActionRow label="Recomendación de Curso" icon={GraduationCap} onClick={() => setDialog('courses')} />
                    <ActionRow label="Alertas de Empleo" icon={Briefcase} onClick={() => setDialog('jobs')} />
                </SettingsCard>

                <SettingsCard
                    title="Datos"
                    subtitle="Controla tus datos y documentos legales."
                >
                    <ActionRow label="Descargar mis datos" icon={Download} onClick={() => setDialog('export')} />
                    <ActionRow label="Eliminar Cuenta" icon={Trash2} danger onClick={() => setDialog('delete')} />
                    <ActionRow label="Políticas de Privacidad" icon={Shield} onClick={() => setLegal('privacy')} />
                    <ActionRow label="Términos y Condiciones" icon={FileText} onClick={() => setLegal('terms')} />
                </SettingsCard>
            </div>

            {/* Preferencias y soporte */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
                <SettingsCard
                    title="Preferencias del Sistema"
                    subtitle="Personaliza CVExpert para trabajar a tu manera."
                    className="lg:col-span-2"
                >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-muted">Tema</label>
                            <select
                                value={theme}
                                onChange={e => {
                                    const next = e.target.value as 'light' | 'dark';
                                    if (next !== theme) toggleTheme();
                                }}
                                className="text-sm rounded-xl border border-line dark:border-gray-800 bg-surface dark:bg-gray-800 text-ink dark:text-white px-3 py-2.5 focus:outline-none focus:border-primary"
                            >
                                <option value="light">Claro</option>
                                <option value="dark">Oscuro</option>
                            </select>
                        </div>

                        <DisabledSelect label="Idioma" value="Español" />
                        <DisabledSelect label="Zona Horaria" value="Costa Rica (GMT-6)" />
                    </div>
                </SettingsCard>

                {/* Soporte, en alto contraste como en el mockup */}
                <div className="rounded-2xl bg-gradient-to-br from-ink to-deep p-5 flex flex-col gap-4 justify-between">
                    <div className="flex items-start gap-3">
                        <span className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                            <HelpCircle size={18} />
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-base font-bold text-white">¿Necesitas ayuda?</h2>
                            <p className="text-sm text-white/60">Contacta a nuestro equipo de soporte técnico.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setDialog('support')}
                        className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
                    >
                        Enviar Correo Electrónico
                    </button>
                </div>
            </div>

            <ChangePasswordDialog open={dialog === 'password'} onClose={() => setDialog(null)} />
            <ChangeEmailDialog
                open={dialog === 'email'}
                onClose={() => setDialog(null)}
                currentEmail={profile?.email}
            />
            <DeleteAccountDialog open={dialog === 'delete'} onClose={() => setDialog(null)} />
            <ApplicationAlertsDialog open={dialog === 'applications'} onClose={() => setDialog(null)} />
            <CourseAlertsDialog open={dialog === 'courses'} onClose={() => setDialog(null)} />
            <JobAlertsDialog open={dialog === 'jobs'} onClose={() => setDialog(null)} />
            <SupportDialog open={dialog === 'support'} onClose={() => setDialog(null)} />
            <LegalDialog kind={legal} onClose={() => setLegal(null)} />
            <ActiveSessionsDialog open={dialog === 'sessions'} userId={userId} onClose={() => setDialog(null)} />
            <ExportDataDialog open={dialog === 'export'} userId={userId} onClose={() => setDialog(null)} />
        </div>
    );
}
