import { http } from './http';
import type { UserProfile } from '../types/models';

// La respuesta real del APIM no coincide con UserProfile: el nombre llega como
// `fullName` y la residencia como `address`. Se traduce acá para que el resto de
// la aplicación siga trabajando con un único tipo.
export interface ProfileApiResponse {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    address?: string;
    photoUrl?: string;
    bio?: string;
    types?: UserProfile['types'];
    modalities?: UserProfile['modalities'];
    sectors?: string[];
}

function toUserProfile(res: ProfileApiResponse): UserProfile {
    return {
        id: res.id,
        name: res.fullName,
        email: res.email,
        phone: res.phone,
        location: res.address ?? '',
        photoUrl: res.photoUrl,
        bio: res.bio,
        types: res.types ?? [],
        modalities: res.modalities ?? [],
        sectors: res.sectors ?? [],
    };
}

function toApiPayload(data: Partial<UserProfile>): Partial<ProfileApiResponse> {
    const payload: Partial<ProfileApiResponse> = {};
    if (data.name !== undefined)     payload.fullName = data.name;
    if (data.email !== undefined)    payload.email = data.email;
    if (data.phone !== undefined)    payload.phone = data.phone;
    if (data.location !== undefined) payload.address = data.location;
    if (data.photoUrl !== undefined) payload.photoUrl = data.photoUrl;
    if (data.bio !== undefined)        payload.bio = data.bio;
    if (data.types !== undefined)      payload.types = data.types;
    if (data.modalities !== undefined) payload.modalities = data.modalities;
    if (data.sectors !== undefined)    payload.sectors = data.sectors;
    return payload;
}

// Sesiones abiertas del usuario, para el apartado de seguridad
export interface ActiveSession {
    id: string;
    deviceName: string;
    platform: string;
    client: string;
    lastActiveAt: string;
    current: boolean;
}

interface SessionsResponse {
    items: ActiveSession[];
    totalRecords: number;
    page: number;
    pageSize: number;
}

// Copia de los datos del usuario, para "Descargar mis datos"
export interface DataExport {
    exportVersion: string;
    generatedAt: string;
    profile: { name: string; email: string; phone?: string; location?: string };
    cvs: { id: string; title: string }[];
    applications: { id: string; jobTitle: string; company: string; status: string }[];
    notificationSettings: Record<string, boolean>;
}

export const profileService = {
    getById: (id: string) =>
        http.get<ProfileApiResponse>(`/profiles/${id}`).then(toUserProfile),

    update: (id: string, data: Partial<UserProfile>) =>
        http.put<ProfileApiResponse>(`/profiles/${id}`, toApiPayload(data)).then(toUserProfile),

    getSessions: (id: string) =>
        http.get<SessionsResponse>(`/profiles/${id}/sessions`).then(res => res.items ?? []),

    exportData: (id: string) =>
        http.get<DataExport>(`/profiles/${id}/export`),
};
