import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { StatBadge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';

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
}

/**
 * Thẻ KPI: icon tròn + nhãn + (i) · số lớn · huy hiệu % · "so với kỳ trước".
 * Bám bố cục ảnh tham khảo.
 */
export function KpiCard({ icon, label, value, change, inverse, caption, info, loading, extra }: Props) {
  return (
    <div className="card flex flex-col gap-4 p-4 transition-colors hover:border-line-strong">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface-2 text-ink [&>svg]:h-4 [&>svg]:w-4">
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
        <div className="flex items-end justify-between">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
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
