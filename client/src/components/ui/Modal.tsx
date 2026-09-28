import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from './Button';

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
}

/** Hộp thoại ở giữa màn hình. */
export function Modal({
  open, onClose, title, description, children, footer, size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  useEscape(open, onClose);
  if (!open) return null;
  const width = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 backdrop-blur-[2px] sm:items-center" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal
        className={cn('card w-full animate-fade-in shadow-pop', width)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-ink-3">{description}</p>}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Đóng">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 scroll-thin">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Ngăn kéo trượt từ phải, dùng cho màn chi tiết (đơn hàng, thuốc, khách). */
export function Drawer({
  open, onClose, title, subtitle, children, footer, width = 'max-w-xl',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEscape(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[1px]" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-modal
        className={cn('absolute inset-y-0 right-0 flex w-full animate-slide-in flex-col border-l border-line bg-surface shadow-pop', width)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-ink">{title}</h2>
            {subtitle && <div className="mt-0.5 text-xs text-ink-3">{subtitle}</div>}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Đóng">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 scroll-thin">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-3">{footer}</div>}
      </aside>
    </div>,
    document.body,
  );
}
