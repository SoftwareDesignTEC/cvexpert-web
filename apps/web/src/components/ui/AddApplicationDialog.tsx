import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, RefreshCw } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import Badge from './Badge';
import { CompanyLogo } from './Avatar';
import { ErrorMessage, LoadingSpinner } from './Feedback';
import { jobService } from '../../services/otherServices';
import { describeError } from '../../services/http';
import type { JobOffer } from '../../types/models';

// Cuántas se muestran a la vez. Son pocas a propósito: esto es un atajo para
// agregar una postulación sin salir del tablero, no un reemplazo de la pantalla
// de ofertas, que tiene búsqueda y filtros.
const VISIBLES = 4;

// Se piden más de las que se muestran para que "Mostrar otras" tenga de dónde
// sacar sin volver a pedirle nada al servidor cada vez.
const A_PEDIR = 40;

const modalityLabel: Record<JobOffer['modality'], string> = {
    remote: 'Remoto',
    'on-site': 'Presencial',
    hybrid: 'Híbrido',
};

/**
 * Ordena las ofertas por compatibilidad cuando el servicio la manda.
 *
 * Las que traen puntaje van primero, de mayor a menor. Las que no lo traen van
 * después y en orden aleatorio: sin un criterio para ordenarlas, mostrar
 * siempre las mismas primeras sería arbitrario y además haría que el botón de
 * mostrar otras no sirviera de nada.
 */
function ordenar(ofertas: JobOffer[]): JobOffer[] {
    const con = ofertas.filter(o => typeof o.matchScore === 'number');
    const sin = ofertas.filter(o => typeof o.matchScore !== 'number');

    con.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

    for (let i = sin.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sin[i], sin[j]] = [sin[j], sin[i]];
    }

    return [...con, ...sin];
}

/**
 * Atajo para agregar una postulación desde el tablero.
 *
 * Muestra unas pocas ofertas, las más compatibles si el servicio calcula ese
 * dato, y deja elegir una. Al elegirla se abre el detalle de siempre, que es
 * donde se decide en qué columna queda: duplicar esa decisión acá habría
 * significado dos lugares distintos para lo mismo.
 */
export default function AddApplicationDialog({ onClose, onPick }: {
    onClose: () => void;
    onPick: (job: JobOffer) => void;
}) {
    const navigate = useNavigate();
    const [ofertas, setOfertas] = useState<JobOffer[]>([]);
    const [desde, setDesde] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Cambiarlo vuelve a disparar la petición. Hace falta porque el efecto no
    // puede tocar el estado antes de empezar, así que el botón no llama a la
    // carga: pide otra ronda y el efecto se encarga.
    const [ronda, setRonda] = useState(0);

    // El diálogo se monta al abrirse, así que esto corre en cada apertura. Es lo
    // que se quiere: entre una y otra pueden haber aparecido ofertas nuevas.
    useEffect(() => {
        let vivo = true;
        jobService.getAll({ page: 1, pageSize: A_PEDIR, search: '' })
            .then(res => {
                if (!vivo) return;
                setOfertas(ordenar(res.items ?? []));
                setDesde(0);
                setError(null);
            })
            .catch(err => { if (vivo) setError(describeError(err, 'traer las ofertas')); })
            .finally(() => { if (vivo) setLoading(false); });

        // Si se cierra mientras la petición viaja, no se toca más el estado
        return () => { vivo = false; };
    }, [ronda]);

    const recargar = () => { setLoading(true); setRonda(n => n + 1); };

    // Avanza dentro de lo ya traído y vuelve al principio al llegar al final.
    // Sólo se vuelve a pedir al servidor si no alcanzan para rotar.
    const otras = () => {
        if (ofertas.length <= VISIBLES) return recargar();
        setDesde(d => (d + VISIBLES) % ofertas.length);
    };

    // Al llegar al final se completa con las del principio, para que siempre se
    // vean VISIBLES y no una fila suelta.
    const visibles = ofertas.length === 0
        ? []
        : Array.from({ length: Math.min(VISIBLES, ofertas.length) },
            (_, i) => ofertas[(desde + i) % ofertas.length]);

    return (
        <Modal
            open
            size="lg"
            title="Agregar una postulación"
            description="Elegí una oferta para sumarla a tu tablero."
            onClose={onClose}
        >
            <div className="flex flex-col gap-3">
                {error && <ErrorMessage message={error} onRetry={recargar} />}

                {loading && ofertas.length === 0 ? (
                    <div className="py-10">
                        <LoadingSpinner />
                    </div>
                ) : !error && ofertas.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted">
                        No hay ofertas disponibles en este momento.
                    </p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {visibles.map(job => (
                            <button
                                key={job.id}
                                type="button"
                                onClick={() => onPick(job)}
                                className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-primary dark:border-gray-800 dark:bg-gray-900"
                            >
                                <CompanyLogo
                                    src={job.companyLogoUrl}
                                    name={job.company}
                                    className="h-10 w-10 shrink-0 rounded-lg bg-canvas text-sm text-muted dark:bg-gray-800"
                                />

                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-ink dark:text-white">
                                        {job.title}
                                    </span>
                                    <span className="block truncate text-xs text-muted">{job.company}</span>
                                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                                        <MapPin size={11} className="shrink-0" />
                                        <span className="truncate">{job.location}</span>
                                    </span>
                                </span>

                                <span className="flex shrink-0 items-center gap-2">
                                    {typeof job.matchScore === 'number' && (
                                        <Badge label={`${job.matchScore}%`} variant="success" />
                                    )}
                                    <Badge label={modalityLabel[job.modality]} variant="info" />
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 dark:border-gray-800">
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={loading || ofertas.length === 0}
                        onClick={otras}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Mostrar otras
                    </Button>

                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => { onClose(); navigate('/jobs'); }}
                    >
                        Ver todas las ofertas
                        <ArrowRight size={14} />
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
