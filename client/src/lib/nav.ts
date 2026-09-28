import {
  BarChart3, ClipboardList, LayoutGrid, Pill, ReceiptText, Settings, LifeBuoy, Truck, Users, type LucideIcon,
} from 'lucide-react';
import type { Role } from '../api/types';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

const ALL: Role[] = ['owner', 'manager', 'staff'];
const MGMT: Role[] = ['owner', 'manager'];

/** Menu chính - lọc theo vai trò (Nhân viên bán hàng xem hạn chế). */
export const NAV: NavItem[] = [
  { to: '/', label: 'Tổng quan', icon: LayoutGrid, roles: ALL },
  { to: '/orders', label: 'Đơn hàng', icon: ReceiptText, roles: ALL },
  { to: '/inventory', label: 'Kho thuốc', icon: Pill, roles: ALL },
  { to: '/purchases', label: 'Nhập hàng', icon: Truck, roles: MGMT },
  { to: '/customers', label: 'Khách hàng', icon: Users, roles: ALL },
  { to: '/staff', label: 'Nhân viên', icon: ClipboardList, roles: MGMT },
  { to: '/reports', label: 'Báo cáo', icon: BarChart3, roles: MGMT },
];

export const FOOTER_NAV: NavItem[] = [
  { to: '/settings', label: 'Cài đặt', icon: Settings, roles: ALL },
  { to: '/help', label: 'Trợ giúp', icon: LifeBuoy, roles: ALL },
];

export function pageMeta(pathname: string) {
  const item = [...NAV, ...FOOTER_NAV].find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)));
  return item ?? { label: 'PharmaDash', icon: LayoutGrid };
}
