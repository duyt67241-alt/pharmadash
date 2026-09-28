import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Building2, Check, ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, ChevronsUpDown,
  Clock3, LogOut, PackageX, Plus, Truck, Factory, ArrowRightCircle,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { num, ROLE_LABEL } from '../../lib/format';
import { FOOTER_NAV, NAV } from '../../lib/nav';
import { useAuth, useCan } from '../../context/AuthContext';
import { useGet } from '../../api/hooks';
import type { Branch, SidebarCounts } from '../../api/types';
import { Dropdown, MenuDivider, MenuItem, MenuLabel } from '../ui/Dropdown';
import { Avatar } from '../ui/Misc';

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  canToggle: boolean;
  onNavigate?: () => void;
}

/** Logo nhà thuốc: chữ thập trắng trên nền tím. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path d="M13 8h6v5h5v6h-5v5h-6v-5H8v-6h5z" fill="#fff" />
    </svg>
  );
}

export function Sidebar({ collapsed, onToggle, canToggle, onNavigate }: Props) {
  const { user, branchId, setBranchId, logout } = useAuth();
  const can = useCan();
  const navigate = useNavigate();
  const [quickOpen, setQuickOpen] = useState(true);
  const { data: counts } = useGet<SidebarCounts>('/meta/sidebar', undefined, { refetchInterval: 60_000 });
  const { data: branches } = useGet<Branch[]>('/meta/branches', undefined, { staleTime: Infinity });

  if (!user) return null;
  const currentBranch = branches?.find((b) => b.id === branchId);
  const branchLabel = user.role === 'owner' ? currentBranch?.name ?? 'Tất cả chi nhánh' : user.branch_name ?? '';

  const quick = [
    { label: 'Thuốc sắp hết hạn', icon: Clock3, count: counts?.expiring, to: '/inventory?tab=expiring', show: true },
    { label: 'Sắp hết hàng', icon: PackageX, count: counts?.lowStock, to: '/inventory?tab=low', show: true },
    { label: 'Nhà cung cấp', icon: Factory, count: counts?.suppliers, to: '/purchases?tab=suppliers', show: can.managePurchases },
    { label: 'Phiếu nhập chờ', icon: Truck, count: counts?.pendingPurchases, to: '/purchases', show: can.managePurchases },
  ].filter((q) => q.show);

  const storagePct = counts?.storage.percent ?? 0;

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      'group relative flex h-9 items-center gap-3 rounded-ctl px-3 text-[13px] font-medium transition-colors duration-150',
      isActive ? 'bg-muted text-ink' : 'text-ink-2 hover:bg-muted/60 hover:text-ink',
      collapsed && 'justify-center px-0',
    );
  // Thanh tím nhỏ bên trái cho mục đang chọn (giống ảnh tham khảo)
  const activeBar = (isActive: boolean) =>
    isActive && <span className="absolute -left-4 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" aria-hidden />;

  return (
    <nav aria-label="Điều hướng chính" className="flex h-full flex-col gap-4 px-4 py-4">
      {/* Logo + tên hệ thống */}
      <div className={cn('flex items-center gap-3', collapsed ? 'justify-center' : 'px-1')}>
        <Logo className="h-8 w-8 shrink-0" />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-ink">Nhà thuốc Tâm An</div>
            <div className="truncate text-2xs text-ink-3">PharmaDash · Điều hành</div>
          </div>
        )}
        {canToggle && !collapsed && (
          <button onClick={onToggle} className="rounded-md p-1 text-ink-3 hover:bg-muted hover:text-ink" aria-label="Thu gọn menu">
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}
      </div>
      {canToggle && collapsed && (
        <button onClick={onToggle} className="mx-auto -mt-2 rounded-md p-1 text-ink-3 hover:bg-muted hover:text-ink" aria-label="Mở rộng menu">
          <ChevronsRight className="h-4 w-4" />
        </button>
      )}

      {/* Tài khoản + chi nhánh */}
      <Dropdown
        align="left"
        width="w-64"
        trigger={({ toggle, open }) => (
          <button
            onClick={toggle}
            aria-expanded={open}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-ctl border border-line bg-surface p-2 text-left shadow-card transition-colors hover:border-line-strong',
              collapsed && 'justify-center p-1.5',
            )}
            title={collapsed ? `${user.full_name} · ${branchLabel}` : undefined}
          >
            <Avatar name={user.full_name} size="sm" />
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-ink">{user.email}</div>
                  <div className="truncate text-2xs text-ink-3">{branchLabel}</div>
                </div>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-ink-3" />
              </>
            )}
          </button>
        )}
      >
        {(close) => (
          <>
            <div className="flex items-center gap-2.5 px-2.5 py-2">
              <Avatar name={user.full_name} />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-ink">{user.full_name}</div>
                <div className="text-2xs text-ink-3">{ROLE_LABEL[user.role]}</div>
              </div>
            </div>
            <MenuDivider />
            <MenuLabel>Chi nhánh</MenuLabel>
            {can.switchBranch ? (
              <>
                <MenuItem icon={<Building2 />} active={!branchId} hint={!branchId && <Check className="h-4 w-4 text-primary" />} onClick={() => { setBranchId(null); close(); }}>
                  Tất cả chi nhánh
                </MenuItem>
                {branches?.map((b) => (
                  <MenuItem key={b.id} icon={<Building2 />} active={branchId === b.id} hint={branchId === b.id && <Check className="h-4 w-4 text-primary" />} onClick={() => { setBranchId(b.id); close(); }}>
                    {b.name}
                  </MenuItem>
                ))}
              </>
            ) : (
              <MenuItem icon={<Building2 />} active hint={<Check className="h-4 w-4 text-primary" />}>
                {user.branch_name}
              </MenuItem>
            )}
            <MenuDivider />
            <MenuItem icon={<LogOut />} danger onClick={() => { close(); logout(); navigate('/login'); }}>
              Đăng xuất
            </MenuItem>
          </>
        )}
      </Dropdown>

      {/* Menu chính */}
      <div className="scroll-thin -mx-4 flex-1 overflow-y-auto overflow-x-hidden px-4">
        <ul className="flex flex-col gap-0.5">
          {NAV.filter((n) => n.roles.includes(user.role)).map((n) => (
            <li key={n.to}>
              <NavLink to={n.to} end={n.to === '/'} className={linkCls} onClick={onNavigate} title={collapsed ? n.label : undefined}>
                {({ isActive }) => (
                  <>
                    {activeBar(isActive)}
                    <n.icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-ink' : 'text-ink-3 group-hover:text-ink-2')} strokeWidth={1.75} />
                    {!collapsed && <span className="truncate">{n.label}</span>}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Truy cập nhanh */}
        <div className="mt-5">
          {!collapsed ? (
            <div className="flex items-center justify-between px-1 pb-1">
              <button onClick={() => setQuickOpen((o) => !o)} className="flex items-center gap-1.5 text-xs font-medium text-ink-3 hover:text-ink" aria-expanded={quickOpen}>
                {quickOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                Truy cập nhanh
              </button>
              {can.managePurchases && (
                <button onClick={() => { navigate('/purchases?new=1'); onNavigate?.(); }} className="rounded p-0.5 text-ink-3 hover:bg-muted hover:text-ink" title="Tạo phiếu nhập" aria-label="Tạo phiếu nhập">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="mx-auto mb-2 h-px w-8 bg-line" />
          )}
          {(quickOpen || collapsed) && (
            <ul className="flex flex-col gap-0.5">
              {quick.map((q) => (
                <li key={q.label}>
                  <NavLink
                    to={q.to}
                    onClick={onNavigate}
                    title={collapsed ? `${q.label} (${q.count ?? 0})` : undefined}
                    className={cn(
                      'relative flex h-8 items-center gap-3 rounded-ctl px-3 text-[13px] text-ink-2 transition-colors hover:bg-muted/60 hover:text-ink',
                      collapsed ? 'justify-center px-0' : 'pl-5',
                    )}
                  >
                    <q.icon className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.75} />
                    {!collapsed && <span className="flex-1 truncate">{q.label}</span>}
                    {!collapsed && <span className="num text-xs text-ink-3">{q.count !== undefined ? num(q.count) : '·'}</span>}
                    {collapsed && !!q.count && <span className="absolute right-2 top-1 h-1.5 w-1.5 rounded-full bg-warning" />}
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Sức chứa kho */}
      {!collapsed && counts && (
        <div className="rounded-ctl border border-line bg-surface p-3 shadow-card">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-ink">Sức chứa kho</span>
            <span className="num text-ink-3">{storagePct}%</span>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
            role="meter" aria-valuenow={storagePct} aria-valuemin={0} aria-valuemax={100} aria-label="Sức chứa kho"
          >
            <div
              className={cn('h-full rounded-full', storagePct >= 90 ? 'bg-danger' : storagePct >= 75 ? 'bg-warning' : 'bg-primary')}
              style={{
                width: `${storagePct}%`,
                backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 3px, rgb(255 255 255 / .35) 3px 4px)',
              }}
            />
          </div>
          <div className="mt-1.5 text-2xs text-ink-3">
            {num(counts.storage.units)} / {num(counts.storage.capacity)} đơn vị
          </div>
          <NavLink to="/inventory" onClick={onNavigate} className="mt-2.5 flex items-center justify-between rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-muted">
            Xem tồn kho
            <ArrowRightCircle className="h-4 w-4 text-ink-3" />
          </NavLink>
        </div>
      )}

      {/* Cài đặt / Trợ giúp */}
      <ul className="flex flex-col gap-0.5 border-t border-line pt-3">
        {FOOTER_NAV.map((n) => (
          <li key={n.to}>
            <NavLink to={n.to} className={linkCls} onClick={onNavigate} title={collapsed ? n.label : undefined}>
              {({ isActive }) => (
                <>
                  {activeBar(isActive)}
                  <n.icon className="h-[18px] w-[18px] shrink-0 text-ink-3" strokeWidth={1.75} />
                  {!collapsed && <span className="flex-1">{n.label}</span>}
                  {!collapsed && <ChevronRight className="h-4 w-4 text-ink-3" />}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
