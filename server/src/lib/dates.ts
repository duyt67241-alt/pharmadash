/**
 * Tiện ích ngày giờ. Toàn hệ thống dùng giờ địa phương dạng chuỗi
 * 'YYYY-MM-DD HH:MM:SS' (khớp cách lưu trong SQLite).
 */
const pad = (n: number) => String(n).padStart(2, '0');

export function fmtDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fmtDateTime(d: Date) {
  return `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function parseDate(s: string) {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  const [hh = 0, mm = 0, ss = 0] = s.length > 10 ? s.slice(11).split(':').map(Number) : [];
  return new Date(y, m - 1, d, hh, mm, ss);
}

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function addMonths(d: Date, n: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

export function daysBetween(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
}

/** Khoảng thời gian [from, to) và khoảng liền trước cùng độ dài để so sánh. */
export interface Period {
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
}

/**
 * Kỳ KPI: 'day' = hôm nay (so với hôm qua cùng giờ),
 * 'week' = 7 ngày gần nhất, 'month' = 30 ngày gần nhất.
 */
export function kpiPeriod(kind: 'day' | 'week' | 'month', now = new Date()): Period {
  if (kind === 'day') {
    const today = startOfDay(now);
    const yesterday = addDays(today, -1);
    const yesterdaySameTime = addDays(now, -1);
    return {
      from: fmtDateTime(today),
      to: fmtDateTime(now),
      prevFrom: fmtDateTime(yesterday),
      prevTo: fmtDateTime(yesterdaySameTime),
    };
  }
  const len = kind === 'week' ? 7 : 30;
  const from = addDays(startOfDay(now), -(len - 1));
  const prevFrom = addDays(from, -len);
  return {
    from: fmtDateTime(from),
    to: fmtDateTime(now),
    prevFrom: fmtDateTime(prevFrom),
    prevTo: fmtDateTime(addDays(now, -len)),
  };
}

export function pctChange(cur: number, prev: number) {
  if (!prev) return cur ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}
