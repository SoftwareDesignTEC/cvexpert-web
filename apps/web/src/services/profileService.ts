import { http } from './http';
import type { UserProfile } from '../types/models';

export const profileService = {
    getById: (id: string) =>
        http.get<UserProfile>(`/profiles/${id}`),

    update: (id: string, data: Partial<UserProfile>) =>
        http.put<UserProfile>(`/profiles/${id}`, data),
};