import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

/**
 * Menu thả xuống đơn giản: đóng khi click ra ngoài hoặc nhấn Esc.
 * `trigger` nhận hàm render để gắn onClick + trạng thái mở.
 */
export function Dropdown({
  trigger, children, align = 'right', width = 'w-56', className,
}: {
  trigger: (p: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: 'left' | 'right';
  width?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute top-full z-40 mt-1.5 animate-fade-in rounded-xl border border-line bg-surface p-1 shadow-pop',
            align === 'right' ? 'right-0' : 'left-0',
            width,
            className,
          )}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  icon, children, onClick, active, danger, hint,
}: {
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  danger?: boolean;
  hint?: ReactNode;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
        danger ? 'text-danger hover:bg-danger-soft' : 'text-ink hover:bg-muted',
        active && 'bg-muted font-medium',
      )}
    >
      {icon && <span className="text-ink-3 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      <span className="flex-1">{children}</span>
      {hint && <span className="text-2xs text-ink-3">{hint}</span>}
    </button>
  );
}

export const MenuDivider = () => <div className="my-1 h-px bg-line" />;
export const MenuLabel = ({ children }: { children: ReactNode }) => (
  <div className="px-2.5 pb-1 pt-2 text-2xs font-semibold uppercase tracking-wide text-ink-3">{children}</div>
);
