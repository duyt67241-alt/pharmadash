/**
 * Các card hàng dưới của trang Tổng quan:
 * Top thuốc bán chạy · Cảnh báo tồn kho · Doanh thu theo nhóm · Tỷ lệ khách quay lại
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, type TooltipProps } from 'recharts';
import { ListOrdered, Package } from 'lucide-react';
import { useGet, LIVE_REFETCH_MS } from '../../api/hooks';
import type { AlertKind, AlertSummary, CategoryRevenue, Retention, RetentionMonth, TopMedicine } from '../../api/types';
import { num, pct, vnd, vndCompact } from '../../lib/format';
import { cn } from '../../lib/cn';
import { ChartCard } from './ChartCard';
import { Badge, StatBadge, type Tone } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState, ProgressBar } from '../ui/Misc';
import { Modal } from '../ui/Modal';

const rowsSkeleton = (n: number, h = 'h-9') => (
  <div className="space-y-2.5">
    {Array.from({ length: n }).map((_, i) => (
      <Skeleton key={i} className={cn(h, 'w-full')} />
    ))}
  </div>
);

// ---------------- Top thuốc bán chạy ----------------
export function TopMedicines({ className }: { className?: string }) {
  const [showAll, setShowAll] = useState(false);
  const { data, isLoading } = useGet<TopMedicine[]>('/dashboard/top-medicines', { limit: 10 }, { refetchInterval: LIVE_REFETCH_MS });

  const list = (items: TopMedicine[]) => (
    <ol className="space-y-3">
      {items.map((m, i) => (
        <li key={m.id}>
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="num w-4 shrink-0 text-2xs font-semibold text-ink-3">{i + 1}</span>
              <span className="truncate text-[13px] font-medium text-ink" title={m.name}>{m.name}</span>
            </div>
            <span className="num shrink-0 text-xs font-semibold text-ink">{vndCompact(m.revenue)}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2 pl-6">
            <ProgressBar value={m.percent} />
            <span className="num w-14 shrink-0 text-right text-2xs text-ink-3">{num(m.quantity)} {m.unit.toLowerCase()}</span>
          </div>
        </li>
      ))}
    </ol>
  );

  return (
    <ChartCard
      className={className}
      title="Top thuốc bán chạy"
      subtitle={<span className="text-xs text-ink-3">Theo doanh thu 30 ngày gần nhất</span>}
      menu={[{ label: 'Xem top 10', icon: <ListOrdered />, onClick: () => setShowAll(true) }]}
      moreLink="/inventory"
    >
      {isLoading ? rowsSkeleton(5) : data?.length ? list(data.slice(0, 5)) : <EmptyState />}
      <Modal open={showAll} onClose={() => setShowAll(false)} title="Top 10 thuốc bán chạy" description="Theo doanh thu 30 ngày gần nhất">
        {data && list(data)}
      </Modal>
    </ChartCard>
  );
}

// ---------------- Cảnh báo tồn kho / hạn dùng ----------------
export const ALERT_META: Record<AlertKind, { label: string; tone: Tone }> = {
  expired: { label: 'Đã hết hạn', tone: 'danger' },
  out: { label: 'Hết hàng', tone: 'danger' },
  exp30: { label: '≤ 30 ngày', tone: 'warning' },
  low: { label: 'Sắp hết hàng', tone: 'warning' },
  exp60: { label: '≤ 60 ngày', tone: 'info' },
  exp90: { label: '≤ 90 ngày', tone: 'neutral' },
};

export function StockAlerts({ className }: { className?: string }) {
  const nav = useNavigate();
  const { data, isLoading } = useGet<AlertSummary>('/inventory/alert-summary', { limit: 5 }, { refetchInterval: 60_000 });
  const c = data?.counts;
  const chips: { k: string; label: string; n: number; tone: Tone; to: string }[] = c
    ? [
        { k: 'exp', label: 'Hết hạn / ≤30 ngày', n: c.expired + c.exp30, tone: 'danger', to: '/inventory?tab=expiring&days=30' },
        { k: 'stock', label: 'Hết / sắp hết hàng', n: c.out + c.low, tone: 'warning', to: '/inventory?tab=low' },
      ]
    : [];

  return (
    <ChartCard
      className={className}
      title="Cảnh báo tồn kho"
      subtitle={<span className="text-xs text-ink-3">Hạn dùng trong 90 ngày & dưới mức tối thiểu</span>}
      menu={[
        { label: 'Xem thuốc sắp hết hạn', onClick: () => nav('/inventory?tab=expiring') },
        { label: 'Xem thuốc sắp hết hàng', onClick: () => nav('/inventory?tab=low') },
      ]}
      moreLink="/inventory?tab=expiring"
    >
      {isLoading ? (
        rowsSkeleton(5)
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2">
            {chips.map((ch) => (
              <button key={ch.k} onClick={() => nav(ch.to)} className="rounded-ctl border border-line px-3 py-2 text-left transition-colors hover:border-line-strong hover:bg-surface-2">
                <div className="flex items-center gap-1.5">
                  <span className={cn('h-1.5 w-1.5 rounded-full', ch.tone === 'danger' ? 'bg-danger' : 'bg-warning')} />
                  <span className="num text-lg font-semibold text-ink">{ch.n}</span>
                </div>
                <div className="truncate text-2xs text-ink-3">{ch.label}</div>
              </button>
            ))}
          </div>
          {data?.items.length ? (
            <ul className="divide-y divide-line">
              {data.items.map((it) => (
                <li key={it.key} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-ink" title={it.name}>{it.name}</div>
                    <div className="truncate text-2xs text-ink-3">{it.detail} · {it.branch}</div>
                  </div>
                  <Badge tone={ALERT_META[it.kind].tone} dot>
                    {it.kind === 'expired' ? `Quá ${Math.abs(it.days_left ?? 0)} ngày` : it.days_left !== null ? `Còn ${it.days_left} ngày` : ALERT_META[it.kind].label}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Kho ổn định" hint="Không có cảnh báo nào" icon={<Package className="h-5 w-5" />} />
          )}
        </>
      )}
    </ChartCard>
  );
}

// ---------------- Doanh thu theo nhóm thuốc ----------------
/** Thanh ngang xếp hạng (1 sắc tím) thay cho donut 12 màu - so sánh các nhóm dễ hơn. */
export function CategoryRevenueCard({ className }: { className?: string }) {
  const { data, isLoading } = useGet<CategoryRevenue>('/dashboard/category-revenue', undefined, { refetchInterval: LIVE_REFETCH_MS });
  const [expanded, setExpanded] = useState(false);
  const items = data?.items ?? [];
  const top = expanded ? items : items.slice(0, 5);
  const rest = items.slice(5);
  const max = items[0]?.revenue ?? 1;

  return (
    <ChartCard
      className={className}
      title="Doanh thu theo nhóm thuốc"
      subtitle={
        isLoading ? <Skeleton className="h-4 w-32" /> : (
          <span className="text-xs text-ink-3">
            30 ngày · <span className="font-semibold text-ink">{vndCompact(data?.total ?? 0)}</span>
          </span>
        )
      }
      menu={[{ label: expanded ? 'Thu gọn' : `Xem đủ ${items.length} nhóm`, onClick: () => setExpanded((e) => !e) }]}
      moreLink="/reports"
    >
      {isLoading ? rowsSkeleton(5) : (
        <ul className="space-y-2.5">
          {top.map((c) => (
            <li key={c.id} className="group">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-ink" title={c.name}>{c.name}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className="num font-semibold text-ink">{pct(c.share)}</span>
                  <StatBadge value={Math.round(c.change)} />
                </span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-muted" title={vnd(c.revenue)}>
                <div className="h-full rounded-full bg-primary/80 transition-all group-hover:bg-primary" style={{ width: `${(c.revenue / max) * 100}%` }} />
              </div>
            </li>
          ))}
          {!expanded && rest.length > 0 && (
            <li className="flex items-center justify-between pt-0.5 text-xs text-ink-3">
              <span>+{rest.length} nhóm khác</span>
              <span className="num">{pct(rest.reduce((s, r) => s + r.share, 0))}</span>
            </li>
          )}
        </ul>
      )}
    </ChartCard>
  );
}

