import { type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
}

export default function Button({
                                   variant = 'primary',
                                   size = 'md',
                                   loading = false,
                                   disabled,
                                   children,
                                   className = '',
                                   ...props
                               }: ButtonProps) {
    const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        primary:   'bg-primary hover:bg-primary-dark text-white focus:ring-primary',
        secondary: 'border border-primary text-primary hover:bg-primary/10 focus:ring-primary',
        danger:    'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    };

    const sizes = {
        sm:  'px-3 py-1.5 text-sm gap-1.5',
        md:  'px-4 py-2 text-sm gap-2',
        lg:  'px-6 py-3 text-base gap-2',
    };

    return (
        <button
            disabled={disabled || loading}
            className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {loading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
            )}
            {children}
        </button>
    );
}
