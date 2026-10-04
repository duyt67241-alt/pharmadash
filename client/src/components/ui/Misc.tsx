import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { Inbox, Search } from 'lucide-react';
import { cn } from '../../lib/cn';
import { initials } from '../../lib/format';

/** Avatar chữ cái đầu, màu nền suy ra từ tên để ổn định giữa các lần render. */
export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const hues = ['bg-primary-soft text-primary-ink', 'bg-info-soft text-info', 'bg-success-soft text-success', 'bg-warning-soft text-warning'];
  const h = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % hues.length;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-xs', lg: 'h-11 w-11 text-sm' }[size],
        hues[h],
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function EmptyState({ title = 'Không có dữ liệu', hint, icon }: { title?: string; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-ink-3">{icon ?? <Inbox className="h-5 w-5" />}</div>
      <div className="text-[13px] font-medium text-ink">{title}</div>
      {hint && <div className="max-w-xs text-xs text-ink-3">{hint}</div>}
    </div>
  );
}

export function SearchInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
      <input className="input pl-9" {...rest} />
    </div>
  );
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn('input cursor-pointer appearance-none bg-[length:16px] bg-[right_8px_center] bg-no-repeat pr-8', className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238484a0' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...rest}>
      {children}
    </select>
  );
}

export function Field({ label, error, children, className }: { label: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="label">{label}</span>
      {children}
      {error && <span className="mt-1 block text-2xs text-danger">{error}</span>}
    </label>
  );
}

/** Thanh tiến độ ngang (top thuốc, sức chứa kho). */
export function ProgressBar({ value, tone = 'primary', className }: { value: number; tone?: 'primary' | 'warning' | 'danger'; className?: string }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-primary-soft', className)}>
      <div
        className={cn('h-full origin-left rounded-full transition-all duration-500 motion-safe:animate-grow-x', { primary: 'bg-primary', warning: 'bg-warning', danger: 'bg-danger' }[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/** Tiêu đề trang + mô tả + vùng hành động bên phải. */
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-[13px] text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Ô thống kê nhỏ trên đầu các trang danh sách. */
export function MiniStat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card flex items-center gap-3 px-4 py-3.5">
      {icon && <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-ink-2 [&>svg]:h-4 [&>svg]:w-4">{icon}</div>}
      <div className="min-w-0">
        <div className="text-xs text-ink-3">{label}</div>
        <div className="text-lg font-semibold text-ink">{value}</div>
        {hint && <div className="text-2xs text-ink-3">{hint}</div>}
      </div>
    </div>
  );
}
