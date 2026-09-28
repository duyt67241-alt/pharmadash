import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Boxes, FileSpreadsheet, FileText, Receipt, TrendingUp, Wallet, Calculator, PackageX, Coins } from 'lucide-react';
import { download } from '../api/client';
import { useGet } from '../api/hooks';
import { axisVnd, dateVN, niceTicks, num, pct, vnd, vndCompact } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/cn';
import { DateRangeFilter, presetRange, type DateRange } from '../components/data/Filters';
import { Button } from '../components/ui/Button';
import { MiniStat, PageHeader } from '../components/ui/Misc';
import { Skeleton } from '../components/ui/Skeleton';
import { ChartCard } from '../components/widgets/ChartCard';
import { useToast } from '../components/ui/Toast';

interface RevenueReport {
  from: string;
  to: string;
  summary: { revenue: number; cost: number; profit: number; orders: number; customers: number; avg_order: number };
  daily: { date: string; orders: number; revenue: number; cost: number; profit: number }[];
  categories: { name: string; revenue: number; quantity: number }[];
  topMedicines: { code: string; name: string; unit: string; quantity: number; revenue: number }[];
  payments: { method: string; label: string; orders: number; revenue: number }[];
  staff: { name: string; branch: string; orders: number; revenue: number }[];
}
interface InventoryReport {
  summary: { items: number; units: number; value: number; retail_value: number; out: number; low: number };
}

