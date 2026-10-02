import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    page: number;          // página actual, empezando en 1
    totalPages: number;
    onChange: (page: number) => void;
}

// Devuelve los números a mostrar, con huecos donde corresponde una elipsis.
// Siempre quedan visibles la primera, la última y las vecinas de la actual.
function pagesToShow(page: number, totalPages: number): (number | 'gap')[] {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
    const sorted = [...pages].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);

    const out: (number | 'gap')[] = [];
    sorted.forEach((p, i) => {
        if (i > 0 && p - sorted[i - 1] > 1) out.push('gap');
        out.push(p);
    });
    return out;
}

export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
    // Con una sola página no hay nada que elegir
    if (totalPages <= 1) return null;

    const go = (p: number) => onChange(Math.min(Math.max(p, 1), totalPages));

    const arrowClass = 'inline-flex items-center justify-center w-9 h-9 rounded-lg border border-line dark:border-gray-800 text-body dark:text-gray-300 transition-colors enabled:hover:border-primary enabled:hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed';

    return (
        <nav className="flex items-center justify-center gap-1.5" aria-label="Paginación">
            <button
                onClick={() => go(page - 1)}
                disabled={page === 1}
                aria-label="Página anterior"
                className={arrowClass}
            >
                <ChevronLeft size={16} />
            </button>

            {pagesToShow(page, totalPages).map((p, i) =>
                p === 'gap' ? (
                    <span key={`gap-${i}`} className="px-1 text-sm text-muted select-none">…</span>
                ) : (
                    <button
                        key={p}
                        onClick={() => go(p)}
                        aria-current={p === page ? 'page' : undefined}
                        className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-colors
                            ${p === page
                            ? 'bg-primary text-white'
                            : 'border border-line dark:border-gray-800 text-body dark:text-gray-300 hover:border-primary hover:text-primary'
                        }`}
                    >
                        {p}
                    </button>
                ),
            )}

            <button
                onClick={() => go(page + 1)}
                disabled={page === totalPages}
                aria-label="Página siguiente"
                className={arrowClass}
            >
                <ChevronRight size={16} />
            </button>
        </nav>
    );
}
