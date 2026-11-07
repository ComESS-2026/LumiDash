import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  busy,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <p className="text-sm text-slate-600">{message}</p>
      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Deleting...' : 'Delete'}
        </Button>
      </div>
    </Modal>
  );
}
