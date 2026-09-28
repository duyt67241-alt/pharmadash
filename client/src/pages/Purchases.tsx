import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building, CheckCircle2, ClipboardList, FilePen, Mail, MapPin, Pencil, Phone, Plus, Send, Trash2, Truck, XCircle, Coins } from 'lucide-react';
import { api, ApiError } from '../api/client';
import { useApiMutation, useGet } from '../api/hooks';
import type { Branch, MedicineRow, Paged, PurchaseRow, Supplier } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { addDays, dateTimeVN, dateVN, isoDate, num, vnd, vndCompact } from '../lib/format';
import { DataTable, type Column } from '../components/data/DataTable';
import { useUrlParam } from '../components/data/Filters';
import { Badge, type Tone } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Drawer, Modal } from '../components/ui/Modal';
import { EmptyState, Field, MiniStat, PageHeader, SearchInput, Select } from '../components/ui/Misc';
import { Tabs } from '../components/ui/Segmented';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';

const PO_STATUS: Record<PurchaseRow['status'], { label: string; tone: Tone }> = {
  draft: { label: 'Nháp', tone: 'neutral' },
  ordered: { label: 'Đã đặt · chờ giao', tone: 'info' },
  received: { label: 'Đã nhập kho', tone: 'success' },
  cancelled: { label: 'Đã hủy', tone: 'danger' },
};

interface PODetail extends Omit<PurchaseRow, 'items'> {
  supplier_phone: string;
  branch_id: number;
  items: { id: number; medicine_id: number; code: string; name: string; unit: string; quantity: number; unit_cost: number; batch_no: string | null; expiry_date: string | null; amount: number }[];
}

export default function Purchases() {
  const [tab, setTab] = useUrlParam('tab', 'orders');
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(params.get('new') === '1');

  // Mở form tạo phiếu khi đi từ link "Đặt hàng" / nút + ở sidebar
  useEffect(() => {
    if (params.get('new') === '1') setCreating(true);
  }, [params]);
  const closeCreate = () => {
    setCreating(false);
    setParams((p) => { const n = new URLSearchParams(p); n.delete('new'); n.delete('medicine'); n.delete('branch'); return n; }, { replace: true });
  };

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Nhập hàng & Nhà cung cấp"
        description="Lập phiếu nhập, theo dõi giao hàng và nhận hàng vào kho theo lô"
        actions={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>Tạo phiếu nhập</Button>}
      />
      <div className="mb-4">
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'orders', label: 'Phiếu nhập' }, { value: 'suppliers', label: 'Nhà cung cấp' }]} />
      </div>
      {tab === 'orders' ? <PurchaseList /> : <SupplierList />}
      {creating && (
        <CreatePurchase
          onClose={closeCreate}
          presetMedicine={Number(params.get('medicine')) || undefined}
          presetBranch={Number(params.get('branch')) || undefined}
        />
      )}
    </div>
  );
}

