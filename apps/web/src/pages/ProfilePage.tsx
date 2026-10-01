import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle2 } from 'lucide-react';
import Card, { CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import SkillsRadar from '../components/ui/SkillsRadar';
import { ErrorMessage, LoadingSpinner } from '../components/ui/Feedback';
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

function joinOr(values: string[] | undefined) {
    return values && values.length > 0 ? values.join(', ') : EMPTY;
}

// Fila etiqueta/valor de la tarjeta de información personal
function Field({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-0.5 min-w-0 sm:flex-row sm:items-baseline sm:gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
            <span className="text-sm text-gray-800 dark:text-gray-200 break-words">{value}</span>
        </div>
    );
}

// Lista numerada de las tarjetas laterales, como en el wireframe
function NumberedCard({
    title, items, actionLabel,
}: {
    title: string;
    items: { label: string; value: string }[];
    actionLabel: string;
}) {
    return (
        <Card>
            <CardHeader title={title} />
            <CardBody className="flex flex-col gap-3">
                <ol className="flex flex-col gap-2 list-decimal list-inside">
                    {items.map(({ label, value }) => (
                        <li key={label} className="text-xs text-gray-500 dark:text-gray-400 min-w-0">
                            <span className="font-medium">{label}</span>
                            <p className="text-sm text-gray-800 dark:text-gray-200 ml-5 break-words">{value}</p>
                        </li>
                    ))}
                </ol>
                {/* La edición todavía no está implementada en esta fase */}
                <Button variant="secondary" size="sm" disabled className="w-full">
                    {actionLabel}
                </Button>
            </CardBody>
        </Card>
    );
}

export default function ProfilePage() {
    const navigate = useNavigate();
    const { profile, loadingProfile, profileError, reloadProfile } = useAuth();

    const [skills, setSkills] = useState<SkillGapApiItem[]>([]);
    const [loadingSkills, setLoadingSkills] = useState(true);
    const [errorSkills, setErrorSkills] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        skillsGapService.getAll()
            .then(res => { if (!cancelled) setSkills(res.items); })
            .catch(() => { if (!cancelled) setErrorSkills('No se pudo cargar el análisis de habilidades.'); })
            .finally(() => { if (!cancelled) setLoadingSkills(false); });

        return () => { cancelled = true; };
    }, []);

    if (loadingProfile) return <LoadingSpinner />;
    if (profileError) return <ErrorMessage message={profileError} onRetry={reloadProfile} />;
    if (!profile) return <ErrorMessage message="No encontramos tu perfil." onRetry={reloadProfile} />;

    const availability = joinOr(profile.types?.map(t => availabilityLabel[t]));
    const modalities   = joinOr(profile.modalities?.map(m => modalityLabel[m]));
    const sectors      = joinOr(profile.sectors);
    const photo        = profile.photoUrl;

    return (
        // En móvil se apila; en escritorio son tres columnas y el radar pasa al medio
        <div className="flex flex-col gap-3 sm:gap-6 lg:flex-row lg:items-start">

            {/* Información personal */}
            <div className="order-1 lg:flex-1 lg:min-w-0">
                <Card>
                    <CardHeader title="Información Personal" />
                    <CardBody className="flex flex-col gap-4">

                        <div className="flex items-center gap-3 min-w-0">
                            {photo ? (
                                <img src={photo} alt={profile.name} className="w-16 h-16 rounded-full object-cover shrink-0" />
                            ) : (
                                <UserCircle2 size={64} className="text-gray-300 dark:text-gray-600 shrink-0" />
                            )}
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate sm:text-2xl">
                                {profile.name}
                            </h2>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Field label="Contacto"          value={profile.phone ?? profile.email} />
                            <Field label="Residencia"        value={profile.location || EMPTY} />
                            <Field label="Disponibilidad"    value={availability} />
                            <Field label="Sector de interés" value={sectors} />
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-4">
                            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                                {profile.bio ?? 'Todavía no hay una descripción en tu perfil.'}
                            </p>
                        </div>

                        <div className="flex justify-end">
                            {/* La edición todavía no está implementada en esta fase */}
                            <Button variant="secondary" size="sm" disabled>
                                Editar Perfil
                            </Button>
                        </div>

                    </CardBody>
                </Card>
            </div>

            {/* Análisis de habilidades */}
            <div className="order-3 lg:order-2 lg:w-72 lg:shrink-0">
                <Card>
                    <CardHeader title="Análisis de Habilidades" />
                    <CardBody className="flex flex-col items-center gap-3">
                        {loadingSkills ? (
                            <LoadingSpinner />
                        ) : errorSkills ? (
                            <p className="text-xs text-red-500 text-center py-4">{errorSkills}</p>
                        ) : skills.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-4">Aún no hay análisis de habilidades.</p>
                        ) : (
                            // SkillsRadar espera `name`; APIM devuelve `skillName`
                            <SkillsRadar
                                skills={skills.map(s => ({
                                    name: s.skillName,
                                    userLevel: s.userLevel,
                                    marketLevel: s.marketLevel,
                                }))}
                                size={200}
                            />
                        )}
                        <Button variant="secondary" size="sm" className="w-full" onClick={() => navigate('/skills-gap')}>
                            Ver Áreas de Mejora
                        </Button>
                    </CardBody>
                </Card>
            </div>

            {/* Contacto y preferencias */}
            <div className="order-2 grid grid-cols-2 gap-3 lg:order-3 lg:w-72 lg:shrink-0 lg:grid-cols-1 lg:gap-6">
                <NumberedCard
                    title="Datos de Contacto"
                    actionLabel="Editar Contacto"
                    items={[
                        { label: 'Número de teléfono', value: profile.phone ?? EMPTY },
                        { label: 'Correo Electrónico', value: profile.email },
                        { label: 'Residencia',         value: profile.location || EMPTY },
                    ]}
                />
                <NumberedCard
                    title="Preferencias"
                    actionLabel="Editar Preferencias"
                    items={[
                        { label: 'Sector de interés', value: sectors },
                        { label: 'Disponibilidad',    value: availability },
                        { label: 'Modalidad',         value: modalities },
                    ]}
                />
            </div>

        </div>
    );
}
