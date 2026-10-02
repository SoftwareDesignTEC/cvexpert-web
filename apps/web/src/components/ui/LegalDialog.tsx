import { useEffect, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { LoadingSpinner } from './Feedback';
import { legalService } from '../../services/legalService';
import type { LegalDocument, LegalKind } from '../../services/legalService';

function formatDate(iso?: string) {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? null
        : d.toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function LegalDialog({
    kind, onClose,
}: {
    kind: LegalKind | null;
    onClose: () => void;
}) {
    const [doc, setDoc] = useState<LegalDocument | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Se pide al abrir: no hace falta cargarlo con la página
    useEffect(() => {
        if (!kind) return;
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            setDoc(null);
            try {
                const res = await legalService.get(kind);
                if (!cancelled) setDoc(res);
            } catch {
                if (!cancelled) setError('No se pudo cargar el documento.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();

        return () => { cancelled = true; };
    }, [kind]);

    const effective = formatDate(doc?.effectiveDate);

    return (
        <Modal
            open={kind !== null}
            size="lg"
            title={doc?.title ?? (kind === 'privacy' ? 'Políticas de Privacidad' : 'Términos y Condiciones')}
            description={doc ? `Versión ${doc.version}${effective ? ` · vigente desde el ${effective}` : ''}` : undefined}
            onClose={onClose}
        >
            <div className="flex flex-col gap-4">
                {loading ? (
                    <LoadingSpinner />
                ) : error ? (
                    <p className="text-sm text-rose-500">{error}</p>
                ) : (
                    <p className="text-sm text-body dark:text-gray-300 whitespace-pre-line leading-relaxed">
                        {doc?.content}
                    </p>
                )}

                <div className="flex justify-end">
                    <Button variant="secondary" size="sm" onClick={onClose}>Cerrar</Button>
                </div>
            </div>
        </Modal>
    );
}
