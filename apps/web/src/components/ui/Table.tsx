import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

// Definición de columna — T es el tipo de dato de cada fila
export interface Column<T> {
    key: keyof T | string;
    header: string;
    render?: (row: T) => React.ReactNode;  // render custom por columna
    width?: string;
}

interface TableProps<T> {
    data: T[];
    columns: Column<T>[];
    totalRecords: number;
    page: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onSearch: (search: string) => void;
    loading?: boolean;
    searchPlaceholder?: string;
}

export default function Table<T extends { id: string }>({
                                                            data,
                                                            columns,
                                                            totalRecords,
                                                            page,
                                                            pageSize,
                                                            onPageChange,
                                                            onSearch,
                                                            loading = false,
                                                            searchPlaceholder = 'Buscar...',
                                                        }: TableProps<T>) {
    const [searchValue, setSearchValue] = useState('');
    const totalPages = Math.ceil(totalRecords / pageSize);

    const handleSearch = (value: string) => {
        setSearchValue(value);
        onSearch(value);
        onPageChange(1); // volver a página 1 al buscar
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Barra de búsqueda */}
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={searchValue}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                        {columns.map(col => (
                            <th
                                key={String(col.key)}
                                style={col.width ? { width: col.width } : undefined}
                                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {loading ? (
                        <tr>
                            <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400">
                                <div className="flex justify-center">
                                    <svg className="animate-spin h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                </div>
                            </td>
                        </tr>
                    ) : data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                                No se encontraron resultados.
                            </td>
                        </tr>
                    ) : (
                        data.map(row => (
                            <tr key={row.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                {columns.map(col => (
                                    <td key={String(col.key)} className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                        {col.render
                                            ? col.render(row)
                                            : String(row[col.key as keyof T] ?? '')}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>
          {totalRecords === 0
              ? 'Sin resultados'
              : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalRecords)} de ${totalRecords}`}
        </span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onPageChange(page - 1)}
                        disabled={page === 1}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button
                            key={p}
                            onClick={() => onPageChange(p)}
                            className={`w-8 h-8 rounded text-sm transition-colors
                ${p === page
                                ? 'bg-primary text-white font-medium'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        >
                            {p}
                        </button>
                    ))}
                    <button
                        onClick={() => onPageChange(page + 1)}
                        disabled={page === totalPages || totalPages === 0}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
