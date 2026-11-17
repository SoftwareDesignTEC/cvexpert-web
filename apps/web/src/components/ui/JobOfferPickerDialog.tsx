import { JobListingError } from '../../services/jobSearch';
import { useLocale } from '../../i18n/LocaleContext';
import { formatMessage } from '../../i18n/formatMessage';
import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import JobCard from './JobCard';
import JobOfferPreview from './JobOfferPreview';
import Button from './Button';
import Pagination from './Pagination';
import { ErrorMessage, LoadingSpinner } from './Feedback';
import { jobService } from '../../services/otherServices';
import { loadCompleteJobCatalog } from '../../services/jobCatalogService';
import { JOBS_PER_PAGE, matchesJobSearch, paginateItems } from '../../services/jobSearch';
import { jobErrorMessage } from '../../i18n/jobErrorMessage';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { JobOffer } from '../../types/models';

export default function JobOfferPickerDialog({ open, selectedId, onClose, onSelect }: {
    open: boolean; selectedId: string; onClose: () => void; onSelect: (job: JobOffer) => void;
}) {
    const { t } = useLocale();
    const [input, setInput] = useState('');
    const search = useDebouncedValue(input.trim().replace(/\s+/gu, ' '));
    const [paging, setPaging] = useState({ search: '', page: 1 });
    const page = paging.search === search ? paging.page : 1;
    const [detailId, setDetailId] = useState<string | null>(null);
    const [catalog, setCatalog] = useState<JobOffer[] | null>(null);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [catalogError, setCatalogError] = useState<unknown>(null);
    const body = useRef<HTMLDivElement>(null);
    const searchField = useRef<HTMLInputElement>(null);
    const active = useRef(false);
    const generation = useRef(0);
    const catalogBusy = useRef(false);
    useEffect(() => {
        active.current = open;
        if (!open) return;
        const openingGeneration = generation.current;
        const previous = document.activeElement as HTMLElement | null;
        const dialog = body.current?.closest('[role="dialog"]');
        searchField.current?.focus();
        const trap = (event: KeyboardEvent) => {
            if (event.key !== 'Tab' || !dialog) return;
            const elements = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]')]
                .filter(element => element.getClientRects().length > 0);
            const first = elements[0], last = elements.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        };
        dialog?.addEventListener('keydown', trap as EventListener);
        return () => {
            active.current = false;
            generation.current = openingGeneration + 1;
            dialog?.removeEventListener('keydown', trap as EventListener);
            previous?.focus();
        };
    }, [open]);
    async function loadLocalCatalog() {
        if (catalogBusy.current || catalog) return;
        catalogBusy.current = true;
        const current = generation.current;
        setCatalogLoading(true); setCatalogError(null);
        try {
            const all = await loadCompleteJobCatalog(undefined, () => active.current && generation.current === current);
            if (active.current && generation.current === current) { setCatalog(all); setPaging({ search, page: 1 }); }
        } catch (err) { if (active.current && generation.current === current) setCatalogError(err); }
        finally { catalogBusy.current = false; setCatalogLoading(false); }
    }
    function close() { setDetailId(null); onClose(); }
    const pending = input.trim().replace(/\s+/gu, ' ') !== search;
    return <Modal open={open} size="xl" title={t.offerPicker.title} description={t.offerPicker.description} onClose={close}>
        {open && <div ref={body}>
            <div hidden={detailId !== null} className="space-y-4">
                <label className="block text-sm text-body dark:text-gray-300">{t.offerPicker.searchLabel}
                    <input ref={searchField} type="search" value={input} onChange={e => setInput(e.target.value)} placeholder={t.offerPicker.searchPlaceholder} className="mt-1 w-full rounded-lg border border-line bg-surface p-3 text-ink dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                </label>
                <p className="text-xs text-muted">{catalog ? t.offerPicker.localHint : t.offerPicker.serverHint}</p>
                {!catalog && <Button variant="secondary" size="sm" loading={catalogLoading} onClick={() => void loadLocalCatalog()}>{catalogError ? t.offerPicker.retryCatalog : t.offerPicker.searchCatalog}</Button>}
                {catalogError != null && <p role="alert" className="text-sm text-rose-500">{jobErrorMessage(catalogError, t, t.ux.loadCatalog)}</p>}
                <JobPickerList key={JSON.stringify([search, page, catalog !== null])} search={search} page={page} catalog={catalog} pending={pending || catalogLoading} selectedId={selectedId}
                    onPage={next => {
                        setPaging({ search, page: next });
                        requestAnimationFrame(() => { body.current?.querySelector<HTMLElement>('[data-job-list]')?.focus(); body.current?.querySelector('[data-job-list]')?.scrollIntoView({ block: 'start' }); });
                    }} onDetails={setDetailId} />
                <div className="flex justify-end"><Button variant="secondary" size="sm" onClick={close}>{t.common.cancel}</Button></div>
            </div>
            {detailId !== null && <JobPickerDetail key={detailId} id={detailId} onBack={() => { setDetailId(null); requestAnimationFrame(() => searchField.current?.focus()); }} onSelect={job => { setDetailId(null); onSelect(job); }} />}
        </div>}
    </Modal>;
}