// ---------------- Danh sách phiếu ----------------
function PurchaseList() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [supplier, setSupplier] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useUrlParam('id');
  const { data: sups } = useGet<Supplier[]>('/suppliers');
  const { data, isLoading, isFetching } = useGet<Paged<PurchaseRow, { total: number; ordered: number; draft: number; received30: number }>>(
    '/purchases', { q, status, supplier, page, pageSize: 15 },
  );
  const s = data?.summary;
  const reset = (fn: (v: string) => void) => (v: string) => { fn(v); setPage(1); };

  const columns: Column<PurchaseRow>[] = [
    { key: 'code', header: 'Mã phiếu', render: (p) => <span className="font-medium">{p.code}</span> },
    { key: 'supplier', header: 'Nhà cung cấp', render: (p) => <span className="line-clamp-1 text-ink-2">{p.supplier}</span> },
    { key: 'branch', header: 'Chi nhánh', hideBelow: 'lg', render: (p) => <span className="text-ink-2">{p.branch}</span> },
    { key: 'created_at', header: 'Ngày lập', hideBelow: 'md', render: (p) => <span className="num text-ink-2">{dateVN(p.created_at)}</span> },
    { key: 'expected_date', header: 'Giao dự kiến', render: (p) => <span className="num text-ink-2">{dateVN(p.expected_date)}</span> },
    { key: 'items', header: 'Mặt hàng', align: 'right', hideBelow: 'md', render: (p) => <span className="num">{p.items}</span> },
    { key: 'total', header: 'Tổng tiền', align: 'right', render: (p) => <span className="num font-semibold">{vnd(p.total)}</span> },
    { key: 'status', header: 'Trạng thái', render: (p) => <Badge tone={PO_STATUS[p.status].tone} dot>{PO_STATUS[p.status].label}</Badge> },
  ];

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MiniStat icon={<Truck />} label="Đang chờ giao" value={s ? num(s.ordered) : <Skeleton className="h-6 w-10" />} hint="phiếu đã đặt hàng" />
        <MiniStat icon={<FilePen />} label="Phiếu nháp" value={s ? num(s.draft) : <Skeleton className="h-6 w-10" />} hint="cần duyệt để đặt hàng" />
        <MiniStat icon={<Coins />} label="Đã nhập 30 ngày" value={s ? vndCompact(s.received30) : <Skeleton className="h-6 w-16" />} hint="giá trị theo giá nhập" />
      </div>
      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <SearchInput className="w-full sm:w-56" placeholder="Mã phiếu" value={q} onChange={(e) => reset(setQ)(e.target.value)} />
          <Select className="w-auto" value={status} onChange={(e) => reset(setStatus)(e.target.value)} aria-label="Trạng thái">
            <option value="">Mọi trạng thái</option>
            {Object.entries(PO_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <Select className="w-auto max-w-[260px]" value={supplier} onChange={(e) => reset(setSupplier)(e.target.value)} aria-label="Nhà cung cấp">
            <option value="">Tất cả nhà cung cấp</option>
            {sups?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </Select>
        </div>
        <DataTable columns={columns} rows={data?.rows} rowKey={(p) => p.id} loading={isLoading} fetching={isFetching}
          page={page} pageSize={15} total={data?.total} onPage={setPage} onRowClick={(p) => setOpenId(String(p.id))} />
      </div>
      <PurchaseDrawer id={openId ? Number(openId) : null} onClose={() => setOpenId(null)} />
    </>
  );
}

function PurchaseDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const toast = useToast();
  const { data: p, isLoading } = useGet<PODetail>(id ? `/purchases/${id}` : null);
  const [receiving, setReceiving] = useState(false);
  const setStatus = useApiMutation((s: string) => api.patch(`/purchases/${id}/status`, { status: s }), ['/purchases', '/meta', '/calendar']);

  const act = async (s: 'ordered' | 'cancelled') => {
    try {
      await setStatus.mutateAsync(s);
      toast(s === 'ordered' ? 'Đã chuyển phiếu sang "Đã đặt hàng"' : 'Đã hủy phiếu nhập');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Lỗi', 'error');
    }
  };

  return (
    <Drawer
      open={!!id}
      onClose={onClose}
      title={p ? `Phiếu nhập ${p.code}` : 'Phiếu nhập'}
      subtitle={p && `${p.branch} · lập bởi ${p.created_by} lúc ${dateTimeVN(p.created_at)}`}
      footer={p && (p.status === 'draft' || p.status === 'ordered') && (
        <>
          <Button variant="ghost" className="mr-auto text-danger hover:bg-danger-soft hover:text-danger" icon={<XCircle className="h-4 w-4" />} onClick={() => act('cancelled')}>Hủy phiếu</Button>
          {p.status === 'draft' && <Button variant="primary" icon={<Send className="h-4 w-4" />} loading={setStatus.isPending} onClick={() => act('ordered')}>Đặt hàng</Button>}
          {p.status === 'ordered' && <Button variant="primary" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setReceiving(true)}>Nhận hàng vào kho</Button>}
        </>
      )}
    >
      {isLoading || !p ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : (
        <div className="space-y-5">
          <Badge tone={PO_STATUS[p.status].tone} dot>{PO_STATUS[p.status].label}</Badge>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-card bg-surface-2 p-4 text-[13px] ring-1 ring-inset ring-line">
            <div className="col-span-2"><dt className="text-2xs text-ink-3">Nhà cung cấp</dt><dd className="font-medium text-ink">{p.supplier}</dd><dd className="text-2xs text-ink-3">{p.supplier_phone}</dd></div>
            <div><dt className="text-2xs text-ink-3">Giao dự kiến</dt><dd className="num text-ink">{dateVN(p.expected_date)}</dd></div>
            <div><dt className="text-2xs text-ink-3">Ngày nhận</dt><dd className="num text-ink">{p.received_at ? dateTimeVN(p.received_at) : '—'}</dd></div>
            {p.note && <div className="col-span-2"><dt className="text-2xs text-ink-3">Ghi chú</dt><dd className="text-ink">{p.note}</dd></div>}
          </dl>
          <div className="divide-y divide-line rounded-card ring-1 ring-inset ring-line">
            {p.items.map((it) => (
              <div key={it.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <div className="font-medium text-ink">{it.name}</div>
                  <div className="num text-2xs text-ink-3">
                    {num(it.quantity)} {it.unit.toLowerCase()} × {vnd(it.unit_cost)}
                    {it.batch_no && ` · Lô ${it.batch_no} · HSD ${dateVN(it.expiry_date)}`}
                  </div>
                </div>
                <div className="num shrink-0 font-medium text-ink">{vnd(it.amount)}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold text-ink">
            <span>Tổng tiền</span><span className="num">{vnd(p.total)}</span>
          </div>
        </div>
      )}
      {receiving && p && <ReceiveModal po={p} onClose={() => setReceiving(false)} />}
    </Drawer>
  );
}

/** Xác nhận nhận hàng: nhập số lô + hạn dùng cho từng dòng, hệ thống tạo lô tồn kho. */
function ReceiveModal({ po, onClose }: { po: PODetail; onClose: () => void }) {
  const toast = useToast();
  const defExpiry = isoDate(addDays(new Date(), 730));
  const [rows, setRows] = useState(() => po.items.map((i) => ({ id: i.id, name: i.name, batch_no: i.batch_no ?? '', expiry_date: i.expiry_date ?? defExpiry })));
  const [error, setError] = useState('');
  const receive = useApiMutation(
    (body: object) => api.patch(`/purchases/${po.id}/receive`, body),
    ['/purchases', '/medicines', '/inventory', '/meta', '/calendar', '/dashboard'],
  );
  const submit = async () => {
    setError('');
    try {
      await receive.mutateAsync({ items: rows.map((r) => ({ id: r.id, batch_no: r.batch_no || undefined, expiry_date: r.expiry_date })) });
      toast(`Đã nhập kho ${rows.length} mặt hàng từ phiếu ${po.code}`);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không nhận hàng được');
    }
  };
  return (
    <Modal open onClose={onClose} size="lg" title={`Nhận hàng · ${po.code}`} description="Để trống số lô để hệ thống tự sinh. Hạn dùng mặc định 24 tháng."
      footer={<><Button onClick={onClose}>Hủy</Button><Button variant="primary" loading={receive.isPending} onClick={submit}>Xác nhận nhập kho</Button></>}>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.id} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_140px_150px]">
            <span className="truncate text-[13px] font-medium text-ink">{r.name}</span>
            <input className="input h-8" placeholder="Số lô" value={r.batch_no} onChange={(e) => setRows((s) => s.map((x, j) => (j === i ? { ...x, batch_no: e.target.value } : x)))} />
            <input className="input h-8" type="date" min={isoDate(addDays(new Date(), 1))} value={r.expiry_date} onChange={(e) => setRows((s) => s.map((x, j) => (j === i ? { ...x, expiry_date: e.target.value } : x)))} aria-label={`Hạn dùng ${r.name}`} />
          </div>
        ))}
      </div>
      {error && <div className="mt-3 rounded-ctl bg-danger-soft px-3 py-2 text-xs text-danger">{error}</div>}
    </Modal>
  );
}

