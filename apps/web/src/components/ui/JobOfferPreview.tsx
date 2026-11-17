import { useLocale } from '../../i18n/LocaleContext';
import { formatMessage } from '../../i18n/formatMessage';
import { CompanyLogo } from './Avatar';
import type { JobOffer } from '../../types/models';

/** Vista informativa para seleccionar: no guarda postulaciones ni inicia navegación. */
export default function JobOfferPreview({ job }: { job: JobOffer }) {
    const { locale, t } = useLocale();
    return <div className="flex flex-col gap-4 text-sm text-body dark:text-gray-300">
        <div className="flex items-center gap-3">
            <CompanyLogo src={job.companyLogoUrl} name={job.company} className="h-12 w-12 shrink-0 rounded-xl bg-primary-tint text-primary dark:bg-gray-800" />
            <div><h3 className="font-bold text-ink dark:text-white">{job.title}</h3><p>{job.company}</p><p className="text-xs text-muted">{[job.location, t.modality[job.modality], job.typeProvided !== false ? t.availability[job.type] : null].filter(Boolean).join(' · ')}</p></div>
        </div>
        {job.postedAt && !Number.isNaN(Date.parse(job.postedAt)) && <p className="text-xs text-muted">{formatMessage(t.offerPicker.publishedOn, { date: new Date(job.postedAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-CR') })}</p>}
        {job.description && <section><h4 className="mb-2 font-semibold">{t.dialogs.jobDescription}</h4><p className="whitespace-pre-wrap break-words">{job.description}</p></section>}
        {[{ title: t.dialogs.jobSkills, items: job.skills }, { title: t.dialogs.jobRequirements, items: job.requirements }].map(group => group.items?.length ?
            <section key={group.title}><h4 className="mb-2 font-semibold">{group.title}</h4><ul className="list-disc space-y-1 pl-5">{group.items.map((item, i) => <li key={i} className="break-words">{item}</li>)}</ul></section> : null)}
        {job.salary && <p>{t.offerPicker.salary}: {job.salary.currency} {job.salary.min.toLocaleString(locale === 'en' ? 'en-US' : 'es-CR')} – {job.salary.max.toLocaleString(locale === 'en' ? 'en-US' : 'es-CR')}</p>}
    </div>;
}
