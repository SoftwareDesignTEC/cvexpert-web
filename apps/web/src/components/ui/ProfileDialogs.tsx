import { useEffect, useState } from 'react';
import Modal from './Modal';
import { ChipGroup, DialogActions, Field, TextArea } from './FormBits';
import Button from './Button';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../i18n/LocaleContext';
import { profileService } from '../../services/profileService';
import { describeError } from '../../services/http';
import type { UserProfile } from '../../types/models';

// Como los de Configuración, estos formularios validan pero no envían nada todavía.

type Availability = UserProfile['types'][number];
type Modality = UserProfile['modalities'][number];

const AVAILABILITY_VALUES: Availability[] = ['full-time', 'part-time', 'freelance', 'internship'];
const MODALITY_VALUES: Modality[] = ['remote', 'on-site', 'hybrid'];

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
    const { t } = useLocale();
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

    const nameError = saved && name.trim().length < 3 ? t.forms.fullNameError : undefined;

    return (
        <Modal
            open={open}
            title={t.forms.editProfile}
            description={t.forms.editProfileDesc}
            onClose={onClose}
        >
            <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); setSaved(true); }}>
                <Field
                    label={t.forms.fullName} value={name} onChange={setName}
                    error={nameError} placeholder={t.forms.fullNamePlaceholder}
                />
                <Field
                    label={t.forms.photoUrl} type="url" value={photoUrl} onChange={setPhotoUrl}
                    placeholder="https://..."
                />
                <TextArea
                    label={t.forms.bio} value={bio} onChange={setBio}
                    placeholder={t.forms.bioPlaceholder}
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
    const { t } = useLocale();
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
        email: saved && !emailOk ? t.forms.emailError : undefined,
        location: saved && !location.trim() ? t.forms.residenceError : undefined,
    };
    const valid = emailOk && location.trim().length > 0;

    return (
        <Modal
            open={open}
            title={t.forms.editContact}
            description={t.forms.editContactDesc}
            onClose={onClose}
        >
            <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); setSaved(true); }}>
                <Field
                    label={t.forms.phone} type="tel" value={phone} onChange={setPhone}
                    placeholder="+506 0000-0000" autoComplete="tel"
                />
                <Field
                    label={t.forms.email} type="email" value={email} onChange={setEmail}
                    error={errors.email} autoComplete="email"
                />
                <Field
                    label={t.forms.residence} value={location} onChange={setLocation}
                    error={errors.location} placeholder={t.forms.residencePlaceholder}
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
    const { t } = useLocale();
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
        types: intentado && types.length === 0 ? t.forms.availabilityError : undefined,
        modalities: intentado && modalities.length === 0 ? t.forms.modalityError : undefined,
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
            setError(describeError(err, t.forms.savePrefsError));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal
            open={open}
            title={t.forms.editPreferences}
            description={t.forms.editPreferencesDesc}
            onClose={onClose}
        >
            <form className="flex flex-col gap-4" onSubmit={guardar}>
                <div className="flex flex-col gap-1">
                    <ChipGroup
                        label={t.forms.availability}
                        options={AVAILABILITY_VALUES.map(v => ({ value: v, label: t.availability[v] }))}
                        selected={types}
                        onToggle={v => setTypes(prev => toggle(prev, v))}
                    />
                    {errors.types && <p className="text-xs text-rose-500">{errors.types}</p>}
                </div>

                <div className="flex flex-col gap-1">
                    <ChipGroup
                        label={t.forms.modality}
                        options={MODALITY_VALUES.map(v => ({ value: v, label: t.modality[v] }))}
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
                        {guardando ? t.common.saving : t.common.save}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
