import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import { DialogActions, Field } from './FormBits';

// Nada de esto llega al APIM: los formularios validan en el navegador y al enviar
// avisan que la acción todavía no está disponible. La validación igual es real,
// para que la pantalla se comporte como se va a comportar cuando exista el endpoint.
const MIN_PASSWORD = 8;
const CONFIRM_WORD = 'ELIMINAR';

// ── Cambiar contraseña ────────────────────────────────────────────────────────
export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [sent, setSent] = useState(false);

    const errors = {
        current: sent && !current ? 'Ingresá tu contraseña actual.' : undefined,
        next: sent && next.length < MIN_PASSWORD ? `Usá al menos ${MIN_PASSWORD} caracteres.` : undefined,
        confirm: sent && confirm !== next ? 'Las contraseñas no coinciden.' : undefined,
    };
    const valid = current.length > 0 && next.length >= MIN_PASSWORD && confirm === next;

    const close = () => {
        setCurrent(''); setNext(''); setConfirm(''); setSent(false);
        onClose();
    };

    return (
        <Modal
            open={open}
            title="Cambiar Contraseña"
            description="Elegí una contraseña nueva para tu cuenta."
            onClose={close}
        >
            <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); setSent(true); }}>
                <Field
                    label="Contraseña actual" type="password" autoComplete="current-password"
                    value={current} onChange={setCurrent} error={errors.current}
                />
                <Field
                    label="Nueva contraseña" type="password" autoComplete="new-password"
                    value={next} onChange={setNext} error={errors.next}
                    placeholder={`Mínimo ${MIN_PASSWORD} caracteres`}
                />
                <Field
                    label="Confirmar nueva contraseña" type="password" autoComplete="new-password"
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
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [sent, setSent] = useState(false);

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const errors = {
        email: sent && !emailOk ? 'Ingresá un correo electrónico válido.' : undefined,
        password: sent && !password ? 'Confirmá con tu contraseña.' : undefined,
    };
    const valid = emailOk && password.length > 0;

    const close = () => {
        setEmail(''); setPassword(''); setSent(false);
        onClose();
    };

    return (
        <Modal
            open={open}
            title="Cambiar Correo Electrónico"
            description="Te enviaremos un enlace de confirmación a la dirección nueva."
            onClose={close}
        >
            <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); setSent(true); }}>
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-body dark:text-gray-300">Correo actual</label>
                    <p className="rounded-xl border border-line dark:border-gray-700 bg-canvas/60 dark:bg-gray-800/60 px-3 py-2.5 text-sm text-muted truncate">
                        {currentEmail ?? 'No disponible'}
                    </p>
                </div>

                <Field
                    label="Nuevo correo electrónico" type="email" autoComplete="email"
                    value={email} onChange={setEmail} error={errors.email}
                    placeholder="nombre@correo.com"
                />
                <Field
                    label="Contraseña" type="password" autoComplete="current-password"
                    value={password} onChange={setPassword} error={errors.password}
                />
                <DialogActions onCancel={close} saved={sent && valid} />
            </form>
        </Modal>
    );
}

// ── Eliminar cuenta ───────────────────────────────────────────────────────────
export function DeleteAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [word, setWord] = useState('');
    const [sent, setSent] = useState(false);

    const valid = word.trim().toUpperCase() === CONFIRM_WORD;
    const error = sent && !valid ? `Escribí ${CONFIRM_WORD} para confirmar.` : undefined;

    const close = () => {
        setWord(''); setSent(false);
        onClose();
    };

    return (
        <Modal
            open={open}
            title="Eliminar Cuenta"
            description="Esta acción no se puede deshacer."
            onClose={close}
        >
            <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); setSent(true); }}>
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 dark:border-rose-900/50 dark:bg-rose-950/20">
                    <AlertTriangle size={15} className="text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                        Se eliminarán tus currículums, tus postulaciones y tu perfil. No vas a poder recuperarlos.
                    </p>
                </div>

                <Field
                    label={`Escribí ${CONFIRM_WORD} para confirmar`}
                    value={word} onChange={setWord} error={error}
                    placeholder={CONFIRM_WORD}
                />
                <DialogActions onCancel={close} saved={sent && valid} submitLabel="Eliminar mi cuenta" danger />
            </form>
        </Modal>
    );
}
