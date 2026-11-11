import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Field } from './ListEditor';
import DictatableTextArea from './DictatableTextArea';
import { aiService } from '../../services/aiService';
import { describeError } from '../../services/http';
import type { CV, CVTemplate } from '../../types/models';

const EJEMPLO =
    'Contá todo lo que hiciste: dónde trabajaste y de qué, qué estudiaste y ' +
    'dónde, qué sabés hacer, qué idiomas hablás. No importa el orden ni la ' +
    'redacción, de eso nos encargamos nosotros.';

/** Un título distinto por currículum, para no tener varios iguales en la lista. */
function tituloPorDefecto(): string {
    const hoy = new Date().toLocaleDateString('es-CR', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
    return `Currículum ${hoy}`;
}

export default function AiCvDialog({
    open, templates, defaultFullName, onClose, onCreated,
}: {
    open: boolean;
    templates: CVTemplate[];
    defaultFullName?: string;
    onClose: () => void;
    /** Devuelve el CV ya creado, para abrirlo en el editor */
    onCreated: (cv: CV) => void;
}) {
    const [fullName, setFullName] = useState(defaultFullName ?? '');
    const [phone, setPhone] = useState('');
    const [freeText, setFreeText] = useState('');
    const [working, setWorking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sólo se piden nombre y teléfono: el título y la plantilla se asignan
    // solos y se cambian después en el editor, que es donde se ve el resultado.
    const templateId = templates[0]?.id ?? '';
    const canGenerate = fullName.trim() !== '' && freeText.trim().length > 30
        && templateId !== '' && !working;

    const generate = async () => {
        setWorking(true);
        setError(null);
        try {
            const cv = await aiService.generateCv({
                title: tituloPorDefecto(),
                templateId,
                fullName: fullName.trim(),
                phone: phone.trim() || undefined,
                freeText: freeText.trim(),
                language: 'es',
            });
            onCreated(cv);
        } catch (err) {
            setError(describeError(err, 'generar tu currículum'));
        } finally {
            setWorking(false);
        }
    };

    return (
        <Modal
            open={open}
            size="lg"
            title="Crear con IA"
            description="Contanos tu historia y armamos el currículum por vos."
            onClose={onClose}
        >
            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Field
                        spec={{ key: 'fullName', label: 'Nombre completo', kind: 'text', required: true }}
                        value={fullName}
                        onChange={v => setFullName(String(v))}
                    />
                    <Field
                        spec={{ key: 'phone', label: 'Teléfono', kind: 'text' }}
                        value={phone}
                        onChange={v => setPhone(String(v))}
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-medium text-body dark:text-gray-300">
                        Tu experiencia
                        <span className="ml-1.5 whitespace-nowrap text-[10px] text-muted">
                            <span className="text-rose-500">●</span> Obligatorio
                        </span>
                    </span>
                    <DictatableTextArea
                        value={freeText}
                        onChange={setFreeText}
                        rows={9}
                        placeholder={EJEMPLO}
                    />
                    <p className="text-[11px] text-muted">
                        Podés dictarlo con el micrófono. Cuanto más cuentes, mejor queda.
                    </p>
                </div>

                {working && (
                    <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary-tint px-3 py-2.5 dark:border-primary/30 dark:bg-primary/10">
                        <Sparkles size={15} className="shrink-0 animate-pulse text-primary" />
                        <p className="text-xs text-body dark:text-gray-300">
                            Estamos armando tu currículum. Puede tardar unos segundos; no cierres esta ventana.
                        </p>
                    </div>
                )}

                {error && <p className="text-sm text-rose-500">{error}</p>}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    {!canGenerate && !working && (
                        <p className="text-xs text-muted sm:mr-auto">
                            {fullName.trim() === ''
                                ? 'Falta completar el nombre.'
                                : 'Contanos un poco más para poder armarlo.'}
                        </p>
                    )}
                    <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={working}>
                        Cancelar
                    </Button>
                    <Button type="button" size="sm" onClick={generate} disabled={!canGenerate}>
                        <Sparkles size={14} />
                        {working ? 'Generando…' : 'Generar currículum'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
