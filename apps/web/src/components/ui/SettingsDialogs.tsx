import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import { DialogActions, Field } from './FormBits';
import { useLocale } from '../../i18n/LocaleContext';

// Nada de esto llega al APIM: los formularios validan en el navegador y al enviar
// avisan que la acción todavía no está disponible. La validación igual es real,
// para que la pantalla se comporte como se va a comportar cuando exista el endpoint.
const MIN_PASSWORD = 8;

// ── Cambiar contraseña ────────────────────────────────────────────────────────
export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { t } = useLocale();
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [sent, setSent] = useState(false);

    const errors = {
        current: sent && !current ? t.forms.currentPasswordError : undefined,
        next: sent && next.length < MIN_PASSWORD ? `Usá al menos ${MIN_PASSWORD} caracteres.` : undefined,
        confirm: sent && confirm !== next ? t.forms.passwordMismatch : undefined,
    };
    const valid = current.length > 0 && next.length >= MIN_PASSWORD && confirm === next;

    const close = () => {
        setCurrent(''); setNext(''); setConfirm(''); setSent(false);
        onClose();
    };

    return (
        <Modal
            open={open}
            title={t.forms.changePassword}
            description={t.forms.changePasswordDesc}
            onClose={close}
        >
            <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); setSent(true); }}>
                <Field
                    label={t.forms.currentPassword} type="password" autoComplete="current-password"
                    value={current} onChange={setCurrent} error={errors.current}
                />
                <Field
                    label={t.forms.newPassword} type="password" autoComplete="new-password"
                    value={next} onChange={setNext} error={errors.next}
                    placeholder={`Mínimo ${MIN_PASSWORD} caracteres`}
                />
                <Field
                    label={t.forms.confirmPassword} type="password" autoComplete="new-password"
                    value={confirm} onChange={setConfirm} error={errors.confirm}
                />
                <DialogActions onCancel={close} saved={sent && valid} />
            </form>
        </Modal>
    );
}

// ── Cambiar correo electrónico ────────────────────────────────────────────────
export function ChangeEmailDialog({
    open, onClose, currentEmail,
}: {
    open: boolean;
    onClose: () => void;
    currentEmail?: string;
}) {
    const { t } = useLocale();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [sent, setSent] = useState(false);

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const errors = {
        email: sent && !emailOk ? t.forms.emailError : undefined,
        password: sent && !password ? t.forms.passwordConfirmError : undefined,
    };
    const valid = emailOk && password.length > 0;

    const close = () => {
        setEmail(''); setPassword(''); setSent(false);
        onClose();
    };

    return (
        <Modal
            open={open}
            title={t.forms.changeEmail}
            description={t.forms.changeEmailDesc}
            onClose={close}
        >
            <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); setSent(true); }}>
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-body dark:text-gray-300">{t.forms.currentEmail}</label>
                    <p className="rounded-xl border border-line dark:border-gray-700 bg-canvas/60 dark:bg-gray-800/60 px-3 py-2.5 text-sm text-muted truncate">
                        {currentEmail ?? t.forms.unavailable}
                    </p>
                </div>

                <Field
                    label={t.forms.newEmail} type="email" autoComplete="email"
                    value={email} onChange={setEmail} error={errors.email}
                    placeholder="nombre@correo.com"
                />
                <Field
                    label={t.forms.password} type="password" autoComplete="current-password"
                    value={password} onChange={setPassword} error={errors.password}
                />
                <DialogActions onCancel={close} saved={sent && valid} />
            </form>
        </Modal>
    );
}

// ── Eliminar cuenta ───────────────────────────────────────────────────────────
export function DeleteAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { t } = useLocale();
    const [word, setWord] = useState('');
    const [sent, setSent] = useState(false);

    // La palabra a escribir cambia con el idioma, así que se lee del
    // diccionario en vez de ser una constante del archivo.
    const confirmWord = t.forms.deleteConfirmWord;
    const valid = word.trim().toUpperCase() === confirmWord;
    const error = sent && !valid
        ? t.forms.deleteConfirmLabel.replace('{palabra}', confirmWord)
        : undefined;

    const close = () => {
        setWord(''); setSent(false);
        onClose();
    };

    return (
        <Modal
            open={open}
            title={t.forms.deleteAccount}
            description={t.forms.deleteAccountDesc}
            onClose={close}
        >
            <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); setSent(true); }}>
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 dark:border-rose-900/50 dark:bg-rose-950/20">
                    <AlertTriangle size={15} className="text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                        {t.forms.deleteWarning}
                    </p>
                </div>

                <Field
                    label={t.forms.deleteConfirmLabel.replace('{palabra}', t.forms.deleteConfirmWord)}
                    value={word} onChange={setWord} error={error}
                    placeholder={t.forms.deleteConfirmWord}
                />
                <DialogActions onCancel={close} saved={sent && valid} submitLabel={t.forms.deleteSubmit} danger />
            </form>
        </Modal>
    );
}