function JobPickerList({ search, page, catalog, pending, selectedId, onPage, onDetails }: {
    search: string; page: number; catalog: JobOffer[] | null; pending: boolean; selectedId: string;
    onPage: (page: number) => void; onDetails: (id: string) => void;
}) {
    const { t } = useLocale();
    const local = catalog ? catalog.filter(job => matchesJobSearch(job, search)) : null;
    const localPage = local ? paginateItems(local, page) : null;
    const [data, setData] = useState<Awaited<ReturnType<typeof jobService.getAll>> | null>(null);
    const [loading, setLoading] = useState(catalog === null);
    const [error, setError] = useState<unknown>(null);
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        if (catalog !== null) return;
        let active = true;
        jobService.getAll({ page, pageSize: JOBS_PER_PAGE, search: search || undefined }).then(res => {
            if (active) setData(res);
        }).catch(err => { if (active) setError(err); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [page, search, catalog, retry]);
    const verified = data?.paginationVerified;
    const items = localPage?.items ?? data?.items.slice(0, JOBS_PER_PAGE) ?? [];
    const totalPages = localPage?.totalPages ?? (verified ? Math.max(1, Math.ceil(data!.totalRecords / JOBS_PER_PAGE)) : 1);
    return <div data-job-list tabIndex={-1} className="space-y-3 scroll-mt-4 outline-none" aria-busy={loading || pending}>
        {loading || pending ? <LoadingSpinner /> : error ? <ErrorMessage message={jobErrorMessage(error, t, t.ux.loadOffers)} onRetry={() => { setError(null); setLoading(true); setRetry(n => n + 1); }} /> : <>
            {!catalog && !verified && <p role="status" className="text-sm text-amber-700 dark:text-amber-400">{t.offerPicker.unverified}</p>}
            {!catalog && search && data?.items.some(job => !matchesJobSearch(job, search)) && <p role="status" className="text-sm text-amber-700 dark:text-amber-400">{t.offerPicker.ignoredSearch}</p>}
            {items.length === 0 ? <p className="text-sm text-muted">{search ? t.offerPicker.noSearchResults : t.offerPicker.noPageOffers}</p>
                : <div className="grid gap-3 sm:grid-cols-2">{items.map(job => <div key={job.id} className={job.id === selectedId ? 'rounded-xl ring-2 ring-primary' : ''}>
                    {job.id === selectedId && <p className="px-3 pt-2 text-xs font-semibold text-primary">{t.offerPicker.currentSelection}</p>}
                    <JobCard job={job} preview onViewDetails={() => onDetails(job.id)} />
                </div>)}</div>}
            {(catalog !== null || verified) && (page > totalPages
                ? <Button variant="secondary" size="sm" onClick={() => onPage(1)}>{t.offerPicker.unavailablePage}</Button>
                : <><p className="text-xs text-muted" role="status">{formatMessage(t.ux.pageOf, { page, total: totalPages })}</p><Pagination page={page} totalPages={totalPages} onChange={onPage} /></>)}
        </>}
    </div>;
}

function JobPickerDetail({ id, onBack, onSelect }: { id: string; onBack: () => void; onSelect: (job: JobOffer) => void }) {
    const { t } = useLocale();
    const [job, setJob] = useState<JobOffer | null>(null);
    const [error, setError] = useState<unknown>(null);
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        let active = true;
        jobService.getById(id).then(detail => {
            if (detail.id !== id) throw new JobListingError('wrongDetail', 'El detalle recibido corresponde a otra oferta.');
            if (active) setJob(detail);
        }).catch(err => { if (active) setError(err); });
        return () => { active = false; };
    }, [id, retry]);
    return <div className="space-y-4">
        <Button autoFocus size="sm" variant="secondary" onClick={onBack}>{t.offerPicker.backToResults}</Button>
        {error ? <ErrorMessage message={jobErrorMessage(error, t, t.ux.loadDetail)} onRetry={() => { setError(null); setRetry(n => n + 1); }} /> : !job ? <LoadingSpinner /> : <>
            <JobOfferPreview job={job} />
            <div className="flex justify-end"><Button onClick={() => onSelect(job)}>{t.offerPicker.confirm}</Button></div>
        </>}
    </div>;
}
