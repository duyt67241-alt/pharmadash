import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { AlertTriangle, Archive, Boxes, Coins, Pencil, Plus, Trash2, Truck, PackageX } from 'lucide-react';
import { api, ApiError } from '../api/client';
import { useApiMutation, useGet } from '../api/hooks';
import type { ExpiringBatch, LowStockRow, MedicineDetail, MedicineRow, Paged, Supplier } from '../api/types';
import { useCan } from '../context/AuthContext';
import { dateVN, num, vnd, vndCompact } from '../lib/format';
import { cn } from '../lib/cn';
import { DataTable, type Column, type SortState } from '../components/data/DataTable';
import { useUrlParam } from '../components/data/Filters';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Drawer, Modal } from '../components/ui/Modal';
import { Field, MiniStat, PageHeader, ProgressBar, SearchInput, Select } from '../components/ui/Misc';
import { Segmented, Tabs } from '../components/ui/Segmented';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';

type Tab = 'list' | 'expiring' | 'low';

const STATUS = {
  ok: { label: 'Đủ hàng', tone: 'success' as const },
  low: { label: 'Sắp hết', tone: 'warning' as const },
  out: { label: 'Hết hàng', tone: 'danger' as const },
};

/** Badge số ngày còn lại tới hạn dùng. */
export function ExpiryBadge({ days }: { days: number }) {
  if (days < 0) return <Badge tone="danger" dot>Quá hạn {Math.abs(days)} ngày</Badge>;
  if (days <= 30) return <Badge tone="danger" dot>Còn {days} ngày</Badge>;
  if (days <= 60) return <Badge tone="warning" dot>Còn {days} ngày</Badge>;
  if (days <= 90) return <Badge tone="info" dot>Còn {days} ngày</Badge>;
  return <Badge tone="neutral">Còn {days} ngày</Badge>;
}

