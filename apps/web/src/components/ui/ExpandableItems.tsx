import { useLocale } from '../../i18n/LocaleContext';
import { formatMessage } from '../../i18n/formatMessage';
import { useState } from 'react';
import Button from './Button';

/** Una sola expansión por sección; los indicadores de resumen permanecen completos. */
export default function ExpandableItems<T>({ items, children, label, limit = 8 }: {
    items: readonly T[]; children: (visible: readonly T[]) => React.ReactNode; label?: string; limit?: number;
}) {
    const { t } = useLocale();
    const [expanded, setExpanded] = useState(false);
    return <>
        {children(expanded ? items : items.slice(0, limit))}
        {items.length > limit && <Button variant="secondary" size="sm" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
            {expanded ? t.ux.showLess : formatMessage(t.ux.showMore, { count: items.length - limit, label: label ?? t.ux.items })}
        </Button>}
    </>;
}
