// Estructura de respuesta paginada — debe coincidir con lo que devuelve APIM.
// El cliente movil replica este mismo contrato desde su propio repositorio.
export interface PaginatedResponse<T> {
    totalRecords: number;
    page: number;
    pageSize: number;
    items: T[];
}

// Estado genérico para manejar llamadas a la API en componentes
export interface ApiState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
}

// Parámetros de paginación que se mandan al servicio
export interface PaginationParams {
    page: number;
    pageSize: number;
    search?: string;
}