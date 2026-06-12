import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info' | 'warning';
interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastContextValue {
  show: (toast: Omit<ToastItem, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ICON: Record<ToastKind, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
  warning: AlertTriangle,
};

const COLOR: Record<ToastKind, string> = {
  success: 'bg-mint-100 text-mint-600 border-mint-200',
  error: 'bg-softred-100 text-softred-400 border-softred-200',
  info: 'bg-skyblue-100 text-skyblue-500 border-skyblue-200',
  warning: 'bg-peach-100 text-peach-500 border-peach-200',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setItems((arr) => arr.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setItems((arr) => [...arr, { ...toast, id }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  const api = useMemo<ToastContextValue>(() => ({
    show,
    success: (title, description) => show({ kind: 'success', title, description }),
    error: (title, description) => show({ kind: 'error', title, description }),
    info: (title, description) => show({ kind: 'info', title, description }),
    warning: (title, description) => show({ kind: 'warning', title, description }),
  }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-container">
        {items.map((t) => {
          const Icon = ICON[t.kind];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-2 rounded-2xl border px-4 py-3 shadow-card animate-fade-in ${COLOR[t.kind]}`}
              role="status"
            >
              <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <div className="font-semibold">{t.title}</div>
                {t.description && <div className="text-ink-muted mt-0.5">{t.description}</div>}
              </div>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="text-ink-muted hover:text-ink"
                aria-label="ปิด"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
