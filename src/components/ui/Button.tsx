import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-600',
  secondary:
    'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 ring-1 ring-inset ring-slate-300 dark:ring-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 focus-visible:ring-slate-500',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 focus-visible:ring-rose-600',
  ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white focus-visible:ring-slate-500',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export default function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
