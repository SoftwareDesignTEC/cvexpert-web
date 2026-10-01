interface PageHeaderProps {
    /** Línea pequeña en mayúsculas sobre el título, como en los mockups */
    eyebrow: string;
    title: string;
    /** Buscador, contador o botón alineado a la derecha */
    action?: React.ReactNode;
}

export default function PageHeader({ eyebrow, title, action }: PageHeaderProps) {
    return (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
                    {eyebrow}
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-white sm:text-4xl">
                    {title}
                </h1>
            </div>
            {action && <div className="w-full lg:w-auto lg:shrink-0">{action}</div>}
        </div>
    );
}
