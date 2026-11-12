import { AlertCircle, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';

export function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-16 text-sm text-slate-500 dark:text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin text-emerald-600 dark:text-emerald-400" />
      Loading...
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-500/15 px-6 py-12 text-center">
      <AlertCircle className="h-8 w-8 text-rose-600 dark:text-rose-400" />
      <div>
        <p className="text-sm font-medium text-rose-800 dark:text-rose-200">We couldn't load this data.</p>
        <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">{message}</p>
      </div>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