export default function Inventory() {
  const can = useCan();
  const [tab, setTab] = useUrlParam('tab', 'list');
  const [openId, setOpenId] = useUrlParam('id');
  const [editing, setEditing] = useState<MedicineRow | 'new' | null>(null);
  const { data: counts } = useGet<{ expiring: number; lowStock: number }>('/meta/sidebar');
  const { data: exp90 } = useGet<ExpiringBatch[]>('/inventory/alerts', { type: 'expiring', days: 90 });

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Kho thuốc"
        description="Danh mục thuốc, tồn kho theo lô và cảnh báo hạn dùng / hết hàng"
        actions={can.manageInventory && <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>Thêm thuốc</Button>}
      />
      <div className="mb-4">
        <Tabs<Tab>
          value={tab as Tab}
          onChange={setTab}
          tabs={[
            { value: 'list', label: 'Danh sách thuốc' },
            { value: 'expiring', label: 'Sắp hết hạn', count: exp90?.length },
            { value: 'low', label: 'Sắp hết hàng', count: counts?.lowStock },
          ]}
        />
      </div>
      {tab === 'list' && <MedicineList onOpen={(id) => setOpenId(String(id))} />}
      {tab === 'expiring' && <ExpiringTab onOpen={(id) => setOpenId(String(id))} />}
      {tab === 'low' && <LowStockTab onOpen={(id) => setOpenId(String(id))} />}

      <MedicineDrawer id={openId ? Number(openId) : null} onClose={() => setOpenId(null)} onEdit={(m) => setEditing(m)} />
      {editing && <MedicineForm initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

// ---------------- Danh sách ----------------
function MedicineList({ onOpen }: { onOpen: (id: number) => void }) {
  const can = useCan();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [rx, setRx] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ sort: 'name', dir: 'asc' });
  const { data: cats } = useGet<{ id: number; name: string }[]>('/meta/categories', undefined, { staleTime: Infinity });
  const { data, isLoading, isFetching } = useGet<Paged<MedicineRow, { total: number; out: number; low: number; value?: number }>>(
    '/medicines', { q, category, status, rx, page, pageSize: 15, ...sort },
  );
  const s = data?.summary;
  const reset = (fn: (v: string) => void) => (v: string) => { fn(v); setPage(1); };

  const columns: Column<MedicineRow>[] = [
    { key: 'code', header: 'Mã', sortable: true, hideBelow: 'md', render: (m) => <span className="num text-ink-3">{m.code}</span> },
    {
      key: 'name', header: 'Tên thuốc', sortable: true,
      render: (m) => (
        <div className="min-w-[180px]">
          <div className="flex items-center gap-1.5 font-medium text-ink">
            {m.name}
            {!!m.requires_rx && <Badge tone="warning" className="!px-1.5">Rx</Badge>}
          </div>
          <div className="truncate text-2xs text-ink-3">{m.active_ingredient}</div>
        </div>
      ),
    },
    { key: 'category', header: 'Nhóm', sortable: true, hideBelow: 'lg', render: (m) => <span className="text-ink-2">{m.category}</span> },
    { key: 'unit', header: 'ĐVT', hideBelow: 'xl', render: (m) => <span className="text-ink-2">{m.unit}</span> },
    ...(can.viewCost ? [{ key: 'purchase_price', header: 'Giá nhập', align: 'right' as const, hideBelow: 'xl' as const, render: (m: MedicineRow) => <span className="num text-ink-2">{vnd(m.purchase_price)}</span> }] : []),
    { key: 'sale_price', header: 'Giá bán', align: 'right', sortable: true, render: (m) => <span className="num">{vnd(m.sale_price)}</span> },
    {
      key: 'stock', header: 'Tồn kho', align: 'right', sortable: true,
      render: (m) => (
        <div className="flex flex-col items-end gap-1">
          <span className="num font-semibold">{num(m.stock)}</span>
          {m.status !== 'ok' && <Badge tone={STATUS[m.status].tone}>{STATUS[m.status].label}</Badge>}
        </div>
      ),
    },
    { key: 'nearest_expiry', header: 'Hạn gần nhất', sortable: true, hideBelow: 'md', render: (m) => <span className="num text-ink-2">{dateVN(m.nearest_expiry)}</span> },
  ];

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat icon={<Boxes />} label="Mặt hàng đang bán" value={s ? num(s.total) : <Skeleton className="h-6 w-12" />} />
        <MiniStat icon={<PackageX />} label="Hết hàng" value={s ? num(s.out) : <Skeleton className="h-6 w-12" />} hint="tính trên phạm vi đang xem" />
        <MiniStat icon={<AlertTriangle />} label="Dưới mức tối thiểu" value={s ? num(s.low) : <Skeleton className="h-6 w-12" />} />
        {can.viewCost && <MiniStat icon={<Coins />} label="Giá trị tồn (giá nhập)" value={s?.value !== undefined ? vndCompact(s.value) : <Skeleton className="h-6 w-16" />} />}
      </div>
      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <SearchInput className="w-full sm:w-72" placeholder="Tên thuốc, mã, hoạt chất (không cần dấu)" value={q} onChange={(e) => reset(setQ)(e.target.value)} />
          <Select className="w-auto" value={category} onChange={(e) => reset(setCategory)(e.target.value)} aria-label="Nhóm thuốc">
            <option value="">Tất cả nhóm</option>
            {cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select className="w-auto" value={status} onChange={(e) => reset(setStatus)(e.target.value)} aria-label="Tình trạng">
            <option value="">Mọi tình trạng</option>
            <option value="ok">Đủ hàng</option>
            <option value="low">Sắp hết</option>
            <option value="out">Hết hàng</option>
          </Select>
          <Select className="w-auto" value={rx} onChange={(e) => reset(setRx)(e.target.value)} aria-label="Loại thuốc">
            <option value="">Kê đơn & không kê đơn</option>
            <option value="1">Thuốc kê đơn (Rx)</option>
            <option value="0">Không kê đơn (OTC)</option>
          </Select>
        </div>
        <DataTable
          columns={columns} rows={data?.rows} rowKey={(m) => m.id} loading={isLoading} fetching={isFetching}
          sort={sort} onSort={(v) => { setSort(v); setPage(1); }}
          page={page} pageSize={15} total={data?.total} onPage={setPage} onRowClick={(m) => onOpen(m.id)}
        />
      </div>
    </>
  );
}

