import { useMemo, useState } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight, PackageCheck, Timer, Users, Video, AlertOctagon } from 'lucide-react';
import { useGet } from '../../api/hooks';
import { useCan } from '../../context/AuthContext';
import type { CalendarDayItem } from '../../api/types';
import { addDays, isoDate } from '../../lib/format';
import { cn } from '../../lib/cn';
import { ChartCard } from './ChartCard';
import { Skeleton } from '../ui/Skeleton';
import { Avatar, EmptyState } from '../ui/Misc';

type MonthMarks = Record<string, { events: number; deliveries: number; expiries: number }>;
const DOW = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const KIND: Record<string, { icon: typeof Video; cls: string; label: string }> = {
  meeting: { icon: Video, cls: 'bg-primary-soft text-primary-ink', label: 'Họp' },
  training: { icon: Users, cls: 'bg-info-soft text-info', label: 'Đào tạo' },
  inspection: { icon: CalendarClock, cls: 'bg-warning-soft text-warning', label: 'Kiểm tra' },
  inventory: { icon: CalendarClock, cls: 'bg-warning-soft text-warning', label: 'Kiểm kê' },
  delivery: { icon: PackageCheck, cls: 'bg-success-soft text-success', label: 'Nhập hàng' },
  expiry: { icon: AlertOctagon, cls: 'bg-danger-soft text-danger', label: 'Hạn dùng' },
  shift: { icon: Timer, cls: 'bg-muted text-ink-2', label: 'Ca làm' },
};

/** Lịch dạng dải tuần (giống ảnh mẫu) + danh sách việc trong ngày đã chọn. */
export function CalendarWidget({ className }: { className?: string }) {
  const can = useCan();
  const today = useMemo(() => new Date(), []);
  const [selected, setSelected] = useState(() => new Date());
  const monday = addDays(selected, -((selected.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const monthKey = isoDate(selected).slice(0, 7);

  const { data: marks } = useGet<MonthMarks>('/calendar', { month: monthKey });
  // Tuần có thể vắt qua 2 tháng -> lấy thêm tháng của ngày cuối tuần
  const endMonth = isoDate(week[6]).slice(0, 7);
  const { data: marks2 } = useGet<MonthMarks>(endMonth !== monthKey ? '/calendar' : null, { month: endMonth });
  const { data: day, isLoading } = useGet<{ items: CalendarDayItem[] }>('/calendar/day', { date: isoDate(selected) });

  const allMarks = { ...marks, ...marks2 };
  const title = selected.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  return (
    <ChartCard className={className} title="Lịch làm việc" moreLink={can.viewStaff ? '/staff' : undefined} moreLabel="Xem lịch ca" bodyClassName="flex flex-col">
      <div className="flex items-center justify-between">
        <button onClick={() => setSelected(addDays(selected, -7))} className="rounded-md p-1 text-ink-3 hover:bg-muted hover:text-ink" aria-label="Tuần trước">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button onClick={() => setSelected(new Date())} className="rounded-md px-2 py-0.5 text-[13px] font-medium capitalize text-ink hover:bg-muted" title="Về hôm nay">
          {title}
        </button>
        <button onClick={() => setSelected(addDays(selected, 7))} className="rounded-md p-1 text-ink-3 hover:bg-muted hover:text-ink" aria-label="Tuần sau">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {DOW.map((d) => (
          <div key={d} className="text-2xs font-medium text-ink-3">{d}</div>
        ))}
        {week.map((d) => {
          const k = isoDate(d);
          const m = allMarks[k];
          const isSel = k === isoDate(selected);
          const isToday = k === isoDate(today);
          return (
            <button
              key={k}
              onClick={() => setSelected(d)}
              aria-pressed={isSel}
              aria-label={d.toLocaleDateString('vi-VN')}
              className="group flex flex-col items-center gap-1 py-1"
            >
              <span
                className={cn(
                  'num flex h-8 w-8 items-center justify-center rounded-full text-[13px] transition-colors',
                  isSel ? 'bg-primary font-semibold text-white shadow-primary' : isToday ? 'font-semibold text-primary ring-1 ring-primary/40' : 'text-ink group-hover:bg-muted',
                )}
              >
                {d.getDate()}
              </span>
              <span className="flex h-1.5 gap-0.5" aria-hidden>
                {m?.events ? <span className="h-1 w-1 rounded-full bg-primary" /> : null}
                {m?.deliveries ? <span className="h-1 w-1 rounded-full bg-success" /> : null}
                {m?.expiries ? <span className="h-1 w-1 rounded-full bg-danger" /> : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="scroll-thin -mx-1 mt-2 max-h-[216px] flex-1 space-y-1.5 overflow-y-auto px-1">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        {day?.items.length === 0 && <EmptyState title="Không có lịch" hint="Ngày này chưa có sự kiện nào" />}
        {day?.items.map((it) => {
          const k = KIND[it.kind] ?? KIND.meeting;
          return (
            <div key={it.id} className="rounded-ctl bg-surface-2 px-3 py-2.5 ring-1 ring-inset ring-line">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md', k.cls)} title={k.label}>
                    <k.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate text-[13px] font-medium text-ink">{it.title}</span>
                </div>
                <span className="num shrink-0 text-2xs text-ink-3">{it.time}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2 pl-8">
                {it.people ? (
                  <div className="flex items-center">
                    {it.people.slice(0, 4).map((p) => (
                      <Avatar key={p} name={p} size="sm" className="-ml-1.5 ring-2 ring-surface-2 first:ml-0" />
                    ))}
                    {it.people.length > 4 && <span className="ml-1 text-2xs text-ink-3">+{it.people.length - 4}</span>}
                  </div>
                ) : (
                  <span />
                )}
                <span className="truncate text-2xs text-ink-2" title={it.people ? it.people.join(', ') : it.subtitle}>{it.subtitle}</span>
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
