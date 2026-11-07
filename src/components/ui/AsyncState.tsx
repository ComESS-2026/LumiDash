import { AlertCircle, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';

export function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-sm text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
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
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-12 text-center">
      <AlertCircle className="h-8 w-8 text-rose-600" />
      <div>
        <p className="text-sm font-medium text-rose-800">We couldn't load this data.</p>
        <p className="mt-1 text-sm text-rose-700">{message}</p>
      </div>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
