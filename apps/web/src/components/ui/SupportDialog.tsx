import { useEffect, useState } from 'react';
import { Check, Copy, Mail } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { LoadingSpinner } from './Feedback';
import { contactService } from '../../services/contactService';
import type { SupportContact } from '../../services/contactService';

function ContactRow({ contact }: { contact: SupportContact }) {
    const [copied, setCopied] = useState(false);

    // El aviso de "copiado" vuelve solo a su estado normal
    useEffect(() => {
        if (!copied) return;
        const t = setTimeout(() => setCopied(false), 1800);
        return () => clearTimeout(t);
    }, [copied]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(contact.email);
            setCopied(true);
        } catch {
            // Algunos navegadores bloquean el portapapeles sin permiso; el correo
            // igual queda visible para copiarlo a mano.
        }
    };

    return (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line dark:border-gray-800 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-lg bg-primary-tint text-primary flex items-center justify-center shrink-0 dark:bg-primary/15">
                    <Mail size={16} />
                </span>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-ink dark:text-gray-100 truncate">{contact.label}</p>
                    <p className="text-xs text-muted truncate">{contact.email}</p>
                </div>
            </div>
            <button
                onClick={copy}
                title="Copiar dirección"
                aria-label={`Copiar ${contact.email}`}
                className="shrink-0 rounded-lg p-2 text-muted hover:bg-canvas hover:text-primary dark:hover:bg-gray-800 transition-colors"
            >
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
            </button>
        </div>
    );
}

export default function SupportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [contacts, setContacts] = useState<SupportContact[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Se piden al abrir, no al cargar la página: no hacen falta hasta entonces
    useEffect(() => {
        if (!open) return;
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await contactService.getAll();
                if (!cancelled) setContacts(res);
            } catch {
                if (!cancelled) setError('No se pudieron cargar los contactos de soporte.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();

        return () => { cancelled = true; };
    }, [open]);

    return (
        <Modal
            open={open}
            title="Contactar a soporte"
            description="Escribinos a la dirección que corresponda según tu consulta."
            onClose={onClose}
        >
            <div className="flex flex-col gap-4">
                {loading ? (
                    <LoadingSpinner />
                ) : error ? (
                    <p className="text-sm text-rose-500">{error}</p>
                ) : contacts.length === 0 ? (
                    <p className="text-sm text-muted">No hay contactos disponibles por ahora.</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {contacts.map(c => <ContactRow key={c.type} contact={c} />)}
                    </div>
                )}

                <div className="flex justify-end">
                    <Button variant="secondary" size="sm" onClick={onClose}>Cerrar</Button>
                </div>
            </div>
        </Modal>
    );
}
