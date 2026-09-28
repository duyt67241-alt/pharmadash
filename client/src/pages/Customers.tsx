import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Award, Crown, Heart, Medal, Users } from 'lucide-react';
import { useGet } from '../api/hooks';
import type { CustomerRow, Paged } from '../api/types';
import { dateTimeVN, dateVN, num, PAYMENT_LABEL, timeAgo, vnd, vndCompact } from '../lib/format';
import { DataTable, type Column, type SortState } from '../components/data/DataTable';
import { useUrlParam } from '../components/data/Filters';
import { Badge, type Tone } from '../components/ui/Badge';
import { Drawer } from '../components/ui/Modal';
import { Avatar, MiniStat, PageHeader, SearchInput } from '../components/ui/Misc';
import { Segmented } from '../components/ui/Segmented';
import { Skeleton } from '../components/ui/Skeleton';

export const TIER_TONE: Record<string, Tone> = { 'Vàng': 'warning', 'Bạc': 'info', 'Thường': 'neutral' };

interface CustomerDetail extends Omit<CustomerRow, 'orders'> {
  stats: { orders: number; spent: number; avg: number };
  favorites: { name: string; unit: string; quantity: number; times: number }[];
  orders: { id: number; code: string; created_at: string; total: number; status: string; payment_method: string; branch: string; staff: string; items: number }[];
}

export default function Customers() {
  const [q, setQ] = useState('');
  const [tier, setTier] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ sort: 'spent', dir: 'desc' });
  const [openId, setOpenId] = useUrlParam('id');
  const { data, isLoading, isFetching } = useGet<Paged<CustomerRow, { total: number; gold: number; silver: number; active30: number }>>(
    '/customers', { q, tier, page, pageSize: 20, ...sort },
  );
  const s = data?.summary;

  const columns: Column<CustomerRow>[] = [
    {
      key: 'name', header: 'Khách hàng', sortable: true,
      render: (c) => (
        <div className="flex items-center gap-3">
          <Avatar name={c.name} />
          <div><div className="font-medium text-ink">{c.name}</div><div className="text-2xs text-ink-3">{c.phone}</div></div>
        </div>
      ),
    },
    { key: 'tier', header: 'Hạng', render: (c) => <Badge tone={TIER_TONE[c.tier]}>{c.tier}</Badge> },
    { key: 'orders', header: 'Số đơn', align: 'right', sortable: true, render: (c) => <span className="num">{num(c.orders)}</span> },
    { key: 'spent', header: 'Tổng chi tiêu', align: 'right', sortable: true, render: (c) => <span className="num font-semibold">{vnd(c.spent)}</span> },
    { key: 'points', header: 'Điểm', align: 'right', hideBelow: 'lg', render: (c) => <span className="num text-ink-2">{num(c.points)}</span> },
    { key: 'last_order', header: 'Mua gần nhất', sortable: true, hideBelow: 'md', render: (c) => <span className="text-ink-2">{c.last_order ? timeAgo(c.last_order) : '—'}</span> },
  ];

  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Khách hàng" description="Khách thành viên, lịch sử mua hàng và hạng thân thiết (Vàng ≥ 8 triệu, Bạc ≥ 3 triệu)" />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat icon={<Users />} label="Khách thành viên" value={s ? num(s.total) : <Skeleton className="h-6 w-12" />} />
        <MiniStat icon={<Crown />} label="Hạng Vàng" value={s ? num(s.gold) : <Skeleton className="h-6 w-12" />} />
        <MiniStat icon={<Medal />} label="Hạng Bạc" value={s ? num(s.silver) : <Skeleton className="h-6 w-12" />} />
        <MiniStat icon={<Activity />} label="Mua trong 30 ngày" value={s ? num(s.active30) : <Skeleton className="h-6 w-12" />} />
      </div>
      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <SearchInput className="w-full sm:w-72" placeholder="Tên hoặc số điện thoại" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          <Segmented
            value={tier}
            onChange={(v) => { setTier(v); setPage(1); }}
            options={[{ value: '', label: 'Tất cả' }, { value: 'Vàng', label: 'Vàng' }, { value: 'Bạc', label: 'Bạc' }, { value: 'Thường', label: 'Thường' }]}
            ariaLabel="Hạng khách"
          />
        </div>
        <DataTable columns={columns} rows={data?.rows} rowKey={(c) => c.id} loading={isLoading} fetching={isFetching}
          sort={sort} onSort={(v) => { setSort(v); setPage(1); }} page={page} pageSize={20} total={data?.total} onPage={setPage}
          onRowClick={(c) => setOpenId(String(c.id))} />
      </div>
      <CustomerDrawer id={openId ? Number(openId) : null} onClose={() => setOpenId(null)} />
    </div>
  );
}

function CustomerDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const nav = useNavigate();
  const { data: c, isLoading } = useGet<CustomerDetail>(id ? `/customers/${id}` : null);
  return (
    <Drawer open={!!id} onClose={onClose} title={c?.name ?? 'Khách hàng'} subtitle={c && `${c.phone} · khách từ ${dateVN(c.created_at)}`}>
      {isLoading || !c ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar name={c.name} size="lg" />
            <div>
              <div className="flex items-center gap-2"><Badge tone={TIER_TONE[c.tier]}><Award className="h-3 w-3" />Hạng {c.tier}</Badge><span className="num text-xs text-ink-3">{num(c.points)} điểm</span></div>
              <div className="mt-1 text-xs text-ink-3">{c.gender} · sinh năm {c.birth_year}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[['Số đơn', num(c.stats.orders)], ['Tổng chi tiêu', vndCompact(c.stats.spent)], ['TB / đơn', vndCompact(c.stats.avg)]].map(([l, v]) => (
              <div key={l} className="rounded-card bg-surface-2 p-3 ring-1 ring-inset ring-line">
                <div className="text-2xs text-ink-3">{l}</div>
                <div className="text-lg font-semibold text-ink">{v}</div>
              </div>
            ))}
          </div>
          {c.favorites.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-ink"><Heart className="h-4 w-4 text-ink-3" /> Thường mua</h3>
              <div className="flex flex-wrap gap-1.5">
                {c.favorites.map((f) => <Badge key={f.name} tone="primary">{f.name} · {f.times} lần</Badge>)}
              </div>
            </div>
          )}
          <div>
            <h3 className="mb-2 text-[13px] font-semibold text-ink">Lịch sử mua hàng ({c.orders.length})</h3>
            <div className="divide-y divide-line rounded-card ring-1 ring-inset ring-line">
              {c.orders.map((o) => (
                <button key={o.id} onClick={() => nav(`/orders?id=${o.id}`)} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-surface-2">
                  <div>
                    <div className="text-[13px] font-medium text-ink">{o.code} {o.status === 'refunded' && <Badge tone="danger">Hoàn trả</Badge>}</div>
                    <div className="num text-2xs text-ink-3">{dateTimeVN(o.created_at)} · {o.branch} · {PAYMENT_LABEL[o.payment_method]}</div>
                  </div>
                  <span className="num shrink-0 text-[13px] font-semibold text-ink">{vnd(o.total)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
