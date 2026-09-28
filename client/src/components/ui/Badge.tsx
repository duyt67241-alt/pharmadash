import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/cn';

export type Tone = 'neutral' | 'primary' | 'success' | 'danger' | 'warning' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'bg-muted text-ink-2',
  primary: 'bg-primary-soft text-primary-ink',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
};

/** Nhãn trạng thái nhỏ; có chấm màu tùy chọn để trạng thái không chỉ dựa vào màu chữ. */
export function Badge({ tone = 'neutral', dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-2xs font-semibold', TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/**
 * Huy hiệu % tăng/giảm. Có mũi tên + dấu để không phụ thuộc màu.
 * `inverse`: dùng cho chỉ số mà tăng là xấu (VD: thuốc hết hạn).
 */
export function StatBadge({ value, inverse = false, className }: { value: number | null | undefined; inverse?: boolean; className?: string }) {
  if (value === null || value === undefined) return null;
  const up = value > 0;
  const flat = value === 0;
  const good = flat ? null : up !== inverse;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        'num inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-2xs font-semibold',
        good === null ? 'bg-muted text-ink-2' : good ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
        className,
      )}
      title={`${up ? 'Tăng' : flat ? 'Không đổi' : 'Giảm'} ${Math.abs(value)}%`}
    >
      {!flat && <Icon className="h-3 w-3" strokeWidth={2.5} />}
      {up ? '+' : ''}
      {value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%
    </span>
  );
}
