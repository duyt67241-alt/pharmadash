import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, ReceiptText, ShoppingBag, Wallet, Calculator } from 'lucide-react';
import { useGet } from '../api/hooks';
import type { OrderDetail, OrderRow, Paged } from '../api/types';
import { useAuth, useCan } from '../context/AuthContext';
import { dateTimeVN, num, PAYMENT_LABEL, vnd, vndCompact } from '../lib/format';
import { DataTable, type Column, type SortState } from '../components/data/DataTable';
import { DateRangeFilter, presetRange, useUrlParam, type DateRange } from '../components/data/Filters';
import { Badge, type Tone } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Drawer } from '../components/ui/Modal';
import { MiniStat, PageHeader, SearchInput, Select } from '../components/ui/Misc';
import { Skeleton } from '../components/ui/Skeleton';

const PAY_TONE: Record<string, Tone> = { cash: 'neutral', transfer: 'info', ewallet: 'primary', card: 'warning' };

export default function Orders() {
  const { user } = useAuth();
  const can = useCan();
  const [range, setRange] = useState<DateRange>(() => presetRange('7d'));
  const [q, setQ] = useState('');
  const [staff, setStaff] = useState('');
  const [payment, setPayment] = useState('');
  const [status, setStatus] = useState('');
  const [customer, setCustomer] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ sort: 'created_at', dir: 'desc' });
  const [openId, setOpenId] = useUrlParam('id');

  const params = { from: range.from, to: range.to, q, staff, payment, status, customer, page, pageSize: 20, ...sort };
  const { data, isLoading, isFetching } = useGet<Paged<OrderRow, { count: number; revenue: number; avg: number }>>('/orders', params);
  const { data: staffList } = useGet<{ id: number; full_name: string }[]>(can.viewStaff ? '/orders-filters/staff' : null);

  const reset = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

  const columns: Column<OrderRow>[] = [
    { key: 'code', header: 'Mã đơn', sortable: true, render: (o) => <span className="font-medium text-ink">{o.code}</span> },
    { key: 'created_at', header: 'Thời gian', sortable: true, render: (o) => <span className="num text-ink-2">{dateTimeVN(o.created_at)}</span> },
    {
      key: 'customer', header: 'Khách hàng',
      render: (o) => o.customer ? (
        <div><div className="text-ink">{o.customer}</div><div className="text-2xs text-ink-3">{o.customer_phone}</div></div>
      ) : <span className="text-ink-3">Khách lẻ</span>,
    },
    { key: 'staff', header: 'Nhân viên', hideBelow: 'lg', render: (o) => <span className="text-ink-2">{o.staff}</span> },
    ...(user?.role === 'owner' ? [{ key: 'branch', header: 'Chi nhánh', hideBelow: 'xl' as const, render: (o: OrderRow) => <span className="text-ink-2">{o.branch}</span> }] : []),
    { key: 'items', header: 'SL', align: 'right', hideBelow: 'md', render: (o) => <span className="num">{o.items}</span> },
    { key: 'payment', header: 'Thanh toán', hideBelow: 'sm', render: (o) => <Badge tone={PAY_TONE[o.payment_method]}>{PAYMENT_LABEL[o.payment_method]}</Badge> },
    { key: 'total', header: 'Tổng tiền', align: 'right', sortable: true, render: (o) => <span className="num font-semibold">{vnd(o.total)}</span> },
    {
      key: 'status', header: 'Trạng thái', hideBelow: 'md',
      render: (o) => o.status === 'completed' ? <Badge tone="success" dot>Hoàn tất</Badge> : <Badge tone="danger" dot>Hoàn trả</Badge>,
    },
  ];

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Đơn hàng"
        description={user?.role === 'staff' ? 'Các đơn bạn đã bán' : 'Toàn bộ hóa đơn bán hàng, lọc theo ngày, nhân viên và phương thức thanh toán'}
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MiniStat icon={<ShoppingBag />} label="Số đơn" value={data ? num(data.summary.count) : <Skeleton className="h-6 w-16" />} />
        <MiniStat icon={<Wallet />} label="Doanh thu (đơn hoàn tất)" value={data ? vndCompact(data.summary.revenue) : <Skeleton className="h-6 w-20" />} />
        <MiniStat icon={<Calculator />} label="Giá trị trung bình / đơn" value={data ? vnd(data.summary.avg) : <Skeleton className="h-6 w-20" />} />
      </div>

      <div className="card">
        {/* Bộ lọc: 1 hàng phía trên bảng */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <SearchInput className="w-full sm:w-64" placeholder="Mã đơn, tên hoặc SĐT khách" value={q} onChange={(e) => reset(setQ)(e.target.value)} />
          <DateRangeFilter value={range} onChange={reset(setRange)} />
          {can.viewStaff && (
            <Select className="w-auto" value={staff} onChange={(e) => reset(setStaff)(e.target.value)} aria-label="Nhân viên">
              <option value="">Tất cả nhân viên</option>
              {staffList?.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </Select>
          )}
          <Select className="w-auto" value={payment} onChange={(e) => reset(setPayment)(e.target.value)} aria-label="Thanh toán">
            <option value="">Mọi thanh toán</option>
            {Object.entries(PAYMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Select className="w-auto" value={customer} onChange={(e) => reset(setCustomer)(e.target.value)} aria-label="Loại khách">
            <option value="">Mọi khách</option>
            <option value="member">Khách thành viên</option>
            <option value="walkin">Khách lẻ</option>
          </Select>
          <Select className="w-auto" value={status} onChange={(e) => reset(setStatus)(e.target.value)} aria-label="Trạng thái">
            <option value="">Mọi trạng thái</option>
            <option value="completed">Hoàn tất</option>
            <option value="refunded">Hoàn trả</option>
          </Select>
        </div>
        <DataTable
          columns={columns}
          rows={data?.rows}
          rowKey={(o) => o.id}
          loading={isLoading}
          fetching={isFetching}
          sort={sort}
          onSort={(s) => { setSort(s); setPage(1); }}
          page={page}
          pageSize={20}
          total={data?.total}
          onPage={setPage}
          onRowClick={(o) => setOpenId(String(o.id))}
        />
      </div>

      <OrderDrawer id={openId ? Number(openId) : null} onClose={() => setOpenId(null)} />
    </div>
  );
}

export function OrderDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const nav = useNavigate();
  const { data: o, isLoading } = useGet<OrderDetail>(id ? `/orders/${id}` : null);
  return (
    <Drawer
      open={!!id}
      onClose={onClose}
      title={o ? `Đơn hàng ${o.code}` : 'Chi tiết đơn hàng'}
      subtitle={o && <span className="num">{dateTimeVN(o.created_at)} · {o.branch}</span>}
      footer={<Button icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>In hóa đơn</Button>}
    >
      {isLoading || !o ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {o.status === 'completed' ? <Badge tone="success" dot>Hoàn tất</Badge> : <Badge tone="danger" dot>Hoàn trả</Badge>}
            <Badge tone={PAY_TONE[o.payment_method]}>{PAYMENT_LABEL[o.payment_method]}</Badge>
            {o.items.some((i) => i.requires_rx) && <Badge tone="warning">Có thuốc kê đơn</Badge>}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-card bg-surface-2 p-4 text-[13px] ring-1 ring-inset ring-line">
            <div><dt className="text-2xs text-ink-3">Khách hàng</dt>
              <dd className="font-medium text-ink">
                {o.customer ? <button className="hover:text-primary" onClick={() => nav(`/customers?id=${o.customer_id}`)}>{o.customer}</button> : 'Khách lẻ'}
              </dd>
              {o.customer_phone && <dd className="text-2xs text-ink-3">{o.customer_phone} · Hạng {o.customer_tier}</dd>}
            </div>
            <div><dt className="text-2xs text-ink-3">Nhân viên bán</dt><dd className="font-medium text-ink">{o.staff}</dd></div>
            <div className="col-span-2"><dt className="text-2xs text-ink-3">Chi nhánh</dt><dd className="text-ink">{o.branch} · {o.branch_address}</dd></div>
          </dl>

          <div>
            <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-ink"><ReceiptText className="h-4 w-4 text-ink-3" /> Sản phẩm ({o.items.length})</h3>
            <div className="divide-y divide-line rounded-card ring-1 ring-inset ring-line">
              {o.items.map((it) => (
                <div key={it.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-medium text-ink">{it.name} {it.requires_rx ? <Badge tone="warning" className="ml-1">Rx</Badge> : null}</div>
                    <div className="text-2xs text-ink-3">{it.code} · Lô {it.batch_no ?? '—'} · {num(it.quantity)} {it.unit.toLowerCase()} × {vnd(it.unit_price)}</div>
                  </div>
                  <div className="num shrink-0 font-medium text-ink">{vnd(it.amount)}</div>
                </div>
              ))}
            </div>
          </div>

          <dl className="num space-y-1.5 text-[13px]">
            <div className="flex justify-between text-ink-2"><dt>Tạm tính</dt><dd>{vnd(o.subtotal)}</dd></div>
            <div className="flex justify-between text-ink-2"><dt>Chiết khấu thành viên</dt><dd>{o.discount ? `−${vnd(o.discount)}` : '0 đ'}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-semibold text-ink"><dt>Tổng thanh toán</dt><dd>{vnd(o.total)}</dd></div>
          </dl>
        </div>
      )}
    </Drawer>
  );
}
