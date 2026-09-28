import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, Moon, Pill, ReceiptText, Search, Share2, Sun, User, AlertTriangle, Info, XCircle } from 'lucide-react';
import { useGet } from '../../api/hooks';
import type { Notification } from '../../api/types';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/cn';
import { dateTimeVN, vnd } from '../../lib/format';
import { pageMeta } from '../../lib/nav';
import { Dropdown, MenuLabel } from '../ui/Dropdown';
import { useToast } from '../ui/Toast';

interface SearchResult {
  medicines: { id: number; code: string; name: string; unit: string; sale_price: number }[];
  customers: { id: number; name: string; phone: string; tier: string }[];
  orders: { id: number; code: string; total: number; created_at: string }[];
}

function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Ô tìm kiếm toàn cục (không phân biệt dấu). Phím tắt: Ctrl + K */
function GlobalSearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const dq = useDebounced(q.trim());
  const nav = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data, isFetching } = useGet<SearchResult>(dq.length >= 2 ? '/meta/search' : null, { q: dq });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, []);

  const go = (to: string) => {
    setOpen(false);
    setQ('');
    nav(to);
  };
  const empty = data && !data.medicines.length && !data.customers.length && !data.orders.length;

  return (
    <div ref={ref} className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        placeholder="Tìm thuốc, khách hàng, mã đơn..."
        aria-label="Tìm kiếm"
        className="input h-9 bg-surface-2 pl-9 pr-14"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-surface px-1.5 text-[10px] text-ink-3 sm:block">Ctrl K</kbd>
      {open && dq.length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-[420px] animate-fade-in overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-pop scroll-thin sm:right-auto sm:w-[380px]">
          {isFetching && !data && <div className="px-3 py-4 text-xs text-ink-3">Đang tìm...</div>}
          {empty && <div className="px-3 py-4 text-xs text-ink-3">Không tìm thấy kết quả cho “{dq}”</div>}
          {!!data?.medicines.length && <MenuLabel>Thuốc</MenuLabel>}
          {data?.medicines.map((m) => (
            <ResultRow key={`m${m.id}`} icon={<Pill />} title={m.name} meta={`${m.code} · ${vnd(m.sale_price)}/${m.unit}`} onClick={() => go(`/inventory?id=${m.id}`)} />
          ))}
          {!!data?.customers.length && <MenuLabel>Khách hàng</MenuLabel>}
          {data?.customers.map((c) => (
            <ResultRow key={`c${c.id}`} icon={<User />} title={c.name} meta={`${c.phone} · Hạng ${c.tier}`} onClick={() => go(`/customers?id=${c.id}`)} />
          ))}
          {!!data?.orders.length && <MenuLabel>Đơn hàng</MenuLabel>}
          {data?.orders.map((o) => (
            <ResultRow key={`o${o.id}`} icon={<ReceiptText />} title={o.code} meta={`${dateTimeVN(o.created_at)} · ${vnd(o.total)}`} onClick={() => go(`/orders?id=${o.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResultRow({ icon, title, meta, onClick }: { icon: React.ReactNode; title: string; meta: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-muted">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-ink-2 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium text-ink">{title}</span>
        <span className="block truncate text-2xs text-ink-3">{meta}</span>
      </span>
    </button>
  );
}

function Notifications() {
  const nav = useNavigate();
  const { data } = useGet<Notification[]>('/meta/notifications', undefined, { refetchInterval: 60_000 });
  const ICON = { danger: XCircle, warning: AlertTriangle, info: Info };
  const TONE = { danger: 'text-danger bg-danger-soft', warning: 'text-warning bg-warning-soft', info: 'text-info bg-info-soft' };
  return (
    <Dropdown
      width="w-[340px]"
      trigger={({ toggle, open }) => (
        <button onClick={toggle} aria-expanded={open} aria-label={`Thông báo (${data?.length ?? 0})`} className="relative flex h-9 w-9 items-center justify-center rounded-ctl border border-line bg-surface text-ink-2 transition-colors hover:bg-muted hover:text-ink">
          <Bell className="h-4 w-4" />
          {!!data?.length && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white ring-2 ring-surface">
              {data.length}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between px-2.5 py-2">
            <span className="text-[13px] font-semibold text-ink">Thông báo</span>
            <span className="text-2xs text-ink-3">{data?.length ?? 0} mục cần xử lý</span>
          </div>
          <div className="max-h-[380px] overflow-y-auto scroll-thin">
            {data?.length === 0 && <div className="px-3 py-6 text-center text-xs text-ink-3">Không có thông báo mới</div>}
            {data?.map((n) => {
              const Icon = ICON[n.type];
              return (
                <button key={n.id} onClick={() => { close(); nav(n.link); }} className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-muted">
                  <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', TONE[n.type])}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium leading-5 text-ink">{n.title}</span>
                    <span className="block truncate text-2xs text-ink-3">{n.detail}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Dropdown>
  );
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation();
  const meta = pageMeta(pathname);
  const { theme, toggle } = useTheme();
  const toast = useToast();

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast('Đã sao chép liên kết trang');
    } catch {
      toast('Không thể sao chép liên kết', 'error');
    }
  };

  const iconBtn = 'flex h-9 w-9 items-center justify-center rounded-ctl border border-line bg-surface text-ink-2 transition-colors hover:bg-muted hover:text-ink';
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur md:px-6">
      <button onClick={onMenu} className={cn(iconBtn, 'md:hidden')} aria-label="Mở menu">
        <Menu className="h-4 w-4" />
      </button>
      <div className="flex min-w-0 items-center gap-2">
        <meta.icon className="h-[18px] w-[18px] shrink-0 text-ink" strokeWidth={1.75} />
        <h1 className="truncate text-[15px] font-semibold text-ink">{meta.label}</h1>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="hidden sm:block sm:w-64 lg:w-80">
          <GlobalSearch />
        </div>
        <button onClick={toggle} className={iconBtn} aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <Notifications />
        <button onClick={share} className={iconBtn} aria-label="Chia sẻ trang">
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
