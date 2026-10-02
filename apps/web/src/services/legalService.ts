import { http } from './http';

// Documentos legales que muestra Configuración. Vienen del APIM para no tener
// textos legales escritos en el frontend, donde quedarían desactualizados.
export interface LegalDocument {
    id: string;
    title: string;
    version: string;
    effectiveDate: string;
    content: string;
}

export type LegalKind = 'terms' | 'privacy';

export const legalService = {
    get: (kind: LegalKind) => http.get<LegalDocument>(`/legal/${kind}`),
};
