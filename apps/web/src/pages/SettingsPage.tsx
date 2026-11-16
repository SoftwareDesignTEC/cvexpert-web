import { ChevronRight, HelpCircle, KeyRound, Mail, MonitorSmartphone, Download, Trash2, Shield, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import {
    ChangeEmailDialog, ChangePasswordDialog, DeleteAccountDialog,
} from '../components/ui/SettingsDialogs';
import SupportDialog from '../components/ui/SupportDialog';
import LegalDialog from '../components/ui/LegalDialog';
import { ActiveSessionsDialog, ExportDataDialog } from '../components/ui/AccountDialogs';
import type { LegalKind } from '../services/legalService';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LOCALES, useLocale } from '../i18n/LocaleContext';
import { useNotificationPrefs } from '../hooks/useNotificationPrefs';
import { Toggle } from '../components/ui/FormBits';
import type { Locale } from '../components/cv/cvLabels';
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

/**
 * La zona horaria no se elige: se toma del dispositivo, como pide el requisito,
 * así que el control está para informar y no para cambiar nada. Se arma con la
 * configuración real del navegador en vez de escribir "Costa Rica (GMT-6)" a
 * mano, que era mentira para cualquiera que abriera la aplicación desde afuera.
 */
function zonaHoraria(): string {
    try {
        const zona = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const minutos = -new Date().getTimezoneOffset();
        const signo = minutos < 0 ? '-' : '+';
        const abs = Math.abs(minutos);
        const horas = String(Math.floor(abs / 60)).padStart(2, '0');
        const resto = String(abs % 60).padStart(2, '0');
        return `${zona} (GMT${signo}${horas}:${resto})`;
    } catch {
        return 'GMT';
    }
}

// ── Selector sólo informativo ────────────────────────────────────────────────
function DisabledSelect({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted">{label}</label>
            <select
                disabled
                value={value}
                onChange={() => {}}
                title={value}
                className="text-sm rounded-xl border border-line dark:border-gray-800 bg-canvas/60 dark:bg-gray-800/50 text-muted px-3 py-2.5 cursor-not-allowed"
            >
                <option>{value}</option>
            </select>
        </div>
    );
}

// ── Página ────────────────────────────────────────────────────────────────────
type OpenDialog = 'password' | 'email' | 'delete' | 'support' | 'sessions' | 'export' | null;