// ---------------- Sắp hết hạn ----------------
function ExpiringTab({ onOpen }: { onOpen: (id: number) => void }) {
  const can = useCan();
  const [daysParam, setDays] = useUrlParam('days', '90');
  const days = daysParam as '30' | '60' | '90';
  const { data, isLoading, isFetching } = useGet<ExpiringBatch[]>('/inventory/alerts', { type: 'expiring', days });
  const total = data?.reduce((s, b) => s + (b.value ?? 0), 0) ?? 0;

  const columns: Column<ExpiringBatch>[] = [
    { key: 'name', header: 'Thuốc', render: (b) => <div><div className="font-medium text-ink">{b.name}</div><div className="text-2xs text-ink-3">{b.code}</div></div> },
    { key: 'batch_no', header: 'Số lô', render: (b) => <span className="num text-ink-2">{b.batch_no}</span> },
    { key: 'branch', header: 'Chi nhánh', hideBelow: 'md', render: (b) => <span className="text-ink-2">{b.branch}</span> },
    { key: 'quantity', header: 'Số lượng', align: 'right', render: (b) => <span className="num">{num(b.quantity)} {b.unit.toLowerCase()}</span> },
    { key: 'expiry_date', header: 'Hạn dùng', render: (b) => <span className="num">{dateVN(b.expiry_date)}</span> },
    { key: 'days_left', header: 'Còn lại', render: (b) => <ExpiryBadge days={b.days_left} /> },
    ...(can.viewCost ? [{ key: 'value', header: 'Giá trị (giá nhập)', align: 'right' as const, hideBelow: 'lg' as const, render: (b: ExpiringBatch) => <span className="num">{vnd(b.value)}</span> }] : []),
  ];

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-3">
        <Segmented
          value={days}
          onChange={(v) => setDays(v)}
          options={[{ value: '30', label: '≤ 30 ngày' }, { value: '60', label: '≤ 60 ngày' }, { value: '90', label: '≤ 90 ngày' }]}
          ariaLabel="Khoảng hạn dùng"
        />
        <div className="text-xs text-ink-3">
          {data ? `${data.length} lô` : '…'}{can.viewCost && data ? ` · giá trị ${vnd(total)}` : ''} · gồm cả lô đã quá hạn
        </div>
      </div>
      <DataTable columns={columns} rows={data} rowKey={(b) => b.batch_id} loading={isLoading} fetching={isFetching} onRowClick={(b) => onOpen(b.medicine_id)} />
    </div>
  );
}

