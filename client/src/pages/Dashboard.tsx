import { useEffect, useState } from 'react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import {
  Check, ChevronDown, CloudDownload, CloudUpload, FileSpreadsheet, FileText, LayoutPanelTop, Wallet,
  ShoppingBag, TrendingUp, CalendarX2, RefreshCw, Users, Radio,
} from 'lucide-react';
import { api, download } from '../api/client';
import { useGet, LIVE_REFETCH_MS } from '../api/hooks';
import type { Kpis } from '../api/types';
import { useAuth, useCan } from '../context/AuthContext';
import { addDays, isoDate, num, pct, timeAgo, vndCompact, vnd } from '../lib/format';
import { cn } from '../lib/cn';
import { Button } from '../components/ui/Button';
import { Dropdown, MenuItem, MenuLabel } from '../components/ui/Dropdown';
import { Segmented } from '../components/ui/Segmented';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { KpiCard } from '../components/widgets/KpiCard';
import { RevenueChart } from '../components/widgets/RevenueChart';
import { CalendarWidget } from '../components/widgets/CalendarWidget';
import { CategoryRevenueCard, RetentionCard, StockAlerts, TopMedicines } from '../components/widgets/BottomWidgets';
import { ImportMedicinesModal } from '../components/widgets/ImportMedicinesModal';

type KpiRange = 'day' | 'week' | 'month';
const KPI_RANGES: { value: KpiRange; label: string }[] = [
  { value: 'day', label: 'Hôm nay' },
  { value: 'week', label: '7 ngày' },
  { value: 'month', label: '30 ngày' },
];
const CAPTION: Record<KpiRange, string> = { day: 'so với hôm qua', week: 'so với tuần trước', month: 'so với tháng trước' };

const WIDGETS = [
  { key: 'revenue', label: 'Biểu đồ doanh thu' },
  { key: 'calendar', label: 'Lịch làm việc' },
  { key: 'top', label: 'Top thuốc bán chạy' },
  { key: 'alerts', label: 'Cảnh báo tồn kho' },
  { key: 'category', label: 'Doanh thu theo nhóm thuốc', mgmt: true },
  { key: 'retention', label: 'Tỷ lệ khách quay lại', mgmt: true },
] as const;
type WidgetKey = (typeof WIDGETS)[number]['key'];

function useWidgetPrefs() {
  const [hidden, setHidden] = useState<WidgetKey[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('pd_hidden_widgets') ?? '[]');
    } catch {
      return [];
    }
  });
  const save = (h: WidgetKey[]) => {
    setHidden(h);
    try {
      localStorage.setItem('pd_hidden_widgets', JSON.stringify(h));
    } catch {
      /* ignore */
    }
  };
  return { hidden, save };
}

