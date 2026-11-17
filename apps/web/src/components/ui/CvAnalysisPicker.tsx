import { useLocale } from '../../i18n/LocaleContext';
import { formatMessage } from '../../i18n/formatMessage';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from './Button';
import Pagination from './Pagination';
import { ErrorMessage, LoadingSpinner } from './Feedback';
import { cvService } from '../../services/cvService';
import { jobErrorMessage } from '../../i18n/jobErrorMessage';
import type { CV } from '../../types/models';

export default function CvAnalysisPicker({ value, onChange, disabled }: { value: string; onChange: (id: string) => void; disabled: boolean }) {
    const { t } = useLocale();
    const [page, setPage] = useState(1);
    const [selectedTitle, setSelectedTitle] = useState('');
    const top = useRef<HTMLDivElement>(null);
    return <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-medium text-body dark:text-gray-300">{t.gap.cv}</p>
        {value && <p className="text-xs text-primary">{formatMessage(t.ux.selected, { title: selectedTitle })}</p>}
        <div ref={top} tabIndex={-1} className="scroll-mt-4">
            <CvPage key={page} page={page} value={value} disabled={disabled} onSelect={cv => { setSelectedTitle(cv.title); onChange(cv.id); }} onPage={next => {
                setPage(next);
                requestAnimationFrame(() => { top.current?.focus({ preventScroll: true }); top.current?.scrollIntoView({ block: 'start' }); });
            }} />
        </div>
    </div>;
}

function CvPage({ page, value, disabled, onSelect, onPage }: { page: number; value: string; disabled: boolean; onSelect: (cv: CV) => void; onPage: (page: number) => void }) {
    const { t } = useLocale();
    const [data, setData] = useState<Awaited<ReturnType<typeof cvService.getAll>> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<unknown>(null);
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        let active = true;
        cvService.getAll({ page, pageSize: 8 }).then(res => { if (active) setData(res); })
            .catch(err => { if (active) setError(err); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [page, retry]);
    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={jobErrorMessage(error, t, t.ux.loadCvs)} onRetry={disabled ? undefined : () => { setLoading(true); setError(null); setRetry(n => n + 1); }} />;
    const pages = Math.max(1, Math.ceil((data?.totalRecords ?? 0) / 8));
    return <div className="space-y-2">
        {!data?.items.length ? <p className="text-sm text-muted">{t.ux.cvPageEmpty} <Link className="text-primary underline" to="/cvs">{t.ux.goToCvs}</Link></p>
            : <div className="grid gap-2 sm:grid-cols-2">{data.items.slice(0, 8).map(cv => <label key={cv.id} className={`flex items-center gap-2 rounded-lg border p-2 text-sm text-body dark:text-gray-300 ${cv.id === value ? 'border-primary bg-primary/5' : 'border-line dark:border-gray-700'}`}>
                <input type="radio" name="analysis-cv" value={cv.id} checked={value === cv.id} disabled={disabled} onChange={() => onSelect(cv)} /><span className="min-w-0 break-words">{cv.title}</span>
            </label>)}</div>}
        {page <= pages && <><p className="text-xs text-muted" role="status">{formatMessage(t.ux.pageOf, { page, total: pages })}</p>
        <fieldset disabled={disabled}><Pagination page={page} totalPages={pages} onChange={onPage} /></fieldset></>}
        {page > pages && <Button size="sm" variant="secondary" disabled={disabled} onClick={() => onPage(1)}>{t.ux.firstPage}</Button>}
    </div>;
}
