import { useEffect, useState } from 'react';
import { templateService } from '../services/otherServices';
import type { CV, CVTemplate } from '../types/models';

/**
 * Catálogo de plantillas, que varias pantallas necesitan a la vez: el selector
 * del editor, la vista previa y las miniaturas de cada currículum.
 * Se pide una sola vez por pantalla en lugar de una por tarjeta.
 */
export function useTemplates() {
    const [templates, setTemplates] = useState<CVTemplate[]>([]);
    // Las miniaturas necesitan distinguir "todavía no llegó el catálogo" de
    // "esta plantilla no tiene diseño": en el primer caso hay que esperar.
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        templateService.getAll({ page: 1, pageSize: 50 })
            .then(res => { if (!cancelled) setTemplates(res.items ?? []); })
            // Sin catálogo las tarjetas caen al ícono; no vale cortar la pantalla
            .catch(() => { if (!cancelled) setTemplates([]); })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, []);

    return { templates, loading };
}

/** El layout con el que se dibuja un currículum, o null si no se conoce. */
export function layoutFor(templates: CVTemplate[], cv: Pick<CV, 'templateId'>): unknown {
    return templates.find(t => t.id === cv.templateId)?.layout ?? null;
}
