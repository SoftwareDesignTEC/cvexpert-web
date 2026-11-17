import type { Dict } from './dictionary';
import { ApiError } from '../services/http';
import { JobListingError } from '../services/jobSearch';

/** Localized errors for the selection/catalog UI, without binding HTTP services to React. */
export function jobErrorMessage(error: unknown, t: Dict, context: string): string {
    if (error instanceof JobListingError) return t.offerPicker[error.code];
    const detail = error instanceof ApiError
        ? error.status === 0 ? t.offerPicker.networkError
            : error.status === 401 ? t.offerPicker.sessionError
                : error.status === 403 ? t.offerPicker.permissionError : t.offerPicker.unavailableError
        : t.offerPicker.requestError;
    return `${context}: ${detail}`;
}
