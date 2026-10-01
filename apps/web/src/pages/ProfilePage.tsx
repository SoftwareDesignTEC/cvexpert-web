import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, UserCircle2 } from 'lucide-react';
import Button from '../components/ui/Button';
import PageHeader from '../components/ui/PageHeader';
import SkillsRadar from '../components/ui/SkillsRadar';
import { LoadingSpinner } from '../components/ui/Feedback';
import { EditContactDialog, EditPreferencesDialog, EditProfileDialog } from '../components/ui/ProfileDialogs';
import { useAuth } from '../context/AuthContext';
import { skillsGapService } from '../services/skillsGapService';
import type { SkillGapApiItem } from '../services/skillsGapService';
import type { UserProfile } from '../types/models';

// Etiquetas en español de los enums que devuelve APIM
const availabilityLabel: Record<UserProfile['types'][number], string> = {
    'full-time':  'Tiempo completo',
    'part-time':  'Medio tiempo',
    'freelance':  'Freelance',
    'internship': 'Práctica profesional',
};

const modalityLabel: Record<UserProfile['modalities'][number], string> = {
    'remote':  'Remoto',
    'on-site': 'Presencial',
    'hybrid':  'Híbrido',
};

const EMPTY = 'No especificado';

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
    const navigate = useNavigate();
    const { profile, loadingProfile, profileError, reloadProfile } = useAuth();
    const [dialog, setDialog] = useState<OpenDialog>(null);

    const [skills, setSkills] = useState<SkillGapApiItem[]>([]);
    const [loadingSkills, setLoadingSkills] = useState(true);
    const [errorSkills, setErrorSkills] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoadingSkills(true);
            setErrorSkills(null);
            try {
                const res = await skillsGapService.getAll();
                if (!cancelled) setSkills(res.items);
            } catch {
                if (!cancelled) setErrorSkills('No se pudo cargar el análisis de habilidades.');
            } finally {
                if (!cancelled) setLoadingSkills(false);
            }
        };
        load();

        return () => { cancelled = true; };
    }, []);

    if (loadingProfile) return <LoadingSpinner />;

    // Si el perfil no llega, la pantalla se dibuja igual con los campos vacíos y un
    // aviso arriba: es más útil que una pantalla en blanco, y el análisis de
    // habilidades no depende del perfil, así que puede mostrarse de todos modos.
    const availability = profile?.types?.map(t => availabilityLabel[t]) ?? [];
    const modalities   = profile?.modalities?.map(m => modalityLabel[m]) ?? [];
    const sectors      = profile?.sectors ?? [];
    const joined       = (values: string[]) => (values.length > 0 ? values.join(', ') : EMPTY);

    return (
        <div className="flex flex-col gap-4 sm:gap-6">

            <PageHeader eyebrow="Perfil profesional" title="Información Personal" />

            {(profileError || !profile) && (
                <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
                    <AlertCircle size={18} className="text-amber-500 shrink-0" />
                    <p className="flex-1 text-sm text-amber-800 dark:text-amber-200">
                        {profileError ?? 'No encontramos tu perfil.'}
                    </p>
                    <button
                        onClick={reloadProfile}
                        className="text-sm font-medium text-amber-800 dark:text-amber-200 hover:underline shrink-0"
                    >
                        Reintentar
                    </button>
                </div>
            )}

            {/* En móvil se apila; en escritorio son tres columnas y el radar va al medio */}
            <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-start">

                {/* Información personal */}
                <div className="order-1 lg:flex-1 lg:min-w-0">
                    <Panel title="Información Personal">
                        <div className="flex items-center gap-4 min-w-0">
                            {profile?.photoUrl ? (
                                <img
                                    src={profile.photoUrl}
                                    alt={profile.name}
                                    className="w-16 h-16 rounded-full object-cover shrink-0"
                                />
                            ) : (
                                <UserCircle2 size={64} className="text-gray-300 dark:text-gray-700 shrink-0" />
                            )}
                            <div className="min-w-0">
                                <h3 className="text-xl font-bold text-ink dark:text-white truncate sm:text-2xl">
                                    {profile?.name ?? EMPTY}
                                </h3>
                                <p className="text-sm text-muted truncate">{profile?.email ?? ''}</p>
                            </div>
                        </div>

                        {/* Cada dato del perfil, en su etiqueta */}
                        <div className="flex flex-wrap gap-2">
                            {profile?.location && <Chip value={profile.location} />}
                            {availability.map(v => <Chip key={v} value={v} />)}
                            {modalities.map(v => <Chip key={v} value={v} />)}
                            {sectors.map(v => <Chip key={v} value={v} />)}
                        </div>

                        <div className="rounded-xl bg-canvas/70 dark:bg-gray-800/60 p-4">
                            <p className="text-sm text-body dark:text-gray-300 whitespace-pre-line">
                                {profile?.bio ?? 'Todavía no hay una descripción en tu perfil.'}
                            </p>
                        </div>

                        <div>
                            <Button size="sm" onClick={() => setDialog('profile')}>Editar Perfil</Button>
                        </div>
                    </Panel>
                </div>

                {/* Análisis de habilidades */}
                <div className="order-3 lg:order-2 lg:w-80 lg:shrink-0">
                    <Panel title="Análisis de Habilidades">
                        {loadingSkills ? (
                            <LoadingSpinner />
                        ) : errorSkills ? (
                            <p className="text-xs text-red-500 text-center py-4">{errorSkills}</p>
                        ) : skills.length === 0 ? (
                            <p className="text-xs text-muted text-center py-4">Aún no hay análisis de habilidades.</p>
                        ) : (
                            <div className="flex justify-center">
                                {/* SkillsRadar espera `name`; APIM devuelve `skillName` */}
                                <SkillsRadar
                                    skills={skills.map(s => ({
                                        name: s.skillName,
                                        userLevel: s.userLevel,
                                        marketLevel: s.marketLevel,
                                    }))}
                                    size={200}
                                />
                            </div>
                        )}
                        <Button
                            variant="secondary"
                            size="sm"
                            className="w-full"
                            onClick={() => navigate('/skills-gap')}
                        >
                            Ver Áreas de Mejora
                        </Button>
                    </Panel>
                </div>

                {/* Contacto y preferencias */}
                <div className="order-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:order-3 lg:w-72 lg:shrink-0 lg:grid-cols-1 lg:gap-6">
                    <Panel title="Datos de Contacto">
                        <DataList
                            onEdit={() => setDialog('contact')}
                            actionLabel="Editar Contacto"
                            items={[
                                { label: 'Número de teléfono', value: profile?.phone ?? EMPTY },
                                { label: 'Correo Electrónico', value: profile?.email ?? EMPTY },
                                { label: 'Residencia',         value: profile?.location || EMPTY },
                            ]}
                        />
                    </Panel>
                    <Panel title="Preferencias">
                        <DataList
                            onEdit={() => setDialog('preferences')}
                            actionLabel="Editar Preferencias"
                            items={[
                                { label: 'Sector de interés', value: joined(sectors) },
                                { label: 'Disponibilidad',    value: joined(availability) },
                                { label: 'Modalidad',         value: joined(modalities) },
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
