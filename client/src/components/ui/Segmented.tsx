import { cn } from '../../lib/cn';

interface Option<T extends string> {
  value: T;
  label: string;
}

/** Nhóm nút chọn 1 (tab lọc 1N/1T/..., Hôm nay/7 ngày/30 ngày). */
export function Segmented<T extends string>({
  options, value, onChange, size = 'sm', className, ariaLabel, onDark,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: 'xs' | 'sm';
  className?: string;
  ariaLabel?: string;
  /** Dùng trên nền màu đậm (banner) */
  onDark?: boolean;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn('inline-flex items-center gap-0.5 rounded-ctl p-0.5', onDark ? 'bg-white/20 backdrop-blur' : 'bg-muted', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg font-medium transition-all duration-150',
            size === 'xs' ? 'h-6 px-2 text-2xs' : 'h-7 px-2.5 text-xs',
            o.value === value
              ? onDark ? 'bg-white text-[#5433E0] shadow-card' : 'bg-surface text-ink shadow-card'
              : onDark ? 'text-white/85 hover:text-white' : 'text-ink-3 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Tab gạch chân dùng cho trang con (Kho thuốc: Danh sách / Cảnh báo...). */
export function Tabs<T extends string>({
  tabs, value, onChange,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" className="scroll-thin flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={t.value === value}
          onClick={() => onChange(t.value)}
          className={cn(
            '-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-[13px] font-medium transition-colors',
            t.value === value ? 'border-primary text-ink' : 'border-transparent text-ink-3 hover:text-ink',
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={cn('num rounded-md px-1.5 text-2xs font-semibold', t.value === value ? 'bg-primary-soft text-primary-ink' : 'bg-muted text-ink-3')}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
