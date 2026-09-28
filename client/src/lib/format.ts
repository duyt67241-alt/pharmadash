/** Định dạng số liệu theo chuẩn Việt Nam. */

const nf = new Intl.NumberFormat('vi-VN');

/** 1234567 -> "1.234.567 đ" */
export const vnd = (n: number | null | undefined) => `${nf.format(Math.round(n ?? 0))} đ`;

/** Số nguyên có dấu chấm ngăn cách: 1234 -> "1.234" */
export const num = (n: number | null | undefined) => nf.format(n ?? 0);

/** Rút gọn tiền: 1.250.000 -> "1,3 tr", 2.300.000.000 -> "2,3 tỷ" */
export function vndCompact(n: number) {
  const abs = Math.abs(n);
  const fmt = (v: number, d: number) => v.toLocaleString('vi-VN', { maximumFractionDigits: d });
  if (abs >= 1e9) return `${fmt(n / 1e9, 2)} tỷ`;
  if (abs >= 1e6) return `${fmt(n / 1e6, abs >= 1e8 ? 0 : 1)} tr`;
  if (abs >= 1e3) return `${fmt(n / 1e3, 0)}k`;
  return fmt(n, 0);
}

/** Nhãn trục Y: 20000000 -> "20tr", 2500000 -> "2,5tr" */
export function axisVnd(n: number) {
  const f = (v: number) => v.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  if (n === 0) return '0';
  if (Math.abs(n) >= 1e9) return `${f(n / 1e9)} tỷ`;
  if (Math.abs(n) >= 1e6) return `${f(n / 1e6)}tr`;
  if (Math.abs(n) >= 1e3) return `${f(n / 1e3)}k`;
  return String(n);
}

/** Các mốc trục "tròn" (bước 1/2/2,5/5 x 10^k) từ 0 tới >= max. */
export function niceTicks(max: number, count = 4) {
  if (!(max > 0)) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const n = Math.ceil(max / step);
  return Array.from({ length: n + 1 }, (_, i) => i * step);
}

export const pct = (n: number | null | undefined, digits = 1) =>
  `${(n ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: digits })}%`;

/** "2026-09-28 14:05:00" -> Date (giờ địa phương) */
export function toDate(s: string) {
  return new Date(s.length <= 10 ? `${s}T00:00:00` : s.replace(' ', 'T'));
}

/** "28/09/2026" */
export const dateVN = (s: string | null | undefined) =>
  s ? toDate(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

/** "28/09/2026 14:05" */
export const dateTimeVN = (s: string | null | undefined) =>
  s ? `${dateVN(s)} ${s.slice(11, 16)}` : '—';

/** "vừa xong", "5 phút trước", "2 giờ trước"... */
export function timeAgo(ts: number | string | null | undefined) {
  if (!ts) return '—';
  const t = typeof ts === 'number' ? ts : toDate(ts).getTime();
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 45) return 'vừa xong';
  if (s < 3600) return `${Math.round(s / 60)} phút trước`;
  if (s < 86400) return `${Math.round(s / 3600)} giờ trước`;
  return `${Math.round(s / 86400)} ngày trước`;
}

/** YYYY-MM-DD theo giờ địa phương */
export function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

export const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Tiền mặt',
  transfer: 'Chuyển khoản',
  ewallet: 'Ví điện tử',
  card: 'Thẻ',
};

export const ROLE_LABEL: Record<string, string> = {
  owner: 'Chủ nhà thuốc',
  manager: 'Quản lý',
  staff: 'Nhân viên bán hàng',
};

/** Chữ cái đầu cho avatar: "Nguyễn Ngọc Mai" -> "NM" */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
