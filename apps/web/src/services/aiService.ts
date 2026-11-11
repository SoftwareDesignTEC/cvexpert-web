import { http } from './http';
import type { CV } from '../types/models';

// Generación con IA. Vive en el microservicio y no acá porque la clave del
// proveedor no puede llegar al navegador, y porque Android consume lo mismo:
// si el prompt viviera en cada cliente, el mismo texto daría CVs distintos.
//
// Las dos llamadas son síncronas: generar tarda segundos y Azure corta a los
// 230, así que hay margen. Un 429 por el límite de la capa gratuita vuelve
// como error y se muestra en el momento.

export type AiTextField = 'profileBio' | 'experienceDescription';
export type AiLanguage = 'es' | 'en';

export interface GenerateTextRequest {
    field: AiTextField;
    /** Texto libre con lo que haya a mano: puesto, empresa, lo ya escrito */
    context: string;
    language: AiLanguage;
}

export interface GenerateCvRequest {
    /** Opcionales: el servicio pone "CV generado el <fecha>" y la plantilla minimal */
    title?: string;
    templateId?: string;
    fullName: string;
    phone?: string;
    /** Todo lo que el usuario contó, dictado o escrito */
    freeText: string;
    language: AiLanguage;
}

export const aiService = {
    /** Sugiere un texto; no guarda nada. El usuario lo revisa antes. */
    generateText: (body: GenerateTextRequest) =>
        http.post<{ text: string }>('/cvs/ai/generate-text', body)
            .then(r => r.text ?? ''),

    /**
     * Arma el currículum completo y lo guarda. Devuelve el CV ya creado, listo
     * para abrir en el editor. El correo no se manda: lo toma de la identidad
     * que inyecta APIM.
     */
    generateCv: (body: GenerateCvRequest) =>
        http.post<CV>('/cvs/ai/generate-cv', body),
};
