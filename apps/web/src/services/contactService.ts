import { http } from './http';

// Correos del centro de ayuda. Vienen del APIM para no dejarlos escritos en el
// frontend, que es justamente lo que el proyecto pide evitar.
export interface SupportContact {
    type: string;
    label: string;
    email: string;
}

interface ContactsResponse {
    contacts: SupportContact[];
}

export const contactService = {
    getAll: () =>
        http.get<ContactsResponse>('/help').then(res => res.contacts ?? []),
};
