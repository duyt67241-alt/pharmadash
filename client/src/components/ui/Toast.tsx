import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: number; type: ToastType; message: string }

const Ctx = createContext<(message: string, type?: ToastType) => void>(() => {});

/** Thông báo nhỏ góc dưới phải, tự ẩn sau 3 giây. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, type, message }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3200);
  }, []);
  const ICON = { success: CheckCircle2, error: XCircle, info: Info };
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2" aria-live="polite">
        {items.map((t) => {
          const Icon = ICON[t.type];
          return (
            <div key={t.id} className="card pointer-events-auto flex min-w-[260px] max-w-sm animate-fade-in items-start gap-2.5 px-4 py-3 shadow-pop">
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', t.type === 'success' ? 'text-success' : t.type === 'error' ? 'text-danger' : 'text-info')} />
              <span className="text-[13px] text-ink">{t.message}</span>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