// ---------------- Tỷ lệ khách quay lại ----------------
const SEGMENTS = [
  { key: 'new', label: 'Khách mới', color: 'rgb(var(--chart-1))' },
  { key: 'Thường', label: 'Thường', color: 'rgb(var(--chart-2))' },
  { key: 'Bạc', label: 'Bạc', color: 'rgb(var(--chart-3))' },
  { key: 'Vàng', label: 'Vàng', color: 'rgb(var(--chart-4))' },
] as const;

function RetentionTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const m = payload[0].payload as RetentionMonth;
  return (
    <div className="min-w-[170px] rounded-lg border border-line bg-surface px-3 py-2 shadow-pop">
      <div className="text-[13px] font-semibold text-ink">{pct(m.rate)} quay lại</div>
      <div className="mb-1.5 text-2xs text-ink-3">{m.label} · {num(m.total)} khách</div>
      {[...SEGMENTS].reverse().map((s) => (
        <div key={s.key} className="flex items-center justify-between gap-3 text-2xs">
          <span className="flex items-center gap-1.5 text-ink-2">
            <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
          <span className="num font-medium text-ink">{num(m[s.key])}</span>
        </div>
      ))}
    </div>
  );
}

export function RetentionCard({ className }: { className?: string }) {
  const { data, isLoading } = useGet<Retention>('/dashboard/retention', undefined, { refetchInterval: 5 * 60_000 });
  const [active, setActive] = useState<number | null>(null);
  const n = data?.months.length ?? 0;

  return (
    <ChartCard
      className={className}
      title="Tỷ lệ khách quay lại"
      subtitle={
        isLoading ? <Skeleton className="h-7 w-36" /> : (
          <div className="flex items-baseline gap-2">
            <span className="text-[22px] font-semibold tracking-tight text-ink">{pct(data?.rate)}</span>
            <StatBadge value={data?.change} />
            <span className="text-xs text-ink-3">so với tháng trước</span>
          </div>
        )
      }
      moreLink="/customers"
    >
      {/* Chú giải luôn hiển thị -> không phụ thuộc màu */}
      <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1">
        {SEGMENTS.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-2xs text-ink-2">
            <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      {isLoading ? <Skeleton className="h-[150px] w-full" /> : (
        <div className="h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data?.months}
              margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
              onMouseMove={(s) => setActive(typeof s?.activeTooltipIndex === 'number' ? s.activeTooltipIndex : null)}
              onMouseLeave={() => setActive(null)}
            >
              <CartesianGrid vertical={false} stroke="rgb(var(--chart-grid))" />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'rgb(var(--line-strong))' }} tick={({ x, y, payload, index }) => (
                <text x={x} y={Number(y) + 12} textAnchor="middle" fontSize={11} fontWeight={index === (active ?? n - 1) ? 600 : 400} fill={index === (active ?? n - 1) ? 'rgb(var(--ink))' : 'rgb(var(--ink-3))'}>
                  {payload.value}
                </text>
              )} />
              <Tooltip cursor={{ fill: 'rgb(var(--muted))', opacity: 0.6 }} content={<RetentionTooltip />} isAnimationActive={false} />
              {SEGMENTS.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  stackId="r"
                  fill={s.color}
                  maxBarSize={22}
                  // Khe 2px màu nền giữa các đoạn chồng
                  stroke="rgb(var(--surface))"
                  strokeWidth={2}
                  radius={i === SEGMENTS.length - 1 ? [4, 4, 0, 0] : 0}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