// ---------------- Tạo phiếu nhập ----------------
function CreatePurchase({ onClose, presetMedicine, presetBranch }: { onClose: () => void; presetMedicine?: number; presetBranch?: number }) {
  const toast = useToast();
  const { user, branchId } = useAuth();
  const { data: sups } = useGet<Supplier[]>('/suppliers');
  const { data: branches } = useGet<Branch[]>('/meta/branches');
  const { data: meds } = useGet<Paged<MedicineRow>>('/medicines', { pageSize: 200 });
  const [supplierId, setSupplierId] = useState('');
  const [branch, setBranch] = useState(String(presetBranch ?? branchId ?? ''));
  const [expected, setExpected] = useState(isoDate(addDays(new Date(), 3)));
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<{ medicine_id: string; quantity: string; unit_cost: string }[]>([]);
  const [error, setError] = useState('');
  const create = useApiMutation((body: object) => api.post<{ id: number }>('/purchases', body), ['/purchases', '/meta', '/calendar']);

  const medMap = useMemo(() => new Map(meds?.rows.map((m) => [m.id, m])), [meds]);

  // Điền sẵn thuốc được chọn từ trang Kho (nút "Đặt hàng")
  useEffect(() => {
    if (!presetMedicine || !meds || lines.length) return;
    const m = medMap.get(presetMedicine);
    if (!m) return;
    setSupplierId(String(m.supplier_id ?? ''));
    setLines([{ medicine_id: String(m.id), quantity: String(Math.max(10, m.min_stock_branch * 2)), unit_cost: String(m.purchase_price ?? 0) }]);
  }, [presetMedicine, meds, medMap, lines.length]);

  const addLine = () => setLines((l) => [...l, { medicine_id: '', quantity: '10', unit_cost: '' }]);
  const setLine = (i: number, k: 'medicine_id' | 'quantity' | 'unit_cost', v: string) =>
    setLines((l) => l.map((x, j) => {
      if (j !== i) return x;
      const n = { ...x, [k]: v };
      if (k === 'medicine_id') n.unit_cost = String(medMap.get(Number(v))?.purchase_price ?? '');
      return n;
    }));
  const total = lines.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.unit_cost || 0), 0);
  // Ưu tiên hiện thuốc của NCC đã chọn lên đầu
  const medOptions = useMemo(() => {
    const rows = meds?.rows ?? [];
    return [...rows].sort((a, b) => Number(b.supplier_id === Number(supplierId)) - Number(a.supplier_id === Number(supplierId)) || a.name.localeCompare(b.name, 'vi'));
  }, [meds, supplierId]);

  const submit = async (status: 'draft' | 'ordered') => {
    setError('');
    const items = lines.filter((l) => l.medicine_id).map((l) => ({ medicine_id: Number(l.medicine_id), quantity: Number(l.quantity), unit_cost: Number(l.unit_cost) }));
    if (!supplierId) return setError('Chọn nhà cung cấp');
    if (user?.role === 'owner' && !branch) return setError('Chọn chi nhánh nhận hàng');
    if (!items.length) return setError('Thêm ít nhất 1 thuốc');
    if (items.some((i) => !(i.quantity > 0))) return setError('Số lượng phải lớn hơn 0');
    try {
      await create.mutateAsync({ supplier_id: Number(supplierId), branch_id: branch ? Number(branch) : undefined, expected_date: expected, status, note: note || undefined, items });
      toast(status === 'draft' ? 'Đã lưu phiếu nháp' : 'Đã tạo phiếu và đặt hàng');
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không tạo được phiếu');
    }
  };

  return (
    <Modal
      open onClose={onClose} size="xl" title="Tạo phiếu nhập hàng"
      footer={
        <>
          <span className="mr-auto self-center text-[13px] text-ink-2">Tổng: <b className="num text-ink">{vnd(total)}</b></span>
          <Button onClick={() => submit('draft')} loading={create.isPending}>Lưu nháp</Button>
          <Button variant="primary" icon={<Send className="h-4 w-4" />} onClick={() => submit('ordered')} loading={create.isPending}>Đặt hàng</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Nhà cung cấp *" className="sm:col-span-2">
          <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">— Chọn nhà cung cấp —</option>
            {sups?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Ngày giao dự kiến">
          <input className="input" type="date" value={expected} min={isoDate(new Date())} onChange={(e) => setExpected(e.target.value)} />
        </Field>
        {user?.role === 'owner' && (
          <Field label="Chi nhánh nhận *">
            <Select value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="">— Chọn chi nhánh —</option>
              {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Ghi chú" className={user?.role === 'owner' ? 'sm:col-span-2' : 'sm:col-span-3'}>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: giao buổi sáng" />
        </Field>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-ink">Danh sách thuốc</h3>
          <Button size="sm" variant="soft" icon={<Plus className="h-3.5 w-3.5" />} onClick={addLine}>Thêm dòng</Button>
        </div>
        {lines.length === 0 ? (
          <div className="rounded-card border border-dashed border-line"><EmptyState title="Chưa có thuốc" hint="Bấm “Thêm dòng” để chọn thuốc cần nhập" icon={<ClipboardList className="h-5 w-5" />} /></div>
        ) : (
          <div className="space-y-2">
            <div className="hidden grid-cols-[1fr_100px_130px_120px_32px] gap-2 px-1 text-2xs font-semibold uppercase text-ink-3 sm:grid">
              <span>Thuốc</span><span>Số lượng</span><span>Đơn giá nhập</span><span className="text-right">Thành tiền</span><span />
            </div>
            {lines.map((l, i) => {
              const m = medMap.get(Number(l.medicine_id));
              return (
                <div key={i} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[1fr_100px_130px_120px_32px]">
                  <Select className="col-span-2 sm:col-span-1" value={l.medicine_id} onChange={(e) => setLine(i, 'medicine_id', e.target.value)} aria-label="Thuốc">
                    <option value="">— Chọn thuốc —</option>
                    {medOptions.map((mm) => (
                      <option key={mm.id} value={mm.id}>{mm.name} · tồn {mm.stock}{mm.supplier_id === Number(supplierId) ? ' ★' : ''}</option>
                    ))}
                  </Select>
                  <input className="input num" type="number" min={1} value={l.quantity} onChange={(e) => setLine(i, 'quantity', e.target.value)} aria-label="Số lượng" />
                  <input className="input num" type="number" min={0} step={100} value={l.unit_cost} onChange={(e) => setLine(i, 'unit_cost', e.target.value)} aria-label="Đơn giá" />
                  <span className="num text-right text-[13px] font-medium text-ink">{vnd(Number(l.quantity || 0) * Number(l.unit_cost || 0))}{m && <span className="block text-2xs font-normal text-ink-3">{m.unit}</span>}</span>
                  <button onClick={() => setLines((s) => s.filter((_, j) => j !== i))} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 hover:bg-danger-soft hover:text-danger" aria-label="Xóa dòng">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
            <p className="pt-1 text-2xs text-ink-3">★ thuốc do nhà cung cấp đã chọn phân phối</p>
          </div>
        )}
      </div>
      {error && <div className="mt-4 rounded-ctl bg-danger-soft px-3 py-2 text-xs text-danger">{error}</div>}
    </Modal>
  );
}

// ---------------- Nhà cung cấp ----------------
function SupplierList() {
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Supplier | 'new' | null>(null);
  const { data, isLoading } = useGet<Supplier[]>('/suppliers', { q });
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <SearchInput className="w-full sm:w-72" placeholder="Tìm nhà cung cấp" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>Thêm nhà cung cấp</Button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {isLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 w-full rounded-card" />)}
        {data?.map((s) => (
          <div key={s.id} className="card flex flex-col p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-ink"><Building className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <div className="line-clamp-2 text-[13px] font-semibold text-ink">{s.name}</div>
                  <div className="text-2xs text-ink-3">MST {s.tax_code || '—'}</div>
                </div>
              </div>
              <Button size="icon-sm" variant="ghost" onClick={() => setEditing(s)} aria-label={`Sửa ${s.name}`}><Pencil className="h-3.5 w-3.5" /></Button>
            </div>
            <ul className="mt-3 space-y-1 text-xs text-ink-2">
              <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-ink-3" />{s.phone || '—'}</li>
              <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-ink-3" />{s.email || '—'}</li>
              <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0 text-ink-3" /><span className="truncate">{s.address || '—'}</span></li>
            </ul>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
              <div><div className="num text-sm font-semibold text-ink">{s.medicines}</div><div className="text-2xs text-ink-3">thuốc</div></div>
              <div><div className="num text-sm font-semibold text-ink">{s.purchases}</div><div className="text-2xs text-ink-3">phiếu nhập</div></div>
              <div><div className="num text-sm font-semibold text-ink">{vndCompact(s.purchased_total)}</div><div className="text-2xs text-ink-3">đã nhập</div></div>
            </div>
          </div>
        ))}
      </div>
      {editing && <SupplierForm initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function SupplierForm({ initial, onClose }: { initial: Supplier | null; onClose: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ name: initial?.name ?? '', phone: initial?.phone ?? '', email: initial?.email ?? '', address: initial?.address ?? '', tax_code: initial?.tax_code ?? '' });
  const [error, setError] = useState('');
  const save = useApiMutation((b: object) => (initial ? api.put(`/suppliers/${initial.id}`, b) : api.post('/suppliers', b)), ['/suppliers', '/meta']);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async () => {
    setError('');
    if (f.name.trim().length < 3) return setError('Tên nhà cung cấp tối thiểu 3 ký tự');
    try {
      await save.mutateAsync(f);
      toast(initial ? 'Đã cập nhật nhà cung cấp' : 'Đã thêm nhà cung cấp');
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không lưu được');
    }
  };
  return (
    <Modal open onClose={onClose} title={initial ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'}
      footer={<><Button onClick={onClose}>Hủy</Button><Button variant="primary" loading={save.isPending} onClick={submit}>Lưu</Button></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Tên công ty *" className="sm:col-span-2"><input className="input" value={f.name} onChange={set('name')} autoFocus /></Field>
        <Field label="Số điện thoại"><input className="input" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Email"><input className="input" type="email" value={f.email} onChange={set('email')} /></Field>
        <Field label="Mã số thuế"><input className="input" value={f.tax_code} onChange={set('tax_code')} /></Field>
        <Field label="Địa chỉ" className="sm:col-span-2"><input className="input" value={f.address} onChange={set('address')} /></Field>
      </div>
      {error && <div className="mt-3 rounded-ctl bg-danger-soft px-3 py-2 text-xs text-danger">{error}</div>}
    </Modal>
  );
}
