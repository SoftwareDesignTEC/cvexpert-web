import { JobListingError } from '../../services/jobSearch';
import { useLocale } from '../../i18n/LocaleContext';
import { useEffect, useState } from 'react';
import { CompanyLogo } from './Avatar';
import Button from './Button';
import { jobService } from '../../services/otherServices';
import { jobErrorMessage } from '../../i18n/jobErrorMessage';
import type { JobOffer } from '../../types/models';

/** Se monta por ID: una respuesta tardía nunca cambia la tarjeta de otra selección. */
export default function JobOfferSelection({ id, supplied, disabled, onChange }: {
    id: string; supplied: JobOffer | null; disabled: boolean; onChange: () => void;
}) {
    const { t } = useLocale();
    const [job, setJob] = useState<JobOffer | null>(supplied?.id === id ? supplied : null);
    const [error, setError] = useState<unknown>(null);
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        if (!id || supplied?.id === id) return;
        let active = true;
        jobService.getById(id).then(detail => {
            if (detail.id !== id) throw new JobListingError('wrongDetail', 'El detalle recibido corresponde a otra oferta.');
            if (active) setJob(detail);
        }).catch(err => { if (active) setError(err); });
        return () => { active = false; };
    }, [id, supplied, retry]);
    const visible = supplied?.id === id ? supplied : job;
    return <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-medium text-body dark:text-gray-300">{t.gap.jobOffer}</p>
        {visible && <div className="flex items-center gap-3 rounded-xl border border-line p-3 dark:border-gray-700">
            <CompanyLogo src={visible.companyLogoUrl} name={visible.company} className="h-10 w-10 shrink-0 rounded-lg bg-primary-tint text-primary dark:bg-gray-800" />
            <div className="min-w-0"><p className="text-sm font-semibold text-ink dark:text-white">{visible.title}</p><p className="text-xs text-muted">{visible.company} · {visible.location}</p></div>
        </div>}
        {id && !visible && !error && <p role="status" className="text-xs text-muted">{t.offerPicker.loadingSelected}</p>}
        {error != null && !visible && <><p role="alert" className="text-sm text-rose-500">{jobErrorMessage(error, t, t.ux.loadSelected)}</p><Button variant="secondary" size="sm" disabled={disabled} onClick={() => { setError(null); setRetry(n => n + 1); }}>{t.offerPicker.retryDetail}</Button></>}
        <Button autoFocus={supplied?.id === id} variant="secondary" size="sm" disabled={disabled} onClick={onChange}>{id ? t.offerPicker.changeOffer : t.offerPicker.title}</Button>
    </div>;
}
