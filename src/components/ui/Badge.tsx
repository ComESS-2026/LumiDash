import type { ReactNode } from 'react';
import type { BadgeTone } from '@/lib/tones';

const TONE_CLASSES: Record<BadgeTone, string> = {
  emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  sky: 'bg-sky-50 text-sky-800 ring-sky-600/20',
  amber: 'bg-amber-50 text-amber-900 ring-amber-600/25',
  rose: 'bg-rose-50 text-rose-800 ring-rose-600/20',
  orange: 'bg-orange-50 text-orange-900 ring-orange-600/25',
  slate: 'bg-slate-100 text-slate-700 ring-slate-500/20',
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
