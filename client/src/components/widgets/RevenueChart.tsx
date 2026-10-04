import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import { ChevronsUpDown, Download, Table2, BarChart3 } from 'lucide-react';
import { useGet, LIVE_REFETCH_MS } from '../../api/hooks';
import type { RevenuePoint, RevenueSeries } from '../../api/types';
import { axisVnd, niceTicks, num, vnd } from '../../lib/format';
import { cn } from '../../lib/cn';
import { ChartCard } from './ChartCard';
import { Segmented } from '../ui/Segmented';
import { CountUp } from '../ui/CountUp';
import { StatBadge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { Dropdown, MenuItem } from '../ui/Dropdown';

type Range = '1d' | '1w' | '1m' | '6m' | '1y' | 'all';
type Metric = 'revenue' | 'orders';

const RANGES: { value: Range; label: string }[] = [
  { value: '1d', label: '1N' },
  { value: '1w', label: '1T' },
  { value: '1m', label: '1Th' },
  { value: '6m', label: '6Th' },
  { value: '1y', label: '1Năm' },
  { value: 'all', label: 'Tất cả' },
];
const RANGE_CAPTION: Record<Range, string> = {
  '1d': 'so với hôm qua',
  '1w': 'so với 7 ngày trước',
  '1m': 'so với 30 ngày trước',
  '6m': 'so với 6 tháng trước',
  '1y': 'so với năm trước',
  all: 'toàn bộ thời gian',
};
const METRIC_LABEL: Record<Metric, string> = { revenue: 'Doanh thu', orders: 'Số đơn hàng' };

const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Cột: nền tím nhạt + nắp tím 2px; cột đang hover/kỳ hiện tại tô tím đậm. Bo 4px ở đỉnh, vuông ở đáy. */
function BarShape(props: { x?: number; y?: number; width?: number; height?: number; index?: number; payload?: RevenuePoint; active: number | null }) {
  const { x = 0, y = 0, width = 0, height = 0, index, payload, active } = props;
  if (height <= 0) return null;
  const strong = active === index || (active === null && payload?.current);
  const r = Math.min(4, height);
  const path = `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`;
  return (
    <g>
      <path d={path} fill={strong ? 'rgb(var(--primary))' : 'rgb(var(--chart-bar))'} style={{ transition: 'fill 150ms' }} />
      {!strong && <rect x={x} y={y} width={width} height={Math.min(2, height)} rx={1} fill="rgb(var(--chart-cap))" />}
    </g>
  );
}

function ChartTooltip({ active, payload, metric }: TooltipProps<number, string> & { metric: Metric }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as RevenuePoint;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 shadow-pop">
      {/* Giá trị đứng trước, nhãn theo sau */}
      <div className="text-[13px] font-semibold text-ink">{metric === 'revenue' ? vnd(p.revenue) : `${num(p.orders)} đơn`}</div>
      <div className="text-2xs text-ink-3">
        {p.label} · {metric === 'revenue' ? `${num(p.orders)} đơn` : vnd(p.revenue)}
      </div>
    </div>
  );
}

