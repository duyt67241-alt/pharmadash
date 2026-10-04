import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { cn } from '../../lib/cn';
import { StatBadge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';

export type KpiTone = 'primary' | 'blue' | 'green' | 'orange';

// Viết đủ tên class để Tailwind quét được (không ghép chuỗi động)
const TONES: Record<KpiTone, { chip: string; glow: string; bar: string }> = {
  primary: { chip: 'from-primary to-pink', glow: 'bg-primary/15', bar: 'from-primary to-pink' },
  blue: { chip: 'from-blue to-primary', glow: 'bg-blue/15', bar: 'from-blue to-primary' },
  green: { chip: 'from-green to-blue', glow: 'bg-green/15', bar: 'from-green to-blue' },
  orange: { chip: 'from-orange to-pink', glow: 'bg-orange/15', bar: 'from-orange to-pink' },
};

interface Props {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  change?: number | null;
  /** true nếu chỉ số tăng là xấu */
  inverse?: boolean;
  caption: ReactNode;
  info: string;
  loading?: boolean;
  extra?: ReactNode;
  /** Màu nhận diện của thẻ */
  tone?: KpiTone;
  /** Độ trễ hiệu ứng xuất hiện (ms) để các thẻ hiện lần lượt */
  delay?: number;
}

/**
 * Thẻ KPI: icon màu + nhãn + (i) · số lớn · huy hiệu % · "so với kỳ trước".
 * Bám bố cục ảnh tham khảo, thêm màu nhận diện cho từng chỉ số.
 */
export function KpiCard({ icon, label, value, change, inverse, caption, info, loading, extra, tone = 'primary', delay = 0 }: Props) {
  const t = TONES[tone];
  return (
    <div
      className="card relative flex flex-col gap-4 p-4 transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop motion-safe:animate-rise"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Vệt màu trang trí ở góc + vạch màu ở đáy (bọc riêng để không cắt tooltip) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-card" aria-hidden>
        <div className={cn('absolute -right-10 -top-12 h-32 w-32 rounded-full blur-2xl', t.glow)} />
        <div className={cn('absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r opacity-80', t.bar)} />
      </div>
      <div className="relative flex items-center gap-2.5">
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-card [&>svg]:h-[18px] [&>svg]:w-[18px]', t.chip)}>
          {icon}
        </span>
        <span className="flex-1 text-[13px] font-medium text-ink">{label}</span>
        <span className="group relative">
          <Info className="h-4 w-4 cursor-help text-ink-3" aria-label={info} tabIndex={0} />
          <span className="pointer-events-none absolute right-0 top-6 z-20 w-56 rounded-lg bg-ink px-3 py-2 text-2xs font-normal leading-4 text-surface opacity-0 shadow-pop transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            {info}
          </span>
        </span>
      </div>
      {loading ? (
        <div className="relative flex items-end justify-between">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      ) : (
        <div className="relative flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[26px] font-semibold leading-8 tracking-tight text-ink">{value}</span>
            <StatBadge value={change} inverse={inverse} />
            {extra}
          </div>
          <span className="pb-1 text-xs text-ink-3">{caption}</span>
        </div>
      )}
    </div>
  );
}
