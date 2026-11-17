import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import PageHeader from '../components/ui/PageHeader';
import { LoadingSpinner } from '../components/ui/Feedback';
import { EditContactDialog, EditPreferencesDialog, EditProfileDialog } from '../components/ui/ProfileDialogs';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../i18n/LocaleContext';


// Tarjeta blanca con el título acentuado en azul, como en los mockups
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-surface dark:bg-gray-900 border border-line dark:border-gray-800 rounded-2xl shadow-sm p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-primary shrink-0" />
                <h2 className="text-base font-bold text-ink dark:text-white">{title}</h2>
            </div>
            {children}
        </div>
    );
}

// Dato del perfil como etiqueta azul
function Chip({ value }: { value: string }) {
    return (
        <span className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary-dark dark:bg-primary/15 dark:text-primary">
            {value}
        </span>
    );
}

// Lista de datos de las tarjetas laterales
function DataList({
    items, actionLabel, onEdit,
}: {
    items: { label: string; value: string }[];
    actionLabel: string;
    onEdit: () => void;
}) {
    return (
        <>
            <ul className="flex flex-col gap-3">
                {items.map(({ label, value }) => (
                    <li key={label} className="min-w-0">
                        <span className="block text-xs text-muted">{label}</span>
                        <span className="block text-sm text-ink dark:text-gray-200 break-words">{value}</span>
                    </li>
                ))}
            </ul>
            <Button variant="secondary" size="sm" className="w-full" onClick={onEdit}>
                {actionLabel}
            </Button>
        </>
    );
}

type OpenDialog = 'profile' | 'contact' | 'preferences' | null;

export default function ProfilePage() {
    const { profile, loadingProfile, profileError, reloadProfile } = useAuth();
    const { t } = useLocale();
    const [dialog, setDialog] = useState<OpenDialog>(null);

    if (loadingProfile) return <LoadingSpinner />;

    // Si el perfil no llega, se conservan los campos vacíos y se muestra un
    // aviso para reintentar la carga sin dejar la pantalla en blanco.
    const availability = profile?.types?.map(v => t.availability[v]) ?? [];
    const modalities   = profile?.modalities?.map(m => t.modality[m]) ?? [];
    const joined       = (values: string[]) =>
        (values.length > 0 ? values.join(', ') : t.profile.notSpecified);

    return (
        <div className="flex flex-col gap-4 sm:gap-6">

            <PageHeader eyebrow={t.profile.eyebrow} title={t.profile.title} />

            {(profileError || !profile) && (
                <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
                    <AlertCircle size={18} className="text-amber-500 shrink-0" />
                    <p className="flex-1 text-sm text-amber-800 dark:text-amber-200">
                        {profileError ?? t.profile.notFound}
                    </p>
                    <button
                        onClick={reloadProfile}
                        className="text-sm font-medium text-amber-800 dark:text-amber-200 hover:underline shrink-0"
                    >
                        Reintentar
                    </button>
                </div>
            )}

            {/* En móvil se apila; en escritorio se muestran perfil y datos complementarios */}
            <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-start">

                {/* Información personal */}
                <div className="lg:flex-1 lg:min-w-0">
                    <Panel title={t.profile.personalInfo}>
                        <div className="flex items-center gap-4 min-w-0">
                            <Avatar src={profile?.photoUrl} name={profile?.name} size={64} />
                            <div className="min-w-0">
                                <h3 className="text-xl font-bold text-ink dark:text-white truncate sm:text-2xl">
                                    {profile?.name ?? t.profile.notSpecified}
                                </h3>
                                <p className="text-sm text-muted truncate">{profile?.email ?? ''}</p>
                            </div>
                        </div>

                        {/* Cada dato del perfil, en su etiqueta */}
                        <div className="flex flex-wrap gap-2">
                            {profile?.location && <Chip value={profile.location} />}
                            {availability.map(v => <Chip key={v} value={v} />)}
                            {modalities.map(v => <Chip key={v} value={v} />)}
                        </div>

                        <div className="rounded-xl bg-canvas/70 dark:bg-gray-800/60 p-4">
                            <p className="text-sm text-body dark:text-gray-300 whitespace-pre-line">
                                {profile?.bio ?? t.profile.noBio}
                            </p>
                        </div>

                        <div>
                            <Button size="sm" onClick={() => setDialog('profile')}>{t.profile.editProfile}</Button>
                        </div>
                    </Panel>
                </div>

                {/* Contacto y preferencias */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:w-72 lg:shrink-0 lg:grid-cols-1 lg:gap-6">
                    <Panel title={t.profile.contact}>
                        <DataList
                            onEdit={() => setDialog('contact')}
                            actionLabel={t.profile.editContact}
                            items={[
                                { label: t.profile.phone,     value: profile?.phone ?? t.profile.notSpecified },
                                { label: t.profile.email,     value: profile?.email ?? t.profile.notSpecified },
                                { label: t.profile.residence, value: profile?.location || t.profile.notSpecified },
                            ]}
                        />
                    </Panel>
                    <Panel title={t.profile.preferences}>
                        <DataList
                            onEdit={() => setDialog('preferences')}
                            actionLabel={t.profile.editPreferences}
                            items={[
                                { label: t.profile.availability, value: joined(availability) },
                                { label: t.profile.modality,     value: joined(modalities) },
                            ]}
                        />
                    </Panel>
                </div>

            </div>

            <EditProfileDialog open={dialog === 'profile'} onClose={() => setDialog(null)} profile={profile} />
            <EditContactDialog open={dialog === 'contact'} onClose={() => setDialog(null)} profile={profile} />
            <EditPreferencesDialog open={dialog === 'preferences'} onClose={() => setDialog(null)} profile={profile} />
        </div>
    );
}