export function RevenueChart({ className, delay }: { className?: string; delay?: number }) {
  const [range, setRange] = useState<Range>('1y');
  const [metric, setMetric] = useState<Metric>('revenue');
  const [asTable, setAsTable] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const { data, isLoading, isFetching } = useGet<RevenueSeries>('/dashboard/revenue', { range }, { refetchInterval: LIVE_REFETCH_MS });

  const exportCsv = () => {
    if (!data) return;
    const rows = [['Kỳ', 'Doanh thu (VND)', 'Số đơn'], ...data.points.map((p) => [p.key, p.revenue, p.orders])];
    const blob = new Blob(['﻿' + rows.map((r) => r.join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `doanh-thu_${range}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const total = metric === 'revenue' ? data?.total ?? 0 : data?.points.reduce((s, p) => s + p.orders, 0) ?? 0;
  // Mốc trục Y tròn (0 / 250tr / 500tr...) thay vì số lẻ tự sinh
  const ticks = niceTicks(Math.max(0, ...(data?.points.map((p) => p[metric]) ?? [0])));

  return (
    <ChartCard
      className={className}
      delay={delay}
      title={
        <Dropdown
          align="left"
          width="w-44"
          trigger={({ toggle }) => (
            <button onClick={toggle} className="-ml-1 inline-flex items-center gap-1 rounded-md px-1 hover:bg-muted">
              {METRIC_LABEL[metric]}
              <ChevronsUpDown className="h-3.5 w-3.5 text-ink-3" />
            </button>
          )}
        >
          {(close) =>
            (['revenue', 'orders'] as Metric[]).map((m) => (
              <MenuItem key={m} active={metric === m} onClick={() => { setMetric(m); close(); }}>
                {METRIC_LABEL[m]}
              </MenuItem>
            ))
          }
        </Dropdown>
      }
      subtitle={
        isLoading ? (
          <Skeleton className="h-7 w-44" />
        ) : (
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-[22px] font-semibold tracking-tight text-ink"><CountUp value={total} format={metric === 'revenue' ? vnd : (n) => `${num(Math.round(n))} đơn`} /></span>
            {metric === 'revenue' && <StatBadge value={data?.change} />}
            <span className="text-xs text-ink-3">{RANGE_CAPTION[range]}</span>
          </div>
        )
      }
      actions={<Segmented size="xs" options={RANGES} value={range} onChange={setRange} ariaLabel="Khoảng thời gian" className="hidden sm:inline-flex" />}
      menu={[
        { label: asTable ? 'Xem biểu đồ' : 'Xem dạng bảng', icon: asTable ? <BarChart3 /> : <Table2 />, onClick: () => setAsTable((t) => !t) },
        { label: 'Tải dữ liệu CSV', icon: <Download />, onClick: exportCsv },
      ]}
    >
      <Segmented size="xs" options={RANGES} value={range} onChange={setRange} className="mb-3 sm:hidden" />
      {isLoading ? (
        <Skeleton className="h-[300px] w-full" />
      ) : asTable ? (
        <div className="scroll-thin h-[300px] overflow-y-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-line text-2xs uppercase text-ink-3">
                <th className="py-2 text-left font-semibold">Kỳ</th>
                <th className="py-2 text-right font-semibold">Doanh thu</th>
                <th className="py-2 text-right font-semibold">Số đơn</th>
              </tr>
            </thead>
            <tbody className="num">
              {data?.points.map((p) => (
                <tr key={p.key} className="border-b border-line last:border-0">
                  <td className="py-1.5 text-ink-2">{p.key}</td>
                  <td className="py-1.5 text-right text-ink">{vnd(p.revenue)}</td>
                  <td className="py-1.5 text-right text-ink">{num(p.orders)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={cn('h-[300px] transition-opacity', isFetching && 'opacity-60')}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data?.points}
              margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
              onMouseMove={(s) => setActive(typeof s?.activeTooltipIndex === 'number' ? s.activeTooltipIndex : null)}
              onMouseLeave={() => setActive(null)}
            >
              <CartesianGrid vertical={false} stroke="rgb(var(--chart-grid))" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: 'rgb(var(--line-strong))' }}
                tick={{ fill: 'rgb(var(--ink-3))', fontSize: 11 }}
                interval="preserveStartEnd"
                minTickGap={8}
                dy={6}
              />
              <YAxis
                ticks={ticks}
                domain={[0, ticks[ticks.length - 1]]}
                tickFormatter={metric === 'revenue' ? axisVnd : (v) => num(v)}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'rgb(var(--ink-3))', fontSize: 11 }}
                width={48}
              />
              <Tooltip cursor={{ fill: 'rgb(var(--muted))', opacity: 0.6 }} content={<ChartTooltip metric={metric} />} isAnimationActive={false} />
              <Bar
                dataKey={metric}
                maxBarSize={24}
                shape={(p: unknown) => <BarShape {...(p as object)} active={active} />}
                // Cột mọc dần từ đáy lên khi tải / đổi khoảng thời gian
                isAnimationActive={!reduceMotion}
                animationBegin={delay ?? 0}
                animationDuration={900}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
