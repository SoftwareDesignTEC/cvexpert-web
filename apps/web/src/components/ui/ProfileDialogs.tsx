import { useEffect, useState } from 'react';
import Modal from './Modal';
import { ChipGroup, DialogActions, Field, TextArea } from './FormBits';
import Button from './Button';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profileService';
import { describeError } from '../../services/http';
import type { UserProfile } from '../../types/models';

// Como los de Configuración, estos formularios validan pero no envían nada todavía.

type Availability = UserProfile['types'][number];
type Modality = UserProfile['modalities'][number];

const AVAILABILITY_OPTIONS: { value: Availability; label: string }[] = [
    { value: 'full-time',  label: 'Tiempo completo' },
    { value: 'part-time',  label: 'Medio tiempo' },
    { value: 'freelance',  label: 'Freelance' },
    { value: 'internship', label: 'Práctica profesional' },
];

const MODALITY_OPTIONS: { value: Modality; label: string }[] = [
    { value: 'remote',  label: 'Remoto' },
    { value: 'on-site', label: 'Presencial' },
    { value: 'hybrid',  label: 'Híbrido' },
];

// Vuelve a cargar los valores del perfil cada vez que se abre el diálogo
function useResetOnOpen(open: boolean, reset: () => void) {
    useEffect(() => {
        if (open) reset();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);
}

// ── Editar perfil ─────────────────────────────────────────────────────────────
export function EditProfileDialog({
    open, onClose, profile,
}: {
    open: boolean;
    onClose: () => void;
    profile: UserProfile | null;
}) {
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [saved, setSaved] = useState(false);

    useResetOnOpen(open, () => {
        setName(profile?.name ?? '');
        setBio(profile?.bio ?? '');
        setPhotoUrl(profile?.photoUrl ?? '');
        setSaved(false);
    });

    const nameError = saved && name.trim().length < 3 ? 'Ingresá tu nombre completo.' : undefined;

    return (
        <Modal
            open={open}
            title="Editar Perfil"
            description="Así es como te ven las empresas."
            onClose={onClose}
        >
            <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); setSaved(true); }}>
                <Field
                    label="Nombre completo" value={name} onChange={setName}
                    error={nameError} placeholder="Nombre y apellidos"
                />
                <Field
                    label="Foto de perfil (URL)" type="url" value={photoUrl} onChange={setPhotoUrl}
                    placeholder="https://..."
                />
                <TextArea
                    label="Descripción" value={bio} onChange={setBio}
                    placeholder="Contá en pocas líneas a qué te dedicás y qué buscás."
                />
                <DialogActions onCancel={onClose} saved={saved && !nameError} />
            </form>
        </Modal>
    );
}

// ── Editar datos de contacto ──────────────────────────────────────────────────
export function EditContactDialog({
    open, onClose, profile,
}: {
    open: boolean;
    onClose: () => void;
    profile: UserProfile | null;
}) {
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [location, setLocation] = useState('');
    const [saved, setSaved] = useState(false);

    useResetOnOpen(open, () => {
        setPhone(profile?.phone ?? '');
        setEmail(profile?.email ?? '');
        setLocation(profile?.location ?? '');
        setSaved(false);
    });

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const errors = {
        email: saved && !emailOk ? 'Ingresá un correo electrónico válido.' : undefined,
        location: saved && !location.trim() ? 'Indicá dónde residís.' : undefined,
    };
    const valid = emailOk && location.trim().length > 0;

    return (
        <Modal
            open={open}
            title="Editar Contacto"
            description="Cómo pueden comunicarse con vos."
            onClose={onClose}
        >
            <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); setSaved(true); }}>
                <Field
                    label="Número de teléfono" type="tel" value={phone} onChange={setPhone}
                    placeholder="+506 0000-0000" autoComplete="tel"
                />
                <Field
                    label="Correo electrónico" type="email" value={email} onChange={setEmail}
                    error={errors.email} autoComplete="email"
                />
                <Field
                    label="Residencia" value={location} onChange={setLocation}
                    error={errors.location} placeholder="Ciudad, país"
                />
                <DialogActions onCancel={onClose} saved={saved && valid} />
            </form>
        </Modal>
    );
}

// ── Editar preferencias ───────────────────────────────────────────────────────
export function EditPreferencesDialog({
    open, onClose, profile,
}: {
    open: boolean;
    onClose: () => void;
    profile: UserProfile | null;
}) {
    const { userId, reloadProfile } = useAuth();
    const [types, setTypes] = useState<Availability[]>([]);
    const [modalities, setModalities] = useState<Modality[]>([]);
    const [intentado, setIntentado] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useResetOnOpen(open, () => {
        setTypes(profile?.types ?? []);
        setModalities(profile?.modalities ?? []);
        setIntentado(false);
        setGuardando(false);
        setError(null);
    });

    const toggle = <T extends string>(list: T[], value: T) =>
        list.includes(value) ? list.filter(v => v !== value) : [...list, value];

    const errors = {
        types: intentado && types.length === 0 ? 'Elegí al menos una disponibilidad.' : undefined,
        modalities: intentado && modalities.length === 0 ? 'Elegí al menos una modalidad.' : undefined,
    };
    const valid = types.length > 0 && modalities.length > 0;

    // A diferencia del resto de estos formularios, éste sí guarda: las
    // preferencias deciden qué ofertas se muestran primero, así que si no
    // viajaran al servidor no servirían para nada.
    const guardar = async (e: React.FormEvent) => {
        e.preventDefault();
        setIntentado(true);
        if (!valid || !userId) return;

        setGuardando(true);
        setError(null);
        try {
            await profileService.update(userId, { types, modalities });
            // El perfil vive en el contexto, así que se vuelve a pedir para que
            // las ofertas se reordenen con lo recién elegido.
            reloadProfile();
            onClose();
        } catch (err) {
            setError(describeError(err, 'guardar tus preferencias'));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal
            open={open}
            title="Editar Preferencias"
            description="Con esto decidimos qué ofertas mostrarte primero."
            onClose={onClose}
        >
            <form className="flex flex-col gap-4" onSubmit={guardar}>
                <div className="flex flex-col gap-1">
                    <ChipGroup
                        label="Disponibilidad"
                        options={AVAILABILITY_OPTIONS}
                        selected={types}
                        onToggle={v => setTypes(prev => toggle(prev, v))}
                    />
                    {errors.types && <p className="text-xs text-rose-500">{errors.types}</p>}
                </div>

                <div className="flex flex-col gap-1">
                    <ChipGroup
                        label="Modalidad"
                        options={MODALITY_OPTIONS}
                        selected={modalities}
                        onToggle={v => setModalities(prev => toggle(prev, v))}
                    />
                    {errors.modalities && <p className="text-xs text-rose-500">{errors.modalities}</p>}
                </div>

                {error && <p className="text-xs text-rose-500">{error}</p>}

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" size="sm" disabled={guardando}>
                        {guardando ? 'Guardando…' : 'Guardar cambios'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