/** Dòng "Cập nhật lần cuối": tự làm mới mỗi 30s, hiển thị thời gian tương đối. */
function LiveStatus({ updatedAt }: { updatedAt: number }) {
  const [, tick] = useState(0);
  const fetching = useIsFetching() > 0;
  const qc = useQueryClient();
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 15_000);
    return () => clearInterval(t);
  }, []);
  const { data: demo } = useGet<{ enabled: boolean }>('/demo', undefined, { refetchInterval: 30_000 });
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="flex items-center gap-1.5 font-medium text-success">
        <Check className="h-4 w-4" strokeWidth={2.5} />
        Cập nhật lần cuối: {timeAgo(updatedAt)}
      </span>
      <button
        onClick={() => qc.invalidateQueries()}
        className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-ink-3 hover:bg-muted hover:text-ink"
        aria-label="Làm mới dữ liệu"
      >
        <RefreshCw className={cn('h-3.5 w-3.5', fetching && 'animate-spin')} />
        <span className="hidden sm:inline">Làm mới</span>
      </button>
      {demo?.enabled && (
        <span className="flex items-center gap-1 rounded-md bg-danger-soft px-1.5 py-0.5 text-2xs font-semibold text-danger">
          <Radio className="h-3 w-3" /> DEMO LIVE
        </span>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const can = useCan();
  const toast = useToast();
  const [range, setRange] = useState<KpiRange>('week');
  const [customize, setCustomize] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const { hidden, save } = useWidgetPrefs();
  const { data: k, isLoading, dataUpdatedAt } = useGet<Kpis>('/dashboard/kpis', { range }, { refetchInterval: LIVE_REFETCH_MS });

  const show = (key: WidgetKey) => !hidden.includes(key) && (!WIDGETS.find((w) => w.key === key && 'mgmt' in w) || can.viewProfit);

  const exportReport = (fmt: 'csv' | 'pdf', kind: 'revenue' | 'inventory') => {
    const days = range === 'day' ? 0 : range === 'week' ? 6 : 29;
    const to = new Date();
    download(`/reports/${kind}.${fmt}`, kind === 'revenue' ? { from: isoDate(addDays(to, -days)), to: isoDate(to) } : {});
    toast(`Đang tải báo cáo ${kind === 'revenue' ? 'doanh thu' : 'tồn kho'} (${fmt.toUpperCase()})`, 'info');
  };

  const bottom = (['top', 'alerts', 'category', 'retention'] as WidgetKey[]).filter(show);
  const firstName = user?.full_name.split(' ').slice(-1)[0];

  return (
    <>
      {/* Thanh phụ dưới topbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 md:px-6">
        <LiveStatus updatedAt={dataUpdatedAt} />
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" icon={<LayoutPanelTop className="h-4 w-4" />} onClick={() => setCustomize(true)}>
            <span className="hidden sm:inline">Tùy chỉnh widget</span>
          </Button>
          {can.manageInventory && (
            <Dropdown
              width="w-60"
              trigger={({ toggle }) => (
                <Button size="sm" icon={<CloudUpload className="h-4 w-4" />} onClick={toggle}>
                  <span className="hidden sm:inline">Nhập dữ liệu</span>
                  <ChevronDown className="h-3.5 w-3.5 text-ink-3" />
                </Button>
              )}
            >
              {(close) => (
                <>
                  <MenuItem icon={<FileSpreadsheet />} onClick={() => { close(); setImportOpen(true); }}>
                    Danh mục thuốc (CSV)
                  </MenuItem>
                  <DemoToggle onDone={close} />
                </>
              )}
            </Dropdown>
          )}
          {can.viewReports && (
            <Dropdown
              width="w-56"
              trigger={({ toggle }) => (
                <Button size="sm" variant="primary" icon={<CloudDownload className="h-4 w-4" />} onClick={toggle}>
                  Xuất báo cáo
                  <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                </Button>
              )}
            >
              {(close) => (
                <>
                  <MenuLabel>Doanh thu ({KPI_RANGES.find((r) => r.value === range)?.label})</MenuLabel>
                  <MenuItem icon={<FileSpreadsheet />} onClick={() => { close(); exportReport('csv', 'revenue'); }}>Xuất CSV</MenuItem>
                  <MenuItem icon={<FileText />} onClick={() => { close(); exportReport('pdf', 'revenue'); }}>Xuất PDF</MenuItem>
                  <MenuLabel>Tồn kho hiện tại</MenuLabel>
                  <MenuItem icon={<FileSpreadsheet />} onClick={() => { close(); exportReport('csv', 'inventory'); }}>Xuất CSV</MenuItem>
                  <MenuItem icon={<FileText />} onClick={() => { close(); exportReport('pdf', 'inventory'); }}>Xuất PDF</MenuItem>
                </>
              )}
            </Dropdown>
          )}
        </div>
      </div>

      <div className="space-y-5 p-4 md:p-6">
        {/* Bộ lọc kỳ - áp dụng cho hàng KPI */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">Xin chào, {firstName} 👋</h2>
            <p className="text-xs text-ink-3">
              {user?.role === 'staff' ? 'Số liệu bán hàng của bạn' : 'Tình hình kinh doanh'} · {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <Segmented options={KPI_RANGES} value={range} onChange={setRange} ariaLabel="Kỳ so sánh KPI" />
        </div>

        {/* Hàng KPI: 1 cột (mobile) → 2x2 (tablet) → 4 cột (desktop) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<Wallet />}
            label={user?.role === 'staff' ? 'Doanh thu của tôi' : 'Doanh thu'}
            value={k ? vndCompact(k.revenue.value) : ''}
            change={k?.revenue.change}
            caption={CAPTION[range]}
            info={`Tổng tiền các đơn đã hoàn tất (sau chiết khấu): ${k ? vnd(k.revenue.value) : ''}`}
            loading={isLoading}
          />
          <KpiCard
            icon={<ShoppingBag />}
            label="Số đơn hàng"
            value={k ? num(k.orders.value) : ''}
            change={k?.orders.change}
            caption={CAPTION[range]}
            info="Số hóa đơn bán hàng đã hoàn tất trong kỳ (không tính đơn hoàn trả)."
            loading={isLoading}
          />
          {k?.profit ? (
            <KpiCard
              icon={<TrendingUp />}
              label="Lợi nhuận gộp"
              value={vndCompact(k.profit.value)}
              change={k.profit.change}
              caption={`Biên LN ${pct(k.profit.margin)}`}
              info="Doanh thu trừ giá vốn hàng bán (giá nhập tại thời điểm bán)."
              loading={isLoading}
            />
          ) : (
            <KpiCard
              icon={<Users />}
              label="Khách thành viên"
              value={k ? num(k.customers.value) : ''}
              change={k?.customers.change}
              caption={CAPTION[range]}
              info="Số khách hàng thành viên đã mua trong kỳ."
              loading={isLoading}
            />
          )}
          <KpiCard
            icon={<CalendarX2 />}
            label="Thuốc sắp hết hạn"
            value={k ? num(k.expiring.value) : ''}
            caption="lô trong 30 ngày tới"
            info="Số lô thuốc còn tồn sẽ hết hạn trong 30 ngày tới. Nhãn đỏ là số lô đã quá hạn cần tiêu hủy."
            loading={isLoading}
            extra={
              k && k.expiring.expired > 0 ? (
                <span className="rounded-md bg-danger-soft px-1.5 py-0.5 text-2xs font-semibold text-danger">+{k.expiring.expired} quá hạn</span>
              ) : null
            }
          />
        </div>

        {/* Hàng giữa: biểu đồ 2/3 + lịch 1/3 */}
        {(show('revenue') || show('calendar')) && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {show('revenue') && <RevenueChart className={show('calendar') ? 'xl:col-span-2' : 'xl:col-span-3'} />}
            {show('calendar') && <CalendarWidget className={!show('revenue') ? 'xl:col-span-3' : undefined} />}
          </div>
        )}

        {/* Hàng dưới: 2–4 card nhỏ */}
        {bottom.length > 0 && (
          <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2', bottom.length >= 4 ? '2xl:grid-cols-4' : bottom.length === 3 ? 'xl:grid-cols-3' : '')}>
            {show('top') && <TopMedicines />}
            {show('alerts') && <StockAlerts />}
            {show('category') && <CategoryRevenueCard />}
            {show('retention') && <RetentionCard />}
          </div>
        )}
      </div>

      <Modal
        open={customize}
        onClose={() => setCustomize(false)}
        title="Tùy chỉnh widget"
        description="Chọn các thành phần hiển thị trên trang Tổng quan. Thiết lập được lưu trên trình duyệt này."
        size="sm"
        footer={<Button variant="primary" onClick={() => setCustomize(false)}>Xong</Button>}
      >
        <div className="space-y-1">
          {WIDGETS.filter((w) => !('mgmt' in w) || can.viewProfit).map((w) => {
            const on = !hidden.includes(w.key);
            return (
              <label key={w.key} className="flex cursor-pointer items-center justify-between rounded-ctl px-3 py-2.5 hover:bg-muted">
                <span className="text-[13px] text-ink">{w.label}</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[rgb(var(--primary))]"
                  checked={on}
                  onChange={() => save(on ? [...hidden, w.key] : hidden.filter((h) => h !== w.key))}
                />
              </label>
            );
          })}
        </div>
      </Modal>
      <ImportMedicinesModal open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}

/** Bật/tắt chế độ demo sinh đơn tự động (để trình bày). */
function DemoToggle({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { data } = useGet<{ enabled: boolean; intervalMs: number }>('/demo');
  const toggle = async () => {
    const r = await api.post<{ enabled: boolean }>('/demo', { enabled: !data?.enabled });
    qc.invalidateQueries({ queryKey: ['/demo'] });
    toast(r.enabled ? 'Đã bật chế độ demo: tự sinh đơn hàng mới' : 'Đã tắt chế độ demo', 'info');
    onDone();
  };
  return (
    <MenuItem icon={<Radio />} onClick={toggle} hint={data?.enabled ? 'Đang bật' : undefined}>
      {data?.enabled ? 'Tắt' : 'Bật'} mô phỏng đơn realtime
    </MenuItem>
  );
}