// ---------------- Sắp hết hàng ----------------
function LowStockTab({ onOpen }: { onOpen: (id: number) => void }) {
  const can = useCan();
  const nav = useNavigate();
  const { data, isLoading, isFetching } = useGet<LowStockRow[]>('/inventory/alerts', { type: 'low' });
  const columns: Column<LowStockRow>[] = [
    { key: 'name', header: 'Thuốc', render: (r) => <div><div className="font-medium text-ink">{r.name}</div><div className="text-2xs text-ink-3">{r.code}</div></div> },
    { key: 'branch', header: 'Chi nhánh', render: (r) => <span className="text-ink-2">{r.branch}</span> },
    {
      key: 'stock', header: 'Tồn / tối thiểu',
      render: (r) => (
        <div className="w-40">
          <div className="num mb-1 text-xs"><span className="font-semibold text-ink">{num(r.stock)}</span><span className="text-ink-3"> / {num(r.min_stock)} {r.unit.toLowerCase()}</span></div>
          <ProgressBar value={(r.stock / r.min_stock) * 100} tone={r.stock === 0 ? 'danger' : 'warning'} />
        </div>
      ),
    },
    { key: 'status', header: 'Tình trạng', render: (r) => (r.stock === 0 ? <Badge tone="danger" dot>Hết hàng</Badge> : <Badge tone="warning" dot>Sắp hết</Badge>) },
    ...(can.managePurchases
      ? [{
          key: 'action', header: '', align: 'right' as const,
          render: (r: LowStockRow) => (
            <Button size="sm" variant="soft" icon={<Truck className="h-3.5 w-3.5" />} onClick={(e) => { e.stopPropagation(); nav(`/purchases?new=1&medicine=${r.medicine_id}&branch=${r.branch_id}`); }}>
              Đặt hàng
            </Button>
          ),
        }]
      : []),
  ];
  return (
    <div className="card">
      <DataTable columns={columns} rows={data} rowKey={(r) => `${r.medicine_id}-${r.branch_id}`} loading={isLoading} fetching={isFetching} onRowClick={(r) => onOpen(r.medicine_id)} />
    </div>
  );
}

