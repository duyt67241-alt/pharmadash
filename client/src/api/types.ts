/** Kiểu dữ liệu trả về từ API (khớp với server/src/routes). */

export type Role = 'owner' | 'manager' | 'staff';

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: Role;
  branch_id: number | null;
  branch_name: string | null;
}

export interface Branch {
  id: number;
  name: string;
  address: string;
}

export interface Metric {
  value: number;
  change: number;
}

export interface Kpis {
  range: 'day' | 'week' | 'month';
  revenue: Metric;
  orders: Metric;
  profit: (Metric & { margin: number }) | null;
  customers: Metric;
  expiring: { value: number; expired: number; value_vnd: number };
}

export interface RevenuePoint {
  key: string;
  label: string;
  revenue: number;
  orders: number;
  current: boolean;
}

export interface RevenueSeries {
  range: string;
  bucket: 'hour' | 'day' | 'month';
  total: number;
  change: number | null;
  points: RevenuePoint[];
}

export interface TopMedicine {
  id: number;
  name: string;
  unit: string;
  category: string;
  quantity: number;
  revenue: number;
  percent: number;
}

export interface CategoryRevenue {
  total: number;
  items: { id: number; name: string; revenue: number; share: number; change: number }[];
}

export interface RetentionMonth {
  month: string;
  label: string;
  new: number;
  'Thường': number;
  'Bạc': number;
  'Vàng': number;
  total: number;
  rate: number;
}

export interface Retention {
  rate: number;
  change: number;
  months: RetentionMonth[];
}

export type AlertKind = 'expired' | 'out' | 'exp30' | 'low' | 'exp60' | 'exp90';

export interface AlertSummary {
  counts: Record<AlertKind, number>;
  items: { key: string; medicine_id: number; name: string; detail: string; kind: AlertKind; days_left: number | null; branch: string }[];
}

export interface SidebarCounts {
  expiring: number;
  lowStock: number;
  suppliers: number;
  pendingPurchases: number;
  storage: { units: number; capacity: number; percent: number };
}

export interface Notification {
  id: string;
  type: 'danger' | 'warning' | 'info';
  title: string;
  detail: string;
  link: string;
}

export interface CalendarDayItem {
  id: string;
  kind: string;
  title: string;
  time: string;
  subtitle: string;
  people?: string[];
}

export interface Paged<T, S = unknown> {
  total: number;
  page: number;
  pageSize: number;
  rows: T[];
  summary: S;
}

export interface MedicineRow {
  id: number;
  code: string;
  name: string;
  active_ingredient: string;
  category_id: number;
  category: string;
  supplier_id: number | null;
  supplier: string | null;
  unit: string;
  purchase_price?: number;
  sale_price: number;
  min_stock: number;
  min_stock_branch: number;
  requires_rx: number;
  stock: number;
  nearest_expiry: string | null;
  status: 'out' | 'low' | 'ok';
}

export interface MedicineDetail extends MedicineRow {
  batches: { id: number; batch_no: string; quantity: number; expiry_date: string; received_at: string; branch: string; days_left: number }[];
  sales30: { quantity: number; revenue: number; daily: { d: string; qty: number; revenue: number }[] };
}

export interface ExpiringBatch {
  batch_id: number;
  batch_no: string;
  medicine_id: number;
  code: string;
  name: string;
  unit: string;
  branch: string;
  quantity: number;
  expiry_date: string;
  days_left: number;
  value?: number;
}

export interface LowStockRow {
  medicine_id: number;
  code: string;
  name: string;
  unit: string;
  branch_id: number;
  branch: string;
  stock: number;
  min_stock: number;
}

export interface OrderRow {
  id: number;
  code: string;
  created_at: string;
  payment_method: string;
  subtotal: number;
  discount: number;
  total: number;
  status: 'completed' | 'refunded';
  customer: string | null;
  customer_phone: string | null;
  staff: string;
  branch: string;
  items: number;
}

/** Ở chi tiết đơn, "items" là mảng dòng sản phẩm (thay vì tổng số lượng). */
export interface OrderDetail extends Omit<OrderRow, 'items'> {
  customer_id: number | null;
  customer_tier: string | null;
  branch_address: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  amount: number;
  batch_no: string | null;
  expiry_date: string | null;
  requires_rx: number;
}

export interface CustomerRow {
  id: number;
  name: string;
  phone: string;
  gender: string;
  birth_year: number;
  tier: 'Thường' | 'Bạc' | 'Vàng';
  points: number;
  created_at: string;
  orders: number;
  spent: number;
  last_order: string | null;
}

export interface PurchaseRow {
  id: number;
  code: string;
  created_at: string;
  expected_date: string;
  received_at: string | null;
  status: 'draft' | 'ordered' | 'received' | 'cancelled';
  total: number;
  note: string | null;
  supplier: string;
  created_by: string;
  branch: string;
  items: number;
}

export interface Supplier {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  tax_code: string;
  medicines: number;
  purchases: number;
  purchased_total: number;
  last_purchase: string | null;
}

export interface StaffRow {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: Role;
  hired_at: string;
  branch: string;
  today_shift: 'morning' | 'afternoon' | null;
  revenue: number;
  orders: number;
  customers: number;
  avg_order: number;
  change: number;
}
