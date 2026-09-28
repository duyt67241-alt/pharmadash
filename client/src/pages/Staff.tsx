import { useState } from 'react';
import { ChevronLeft, ChevronRight, Moon, Sun, Trophy } from 'lucide-react';
import { useGet } from '../api/hooks';
import type { StaffRow } from '../api/types';
import { addDays, isoDate, num, ROLE_LABEL, vnd, vndCompact } from '../lib/format';
import { cn } from '../lib/cn';
import { DataTable, type Column } from '../components/data/DataTable';
import { Badge, StatBadge } from '../components/ui/Badge';
import { Avatar, PageHeader, ProgressBar } from '../components/ui/Misc';
import { Segmented } from '../components/ui/Segmented';
import { ChartCard } from '../components/widgets/ChartCard';
import { Skeleton } from '../components/ui/Skeleton';

type Range = 'day' | 'week' | 'month';

interface ShiftWeek {
  days: string[];
  staff: { id: number; full_name: string; role: string; branch_id: number }[];
  shifts: { user_id: number; date: string; shift: 'morning' | 'afternoon'; start_time: string; end_time: string }[];
}

const SHIFT = {
  morning: { label: 'Sáng', icon: Sun, cls: 'bg-warning-soft text-warning' },
  afternoon: { label: 'Chiều', icon: Moon, cls: 'bg-primary-soft text-primary-ink' },
};

export default function Staff() {
  const [range, setRange] = useState<Range>('month');
  const { data, isLoading, isFetching } = useGet<{ rows: StaffRow[] }>('/staff', { range });
  const max = data?.rows[0]?.revenue || 1;

  const columns: Column<StaffRow>[] = [
    {
      key: 'name', header: 'Nhân viên',
      render: (s) => {
        const rank = data!.rows.indexOf(s);
        return (
          <div className="flex items-center gap-3">
            <span className={cn('num flex h-6 w-6 items-center justify-center rounded-full text-2xs font-semibold', rank === 0 ? 'bg-warning-soft text-warning' : 'bg-muted text-ink-3')}>
              {rank === 0 ? <Trophy className="h-3.5 w-3.5" /> : rank + 1}
            </span>
            <Avatar name={s.full_name} />
            <div>
              <div className="font-medium text-ink">{s.full_name}</div>
              <div className="text-2xs text-ink-3">{ROLE_LABEL[s.role]} · {s.branch}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'today', header: 'Ca hôm nay', hideBelow: 'md',
      render: (s) => s.today_shift ? (
        <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-2xs font-semibold', SHIFT[s.today_shift].cls)}>
          {(() => { const I = SHIFT[s.today_shift].icon; return <I className="h-3 w-3" />; })()}
          {SHIFT[s.today_shift].label}
        </span>
      ) : <Badge>Nghỉ</Badge>,
    },
    {
      key: 'revenue', header: 'Doanh số', align: 'right',
      render: (s) => (
        <div className="ml-auto w-44">
          <div className="flex items-center justify-end gap-1.5">
            <span className="num font-semibold">{vnd(s.revenue)}</span>
          </div>
          <ProgressBar value={(s.revenue / max) * 100} className="mt-1" />
        </div>
      ),
    },
    { key: 'change', header: 'So kỳ trước', align: 'right', hideBelow: 'sm', render: (s) => <StatBadge value={s.change} /> },
    { key: 'orders', header: 'Số đơn', align: 'right', hideBelow: 'md', render: (s) => <span className="num">{num(s.orders)}</span> },
    { key: 'avg', header: 'TB / đơn', align: 'right', hideBelow: 'lg', render: (s) => <span className="num text-ink-2">{vndCompact(s.avg_order)}</span> },
    { key: 'customers', header: 'Khách TV', align: 'right', hideBelow: 'xl', render: (s) => <span className="num text-ink-2">{num(s.customers)}</span> },
  ];

  return (
    <div className="space-y-5 p-4 md:p-6">
      <PageHeader
        title="Nhân viên"
        description="Doanh số theo nhân viên và lịch ca làm việc"
        actions={<Segmented value={range} onChange={setRange} options={[{ value: 'day', label: 'Hôm nay' }, { value: 'week', label: '7 ngày' }, { value: 'month', label: '30 ngày' }]} />}
      />
      <div className="card">
        <DataTable columns={columns} rows={data?.rows} rowKey={(s) => s.id} loading={isLoading} fetching={isFetching} />
      </div>
      <ShiftSchedule />
    </div>
  );
}

/** Lịch ca theo tuần: hàng = nhân viên, cột = ngày. */
function ShiftSchedule() {
  const [week, setWeek] = useState(() => new Date());
  const { data, isLoading } = useGet<ShiftWeek>('/staff/shifts', { week: isoDate(week) });
  const today = isoDate(new Date());
  const DOW = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const find = (uid: number, d: string) => data?.shifts.find((s) => s.user_id === uid && s.date === d);

  return (
    <ChartCard
      title="Lịch ca làm việc"
      subtitle={data && <span className="num text-xs text-ink-3">{data.days[0].split('-').reverse().join('/')} – {data.days[6].split('-').reverse().join('/')}</span>}
      actions={
        <div className="flex items-center gap-1">
          <button onClick={() => setWeek(addDays(week, -7))} className="rounded-md border border-line p-1 text-ink-2 hover:bg-muted" aria-label="Tuần trước"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => setWeek(new Date())} className="rounded-md border border-line px-2 py-0.5 text-xs text-ink-2 hover:bg-muted">Tuần này</button>
          <button onClick={() => setWeek(addDays(week, 7))} className="rounded-md border border-line p-1 text-ink-2 hover:bg-muted" aria-label="Tuần sau"><ChevronRight className="h-4 w-4" /></button>
        </div>
      }
    >
      {isLoading || !data ? <Skeleton className="h-64 w-full" /> : (
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr>
                <th className="py-2 pr-3 text-left text-2xs font-semibold uppercase text-ink-3">Nhân viên</th>
                {data.days.map((d, i) => (
                  <th key={d} className={cn('py-2 text-center text-2xs font-semibold uppercase', d === today ? 'text-primary' : 'text-ink-3')}>
                    {DOW[i]} <span className="num font-normal">{d.slice(8)}/{d.slice(5, 7)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.staff.map((u) => (
                <tr key={u.id} className="border-t border-line">
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={u.full_name} size="sm" />
                      <div><div className="whitespace-nowrap font-medium text-ink">{u.full_name}</div><div className="text-2xs text-ink-3">{ROLE_LABEL[u.role]}</div></div>
                    </div>
                  </td>
                  {data.days.map((d) => {
                    const s = find(u.id, d);
                    return (
                      <td key={d} className={cn('px-1 py-2 text-center', d === today && 'bg-primary-soft/40')}>
                        {s ? (
                          <span className={cn('inline-flex flex-col rounded-md px-2 py-1 text-2xs font-semibold', SHIFT[s.shift].cls)} title={`${s.start_time} - ${s.end_time}`}>
                            {SHIFT[s.shift].label}
                            <span className="num font-normal opacity-80">{s.start_time}–{s.end_time}</span>
                          </span>
                        ) : (
                          <span className="text-2xs text-ink-3">Nghỉ</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  );
}
