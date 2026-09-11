// Código compartido entre web y móvil
// Aquí pueden ir: tipos, interfaces, constantes, utils, modelos de datos, etc.

export const APP_NAME = "Proyecto Fase I";
export const APP_VERSION = "0.1.0";

// Ejemplo de tipo compartido
export interface PaginatedResponse<T> {
  totalRecords: number;
  page: number;
  pageSize: number;
  items: T[];
}