export default function SettingsPage() {
    const { theme, toggleTheme } = useTheme();
    const { profile, userId } = useAuth();
    const { setNotificationLanguage } = useLanguage();
    const { locale, setLocale, t } = useLocale();
    const { prefs, set: setPref } = useNotificationPrefs();

    /**
     * Un solo control para los dos idiomas.
     *
     * Por dentro son cosas distintas: el de la aplicación decide qué texto
     * dibuja el navegador y el de las notificaciones viaja al servicio, que es
     * quien redacta los avisos. Pero nadie quiere elegir dos veces lo mismo, y
     * dos selectores de idioma en la misma pantalla sólo generan la duda de en
     * qué se diferencian.
     */
    const cambiarIdioma = (l: Locale) => {
        setLocale(l);
        setNotificationLanguage(l);
    };
    const [dialog, setDialog] = useState<OpenDialog>(null);
    const [legal, setLegal] = useState<LegalKind | null>(null);

    return (
        <div className="flex flex-col gap-4 sm:gap-6">

            <PageHeader eyebrow={t.settings.eyebrow} title={t.settings.title} />

            {/* Tres bloques en escritorio, apilados en móvil */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
                <SettingsCard
                    title={t.settingsExtra.security}
                    subtitle={t.settingsExtra.securitySubtitle}
                >
                    <ActionRow label={t.settingsExtra.changePassword} icon={KeyRound} onClick={() => setDialog('password')} />
                    <ActionRow label={t.settingsExtra.changeEmail} icon={Mail} onClick={() => setDialog('email')} />
                    <ActionRow label={t.settingsExtra.activeSessions} icon={MonitorSmartphone} onClick={() => setDialog('sessions')} />
                </SettingsCard>

                <SettingsCard
                    title={t.settings.notifications}
                    subtitle={t.settings.notificationsSubtitle}
                >
                    {/* Interruptores en la propia tarjeta: entrar a un diálogo
                        para mover una sola palanca es un paso de más. El estado de
                        las postulaciones ya no está: lo cambia la persona desde su
                        tablero, así que avisarle de algo que acaba de hacer ella
                        misma no le dice nada nuevo. */}
                    <Toggle
                        label={t.settings.courseRecommendation}
                        description={t.settings.courseRecommendationDesc}
                        checked={prefs.courses}
                        onChange={v => setPref('courses', v)}
                    />
                    <Toggle
                        label={t.settings.jobAlerts}
                        description={t.settings.jobAlertsDesc}
                        checked={prefs.jobs}
                        onChange={v => setPref('jobs', v)}
                    />

                </SettingsCard>

                <SettingsCard
                    title={t.settings.data}
                    subtitle={t.settings.dataSubtitle}
                >
                    <ActionRow label={t.settings.exportData} icon={Download} onClick={() => setDialog('export')} />
                    <ActionRow label={t.settings.deleteAccount} icon={Trash2} danger onClick={() => setDialog('delete')} />
                    <ActionRow label={t.settings.privacy} icon={Shield} onClick={() => setLegal('privacy')} />
                    <ActionRow label={t.settings.terms} icon={FileText} onClick={() => setLegal('terms')} />
                </SettingsCard>
            </div>

            {/* Preferencias y soporte */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
                <SettingsCard
                    title={t.settingsExtra.systemPrefs}
                    subtitle={t.settingsExtra.systemPrefsSubtitle}
                    className="lg:col-span-2"
                >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-muted">{t.settings.theme}</label>
                            <select
                                value={theme}
                                onChange={e => {
                                    const next = e.target.value as 'light' | 'dark';
                                    if (next !== theme) toggleTheme();
                                }}
                                className="text-sm rounded-xl border border-line dark:border-gray-800 bg-surface dark:bg-gray-800 text-ink dark:text-white px-3 py-2.5 focus:outline-none focus:border-primary"
                            >
                                <option value="light">{t.settings.themeLight}</option>
                                <option value="dark">{t.settings.themeDark}</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="app-language" className="text-xs font-medium text-muted">
                                {t.settings.language}
                            </label>
                            <select
                                id="app-language"
                                value={locale}
                                onChange={e => cambiarIdioma(e.target.value as Locale)}
                                className="text-sm rounded-xl border border-line dark:border-gray-800 bg-surface dark:bg-gray-800 text-ink dark:text-white px-3 py-2.5 focus:outline-none focus:border-primary"
                            >
                                {LOCALES.map(l => (
                                    <option key={l.value} value={l.value}>{t.languages[l.labelKey]}</option>
                                ))}
                            </select>
                            <p className="text-[11px] text-muted">{t.settings.languageHint}</p>
                        </div>

                        <DisabledSelect label={t.settings.timezone} value={zonaHoraria()} />
                    </div>
                </SettingsCard>

                {/* Soporte, en alto contraste como en el mockup */}
                <div className="rounded-2xl bg-gradient-to-br from-ink to-deep p-5 flex flex-col gap-4 justify-between">
                    <div className="flex items-start gap-3">
                        <span className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                            <HelpCircle size={18} />
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-base font-bold text-white">{t.settingsExtra.needHelp}</h2>
                            <p className="text-sm text-white/60">{t.settingsExtra.needHelpSubtitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setDialog('support')}
                        className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
                    >
                        {t.settingsExtra.sendEmail}
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
            <SupportDialog open={dialog === 'support'} onClose={() => setDialog(null)} />
            <LegalDialog kind={legal} onClose={() => setLegal(null)} />
            <ActiveSessionsDialog open={dialog === 'sessions'} userId={userId} onClose={() => setDialog(null)} />
            <ExportDataDialog open={dialog === 'export'} userId={userId} onClose={() => setDialog(null)} />
        </div>
    );
}