function SimpleTable({ head, rows, align }: { head: string[]; rows: (string | number)[][]; align?: ('l' | 'r')[] }) {
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="border-b border-line">
          {head.map((h, i) => <th key={h} className={cn('py-2 text-2xs font-semibold uppercase text-ink-3', align?.[i] === 'r' ? 'text-right' : 'text-left')}>{h}</th>)}
        </tr>
      </thead>
      <tbody className="num">
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-line last:border-0">
            {r.map((c, j) => <td key={j} className={cn('py-2', align?.[j] === 'r' ? 'text-right' : 'text-left', j === 0 ? 'text-ink' : 'text-ink-2')}>{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Reports() {
  const toast = useToast();
  const [range, setRange] = useState<DateRange>(() => presetRange('30d'));
  const { data: r, isLoading, isFetching } = useGet<RevenueReport>('/reports/revenue', { from: range.from, to: range.to });
  const { data: inv } = useGet<InventoryReport>('/reports/inventory');
  const s = r?.summary;
  const dailyTicks = niceTicks(Math.max(0, ...(r?.daily.map((d) => d.revenue) ?? [0])));
  const { branchId } = useAuth();

  const exp = (path: string, params?: Record<string, string>) => {
    download(path, params);
    toast('Đang tạo file báo cáo...', 'info');
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <PageHeader
        title="Báo cáo"
        description="Xem trước và xuất báo cáo doanh thu, tồn kho dạng CSV (mở bằng Excel) hoặc PDF"
        actions={<DateRangeFilter value={range} onChange={setRange} allowAll={false} />}
      />

      {/* ------- Doanh thu ------- */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-ink">Báo cáo doanh thu <span className="num font-normal text-ink-3">· {dateVN(range.from)} – {dateVN(range.to)}</span></h2>
          <div className="flex gap-2">
            <Button size="sm" icon={<FileSpreadsheet className="h-4 w-4" />} onClick={() => exp('/reports/revenue.csv', { from: range.from, to: range.to })}>Xuất CSV</Button>
            <Button size="sm" variant="primary" icon={<FileText className="h-4 w-4" />} onClick={() => exp('/reports/revenue.pdf', { from: range.from, to: range.to })}>Xuất PDF</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MiniStat icon={<Wallet />} label="Doanh thu" value={s ? vndCompact(s.revenue) : <Skeleton className="h-6 w-16" />} />
          <MiniStat icon={<TrendingUp />} label="Lợi nhuận gộp" value={s ? vndCompact(s.profit) : <Skeleton className="h-6 w-16" />} hint={s && `Biên ${pct(s.revenue ? (s.profit / s.revenue) * 100 : 0)}`} />
          <MiniStat icon={<Receipt />} label="Số đơn hàng" value={s ? num(s.orders) : <Skeleton className="h-6 w-16" />} />
          <MiniStat icon={<Calculator />} label="Giá trị TB / đơn" value={s ? vnd(s.avg_order) : <Skeleton className="h-6 w-16" />} />
        </div>

        <ChartCard title="Doanh thu theo ngày" subtitle={<span className="text-xs text-ink-3">Cột tím đậm: ngày cao nhất</span>}>
          {isLoading ? <Skeleton className="h-56 w-full" /> : (
            <div className={cn('h-56 transition-opacity', isFetching && 'opacity-60')}>
              <ResponsiveContainer>
                <BarChart data={r?.daily} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgb(var(--chart-grid))" />
                  <XAxis dataKey="date" tickFormatter={(d: string) => `${d.slice(8)}/${d.slice(5, 7)}`} tickLine={false} axisLine={{ stroke: 'rgb(var(--line-strong))' }} tick={{ fill: 'rgb(var(--ink-3))', fontSize: 11 }} minTickGap={12} />
                  <YAxis ticks={dailyTicks} domain={[0, dailyTicks[dailyTicks.length - 1]]} tickFormatter={axisVnd} tickLine={false} axisLine={false} tick={{ fill: 'rgb(var(--ink-3))', fontSize: 11 }} width={48} />
                  <Tooltip
                    cursor={{ fill: 'rgb(var(--muted))', opacity: 0.6 }}
                    content={({ active, payload }) => active && payload?.length ? (
                      <div className="rounded-lg border border-line bg-surface px-3 py-2 shadow-pop">
                        <div className="text-[13px] font-semibold text-ink">{vnd(payload[0].payload.revenue)}</div>
                        <div className="text-2xs text-ink-3">{dateVN(payload[0].payload.date)} · {num(payload[0].payload.orders)} đơn · LN {vndCompact(payload[0].payload.profit)}</div>
                      </div>
                    ) : null}
                  />
                  <Bar
                    dataKey="revenue"
                    maxBarSize={24}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                    shape={(p: unknown) => {
                      const { x, y, width, height, payload } = p as { x: number; y: number; width: number; height: number; payload: { revenue: number } };
                      const maxRev = Math.max(...(r?.daily.map((d) => d.revenue) ?? [0]));
                      const r4 = Math.min(4, height);
                      return <path d={`M${x},${y + height}V${y + r4}Q${x},${y} ${x + r4},${y}H${x + width - r4}Q${x + width},${y} ${x + width},${y + r4}V${y + height}Z`} fill={payload.revenue === maxRev ? 'rgb(var(--primary))' : 'rgb(var(--chart-1))'} />;
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard title="Theo nhóm thuốc">
            {r ? <SimpleTable head={['Nhóm', 'Số lượng', 'Doanh thu', 'Tỷ trọng']} align={['l', 'r', 'r', 'r']}
              rows={r.categories.map((c) => [c.name, num(c.quantity), vnd(c.revenue), pct((c.revenue / (s!.revenue || 1)) * 100)])} /> : <Skeleton className="h-60 w-full" />}
          </ChartCard>
          <ChartCard title="Top 10 thuốc bán chạy">
            {r ? <SimpleTable head={['Thuốc', 'Số lượng', 'Doanh thu']} align={['l', 'r', 'r']}
              rows={r.topMedicines.map((m) => [m.name, `${num(m.quantity)} ${m.unit.toLowerCase()}`, vnd(m.revenue)])} /> : <Skeleton className="h-60 w-full" />}
          </ChartCard>
          <ChartCard title="Theo phương thức thanh toán">
            {r ? <SimpleTable head={['Phương thức', 'Số đơn', 'Doanh thu', 'Tỷ trọng']} align={['l', 'r', 'r', 'r']}
              rows={r.payments.map((p) => [p.label, num(p.orders), vnd(p.revenue), pct((p.revenue / (s!.revenue || 1)) * 100)])} /> : <Skeleton className="h-40 w-full" />}
          </ChartCard>
          <ChartCard title="Theo nhân viên">
            {r ? <SimpleTable head={['Nhân viên', 'Chi nhánh', 'Số đơn', 'Doanh thu']} align={['l', 'l', 'r', 'r']}
              rows={r.staff.map((x) => [x.name, x.branch, num(x.orders), vnd(x.revenue)])} /> : <Skeleton className="h-40 w-full" />}
          </ChartCard>
        </div>
      </section>

      {/* ------- Tồn kho ------- */}
      <section className="space-y-4 border-t border-line pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-ink">Báo cáo tồn kho <span className="font-normal text-ink-3">· tại thời điểm hiện tại</span></h2>
          <div className="flex gap-2">
            <Button size="sm" icon={<FileSpreadsheet className="h-4 w-4" />} onClick={() => exp('/reports/inventory.csv')}>Xuất CSV</Button>
            <Button size="sm" variant="primary" icon={<FileText className="h-4 w-4" />} onClick={() => exp('/reports/inventory.pdf')}>Xuất PDF</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MiniStat icon={<Boxes />} label="Mặt hàng / số lượng" value={inv ? `${num(inv.summary.items)} / ${num(inv.summary.units)}` : <Skeleton className="h-6 w-16" />} />
          <MiniStat icon={<Coins />} label="Giá trị tồn (giá nhập)" value={inv ? vndCompact(inv.summary.value) : <Skeleton className="h-6 w-16" />} />
          <MiniStat icon={<Wallet />} label="Giá trị theo giá bán" value={inv ? vndCompact(inv.summary.retail_value) : <Skeleton className="h-6 w-16" />} />
          <MiniStat icon={<PackageX />} label="Hết / sắp hết hàng" value={inv ? `${inv.summary.out} / ${inv.summary.low}` : <Skeleton className="h-6 w-16" />} hint={!branchId ? 'cộng gộp tồn các chi nhánh' : undefined} />
        </div>
      </section>
    </div>
  );
}