// ---------------- Chi tiết thuốc ----------------
function MedicineDrawer({ id, onClose, onEdit }: { id: number | null; onClose: () => void; onEdit: (m: MedicineRow) => void }) {
  const can = useCan();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const { data: m, isLoading } = useGet<MedicineDetail>(id ? `/medicines/${id}` : null);
  const del = useApiMutation((mid: number) => api.del(`/medicines/${mid}`), ['/medicines', '/inventory', '/meta']);

  return (
    <Drawer
      open={!!id}
      onClose={onClose}
      title={m?.name ?? 'Chi tiết thuốc'}
      subtitle={m && `${m.code} · ${m.category} · ${m.unit}`}
      footer={can.manageInventory && m && (
        <>
          <Button variant="ghost" className="mr-auto text-danger hover:bg-danger-soft hover:text-danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm(true)}>
            Ngừng kinh doanh
          </Button>
          <Button icon={<Pencil className="h-4 w-4" />} onClick={() => onEdit(m)}>Sửa thông tin</Button>
        </>
      )}
    >
      {isLoading || !m ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge tone={STATUS[m.status].tone} dot>{STATUS[m.status].label}</Badge>
            {m.requires_rx ? <Badge tone="warning">Thuốc kê đơn</Badge> : <Badge tone="neutral">Không kê đơn</Badge>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              ['Tồn kho', `${num(m.stock)}`, `tối thiểu ${num(m.min_stock)}`],
              ['Bán 30 ngày', num(m.sales30.quantity), m.unit.toLowerCase()],
              ['Doanh thu 30 ngày', vndCompact(m.sales30.revenue), ''],
            ].map(([l, v, h]) => (
              <div key={l} className="rounded-card bg-surface-2 p-3 ring-1 ring-inset ring-line">
                <div className="text-2xs text-ink-3">{l}</div>
                <div className="text-lg font-semibold text-ink">{v}</div>
                <div className="text-2xs text-ink-3">{h}</div>
              </div>
            ))}
          </div>

          {m.sales30.daily.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium text-ink-2">Số lượng bán theo ngày (30 ngày)</div>
              <div className="h-24">
                <ResponsiveContainer>
                  <BarChart data={m.sales30.daily} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <XAxis dataKey="d" hide />
                    <Tooltip
                      cursor={{ fill: 'rgb(var(--muted))' }}
                      content={({ active, payload }) => active && payload?.length ? (
                        <div className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-2xs shadow-pop">
                          <div className="text-[13px] font-semibold text-ink">{num(payload[0].payload.qty)} {m.unit.toLowerCase()}</div>
                          <div className="text-ink-3">{dateVN(payload[0].payload.d)}</div>
                        </div>
                      ) : null}
                    />
                    <Bar dataKey="qty" fill="rgb(var(--primary))" radius={[3, 3, 0, 0]} maxBarSize={10} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
            <div className="col-span-2"><dt className="text-2xs text-ink-3">Hoạt chất</dt><dd className="text-ink">{m.active_ingredient || '—'}</dd></div>
            {m.purchase_price !== undefined && <div><dt className="text-2xs text-ink-3">Giá nhập</dt><dd className="num text-ink">{vnd(m.purchase_price)}</dd></div>}
            <div><dt className="text-2xs text-ink-3">Giá bán</dt><dd className="num font-medium text-ink">{vnd(m.sale_price)}</dd></div>
            {m.purchase_price !== undefined && (
              <div><dt className="text-2xs text-ink-3">Biên lợi nhuận</dt><dd className="num text-ink">{Math.round(((m.sale_price - m.purchase_price) / m.sale_price) * 100)}%</dd></div>
            )}
            <div><dt className="text-2xs text-ink-3">Nhà cung cấp</dt><dd className="text-ink">{m.supplier ?? '—'}</dd></div>
          </dl>

          <div>
            <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-ink"><Archive className="h-4 w-4 text-ink-3" /> Lô đang tồn ({m.batches.length})</h3>
            {m.batches.length === 0 ? (
              <div className="rounded-card bg-danger-soft px-4 py-3 text-xs text-danger">Không còn lô nào trong kho.</div>
            ) : (
              <div className="divide-y divide-line rounded-card ring-1 ring-inset ring-line">
                {m.batches.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div>
                      <div className="num text-[13px] font-medium text-ink">Lô {b.batch_no}</div>
                      <div className="text-2xs text-ink-3">{b.branch} · nhập {dateVN(b.received_at)} · HSD {dateVN(b.expiry_date)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="num text-[13px] font-semibold">{num(b.quantity)}</span>
                      <ExpiryBadge days={b.days_left} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        size="sm"
        title="Ngừng kinh doanh thuốc này?"
        description="Thuốc sẽ bị ẩn khỏi danh mục, lịch sử bán hàng vẫn được giữ nguyên."
        footer={
          <>
            <Button onClick={() => setConfirm(false)}>Hủy</Button>
            <Button variant="danger" loading={del.isPending} onClick={async () => {
              await del.mutateAsync(m!.id);
              toast(`Đã ngừng kinh doanh ${m!.name}`);
              setConfirm(false);
              onClose();
            }}>Xác nhận</Button>
          </>
        }
      >
        <p className="text-[13px] text-ink-2">{m?.name} ({m?.code})</p>
      </Modal>
    </Drawer>
  );
}

// ---------------- Form thêm / sửa ----------------
interface FormState {
  code: string; name: string; active_ingredient: string; category_id: string; supplier_id: string; unit: string;
  purchase_price: string; sale_price: string; min_stock: string; requires_rx: boolean;
}

function MedicineForm({ initial, onClose }: { initial: MedicineRow | null; onClose: () => void }) {
  const toast = useToast();
  const { data: cats } = useGet<{ id: number; name: string }[]>('/meta/categories', undefined, { staleTime: Infinity });
  const { data: sups } = useGet<Supplier[]>('/suppliers');
  const [f, setF] = useState<FormState>(() => ({
    code: initial?.code ?? '',
    name: initial?.name ?? '',
    active_ingredient: initial?.active_ingredient ?? '',
    category_id: String(initial?.category_id ?? ''),
    supplier_id: String(initial?.supplier_id ?? ''),
    unit: initial?.unit ?? 'Hộp',
    purchase_price: String(initial?.purchase_price ?? ''),
    sale_price: String(initial?.sale_price ?? ''),
    min_stock: String(initial?.min_stock_branch ?? 20),
    requires_rx: !!initial?.requires_rx,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useApiMutation(
    (body: object) => (initial ? api.put(`/medicines/${initial.id}`, body) : api.post('/medicines', body)),
    ['/medicines', '/inventory', '/meta'],
  );

  useEffect(() => {
    if (!initial && !f.code) setF((s) => ({ ...s, code: `T${Math.floor(1000 + Math.random() * 8999)}` }));
  }, [initial, f.code]);

  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async () => {
    const errs: Record<string, string> = {};
    if (f.name.trim().length < 2) errs.name = 'Nhập tên thuốc';
    if (!f.category_id) errs.category_id = 'Chọn nhóm thuốc';
    if (!(Number(f.sale_price) > 0)) errs.sale_price = 'Giá bán phải lớn hơn 0';
    if (Number(f.purchase_price) > Number(f.sale_price)) errs.purchase_price = 'Giá nhập không được cao hơn giá bán';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await save.mutateAsync({
        ...f,
        category_id: Number(f.category_id),
        supplier_id: f.supplier_id ? Number(f.supplier_id) : null,
        purchase_price: Number(f.purchase_price || 0),
        sale_price: Number(f.sale_price),
        min_stock: Number(f.min_stock || 0),
      });
      toast(initial ? 'Đã cập nhật thông tin thuốc' : 'Đã thêm thuốc mới');
      onClose();
    } catch (e) {
      setErrors({ form: e instanceof ApiError ? e.message : 'Không lưu được' });
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={initial ? `Sửa: ${initial.name}` : 'Thêm thuốc mới'}
      footer={<><Button onClick={onClose}>Hủy</Button><Button variant="primary" loading={save.isPending} onClick={submit}>Lưu</Button></>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Mã thuốc"><input className="input" value={f.code} onChange={set('code')} /></Field>
        <Field label="Tên thuốc *" error={errors.name}><input className="input" value={f.name} onChange={set('name')} autoFocus /></Field>
        <Field label="Hoạt chất / hàm lượng" className="sm:col-span-2"><input className="input" value={f.active_ingredient} onChange={set('active_ingredient')} /></Field>
        <Field label="Nhóm thuốc *" error={errors.category_id}>
          <Select value={f.category_id} onChange={set('category_id')}>
            <option value="">— Chọn nhóm —</option>
            {cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Nhà cung cấp">
          <Select value={f.supplier_id} onChange={set('supplier_id')}>
            <option value="">— Không chọn —</option>
            {sups?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Đơn vị tính">
          <Select value={f.unit} onChange={set('unit')}>
            {['Hộp', 'Vỉ', 'Viên', 'Lọ', 'Chai', 'Tuýp', 'Gói', 'Cái'].map((u) => <option key={u}>{u}</option>)}
          </Select>
        </Field>
        <Field label="Tồn tối thiểu (mỗi chi nhánh)"><input className="input" type="number" min={0} value={f.min_stock} onChange={set('min_stock')} /></Field>
        <Field label="Giá nhập (đ)" error={errors.purchase_price}><input className="input num" type="number" min={0} step={100} value={f.purchase_price} onChange={set('purchase_price')} /></Field>
        <Field label="Giá bán (đ) *" error={errors.sale_price}><input className="input num" type="number" min={0} step={100} value={f.sale_price} onChange={set('sale_price')} /></Field>
        <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
          <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--primary))]" checked={f.requires_rx} onChange={(e) => setF((s) => ({ ...s, requires_rx: e.target.checked }))} />
          <span className="text-[13px] text-ink">Thuốc kê đơn (chỉ bán khi có đơn của bác sĩ)</span>
        </label>
      </div>
      {errors.form && <div className={cn('mt-4 rounded-ctl bg-danger-soft px-3 py-2 text-xs text-danger')}>{errors.form}</div>}
    </Modal>
  );
}
