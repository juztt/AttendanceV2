import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  hideClose?: boolean;
}

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function Modal({ open, onClose, title, description, children, footer, size = 'md', hideClose }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !hideClose) onClose();
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose, hideClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink/30 backdrop-blur-sm animate-fade-in p-0 md:p-4 pb-safe md:pb-4">
      <div
        className={cn(
          'w-full md:w-auto md:min-w-[420px] bg-card rounded-t-3xl md:rounded-3xl shadow-pastel border border-border animate-pop max-h-[90vh] flex flex-col overflow-hidden',
          SIZES[size],
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-start justify-between p-5 pb-2">
            <div>
              {title && <h2 className="text-lg font-semibold text-ink">{title}</h2>}
              {description && <p className="text-sm text-ink-muted mt-1">{description}</p>}
            </div>
            {!hideClose && (
              <button onClick={onClose} className="text-ink-muted hover:text-ink p-1" aria-label="ปิด">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        <div className="p-5 pt-2 overflow-y-auto flex-1 scrollbar-thin">{children}</div>
        {footer && <div className="px-5 pb-5 pt-2 flex items-center gap-2 justify-end border-t border-border/40 bg-card">{footer}</div>}
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  loading?: boolean;
}

export function ConfirmModal({ open, title, description, confirmText = 'ยืนยัน', cancelText = 'ยกเลิก', onConfirm, onCancel, danger, loading }: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>
            {cancelText}
          </button>
          <button
            type="button"
            className={danger ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'กำลังดำเนินการ...' : confirmText}
          </button>
        </>
      }
    >
      {description && <p className="text-sm text-ink-muted leading-relaxed">{description}</p>}
    </Modal>
  );
}
