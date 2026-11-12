import type { ReactNode } from 'react';
import type { BadgeTone } from '@/lib/tones';

const TONE_CLASSES: Record<BadgeTone, string> = {
  emerald: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 ring-emerald-600/20 dark:ring-emerald-400/30',
  sky: 'bg-sky-50 dark:bg-sky-500/15 text-sky-800 dark:text-sky-300 ring-sky-600/20 dark:ring-sky-400/30',
  amber: 'bg-amber-50 dark:bg-amber-500/15 text-amber-900 dark:text-amber-300 ring-amber-600/25 dark:ring-amber-400/30',
  rose: 'bg-rose-50 dark:bg-rose-500/15 text-rose-800 dark:text-rose-200 ring-rose-600/20 dark:ring-rose-400/30',
  orange: 'bg-orange-50 dark:bg-orange-500/15 text-orange-900 dark:text-orange-300 ring-orange-600/25 dark:ring-orange-400/30',
  slate: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 ring-slate-500/20 dark:ring-slate-400/30',
};

interface BadgeProps {
  tone: BadgeTone;
  children: ReactNode;
}

export default function Badge({ tone, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
