import { FileText, Clock } from 'lucide-react';
import type { CV } from '../../types/models';

interface CVCardProps {
    cv: CV;
    onClick?: () => void;
}

export default function CVCard({ cv, onClick }: CVCardProps) {
    const formattedDate = new Date(cv.updatedAt).toLocaleDateString('es-CR', {
        day: '2-digit', month: 'short', year: 'numeric',
    });

    return (
        <div
            onClick={onClick}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 sm:p-4 flex flex-col gap-2 sm:gap-3 hover:shadow-md hover:border-[#2F7FD4] dark:hover:border-[#2F7FD4] transition-all cursor-pointer"
        >
            {/* Preview placeholder — altura reducida en mobile */}
            <div className="w-full h-20 sm:h-28 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <FileText size={24} className="text-gray-300 dark:text-gray-600 sm:hidden" />
                <FileText size={32} className="text-gray-300 dark:text-gray-600 hidden sm:block" />
            </div>

            {/* Info */}
            <div className="flex flex-col gap-0.5">
                <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {cv.title}
                </h4>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={10} className="sm:hidden" />
                    <Clock size={12} className="hidden sm:block" />
                    <span className="text-[10px] sm:text-xs">{formattedDate}</span>
                </div>
            </div>
        </div>
    );
}