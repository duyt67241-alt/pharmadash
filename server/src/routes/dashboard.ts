/**
 * API cho trang Tổng quan. Mọi số liệu đều lọc theo phạm vi người dùng
 * (chi nhánh; nhân viên chỉ thấy doanh số của chính mình).
 */
import { Router, type Request } from 'express';
import { all, get } from '../db/connection';
import { requireRole, scopeOf } from '../middleware/auth';
import {
  addDays, addMonths, fmtDate, fmtDateTime, kpiPeriod, parseDate, pctChange, startOfDay,
} from '../lib/dates';
import { Where } from '../lib/query';
import { HttpError } from '../lib/http';
import { expiringBatches } from '../services/stock';

const router = Router();

/** WHERE cho bảng orders `o` theo phạm vi + khoảng thời gian [from, to). */
function orderWhere(req: Request, from?: string, to?: string) {
  const { branchId, staffId } = scopeOf(req);
  const w = new Where().add("o.status = 'completed'");
  w.addIf(branchId, 'o.branch_id = ?', branchId);
  w.addIf(staffId, 'o.user_id = ?', staffId);
  w.addIf(from, 'o.created_at >= ?', from!);
  w.addIf(to, 'o.created_at < ?', to!);
  return w;
}

function totals(req: Request, from: string, to: string) {
  const w = orderWhere(req, from, to);
  const r = get<{ revenue: number; orders: number; customers: number }>(
    `SELECT COALESCE(SUM(o.total),0) revenue, COUNT(*) orders, COUNT(DISTINCT o.customer_id) customers FROM orders o ${w.sql}`,
    w.params,
  )!;
  const c = get<{ cost: number }>(
    `SELECT COALESCE(SUM(oi.quantity * oi.unit_cost),0) cost FROM order_items oi JOIN orders o ON o.id = oi.order_id ${w.sql}`,
    w.params,
  )!;
  return { ...r, profit: r.revenue - c.cost };
}

// ---------------- KPI ----------------
router.get('/kpis', (req, res) => {
  const range = (['day', 'week', 'month'] as const).find((r) => r === req.query.range) ?? 'week';
  const p = kpiPeriod(range);
  const cur = totals(req, p.from, p.to);
  const prev = totals(req, p.prevFrom, p.prevTo);
  const { branchId, staffId } = scopeOf(req);
  const expiring = expiringBatches(branchId, 30);

  res.json({
    range,
    revenue: { value: cur.revenue, change: pctChange(cur.revenue, prev.revenue) },
    orders: { value: cur.orders, change: pctChange(cur.orders, prev.orders) },
    // Nhân viên bán hàng không được xem lợi nhuận -> trả về số khách phục vụ
    profit: staffId ? null : { value: cur.profit, change: pctChange(cur.profit, prev.profit), margin: cur.revenue ? Math.round((cur.profit / cur.revenue) * 1000) / 10 : 0 },
    customers: { value: cur.customers, change: pctChange(cur.customers, prev.customers) },
    expiring: {
      value: expiring.filter((e) => e.days_left >= 0).length,
      expired: expiring.filter((e) => e.days_left < 0).length,
      value_vnd: expiring.reduce((s, e) => s + e.value, 0),
    },
  });
});

// ---------------- Biểu đồ doanh thu ----------------
type Bucket = 'hour' | 'day' | 'month';
const RANGES: Record<string, { bucket: Bucket; len: number }> = {
  '1d': { bucket: 'hour', len: 1 },
  '1w': { bucket: 'day', len: 7 },
  '1m': { bucket: 'day', len: 30 },
  '6m': { bucket: 'month', len: 6 },
  '1y': { bucket: 'month', len: 12 },
  all: { bucket: 'month', len: 0 },
};

router.get('/revenue', (req, res) => {
  const key = String(req.query.range ?? '1y');
  const cfg = RANGES[key];
  if (!cfg) throw new HttpError(400, 'range không hợp lệ');
  const now = new Date();
  const today = startOfDay(now);

  let from: Date;
  let prevFrom: Date | null;
  if (cfg.bucket === 'hour') {
    from = today;
    prevFrom = addDays(today, -1);
  } else if (cfg.bucket === 'day') {
    from = addDays(today, -(cfg.len - 1));
    prevFrom = addDays(from, -cfg.len);
  } else if (cfg.len) {
    from = new Date(today.getFullYear(), today.getMonth() - (cfg.len - 1), 1);
    prevFrom = addMonths(from, -cfg.len);
  } else {
    const first = get<{ t: string }>('SELECT MIN(created_at) t FROM orders')!.t;
    const f = parseDate(first);
    from = new Date(f.getFullYear(), f.getMonth(), 1);
    prevFrom = null;
  }

  const expr = cfg.bucket === 'hour' ? 'substr(o.created_at,12,2)' : cfg.bucket === 'day' ? 'substr(o.created_at,1,10)' : 'substr(o.created_at,1,7)';
  const w = orderWhere(req, fmtDateTime(from), fmtDateTime(addDays(now, 1)));
  const rows = all<{ k: string; revenue: number; orders: number }>(
    `SELECT ${expr} k, SUM(o.total) revenue, COUNT(*) orders FROM orders o ${w.sql} GROUP BY k`,
    w.params,
  );
  const map = new Map(rows.map((r) => [r.k, r]));

  // Tạo đủ các cột kể cả cột không có dữ liệu
  const points: { key: string; label: string; revenue: number; orders: number; current: boolean }[] = [];
  const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  if (cfg.bucket === 'hour') {
    for (let h = 7; h <= 21; h++) {
      const k = String(h).padStart(2, '0');
      points.push({ key: k, label: `${h}h`, revenue: map.get(k)?.revenue ?? 0, orders: map.get(k)?.orders ?? 0, current: h === now.getHours() });
    }
  } else if (cfg.bucket === 'day') {
    for (let d = from; d <= today; d = addDays(d, 1)) {
      const k = fmtDate(d);
      const label = cfg.len <= 7 ? DOW[d.getDay()] : `${d.getDate()}/${d.getMonth() + 1}`;
      points.push({ key: k, label, revenue: map.get(k)?.revenue ?? 0, orders: map.get(k)?.orders ?? 0, current: k === fmtDate(today) });
    }
  } else {
    for (let d = from; d <= today; d = addMonths(d, 1)) {
      const k = fmtDate(d).slice(0, 7);
      const label = `Th${d.getMonth() + 1}`;
      points.push({ key: k, label, revenue: map.get(k)?.revenue ?? 0, orders: map.get(k)?.orders ?? 0, current: k === fmtDate(today).slice(0, 7) });
    }
  }

  const total = points.reduce((s, p) => s + p.revenue, 0);
  let change: number | null = null;
  if (prevFrom) {
    // So sánh với kỳ trước có cùng độ dài tính đến cùng thời điểm
    const prevTo = cfg.bucket === 'month' ? addMonths(now, -cfg.len) : addDays(now, -(cfg.bucket === 'hour' ? 1 : cfg.len));
    change = pctChange(total, totals(req, fmtDateTime(prevFrom), fmtDateTime(prevTo)).revenue);
  }
  res.json({ range: key, bucket: cfg.bucket, total, change, points });
});

// ---------------- Top thuốc bán chạy (30 ngày) ----------------
router.get('/top-medicines', (req, res) => {
  const limit = Math.min(20, Number(req.query.limit) || 10);
  const w = orderWhere(req, fmtDateTime(addDays(startOfDay(new Date()), -29)));
  const rows = all<{ id: number; name: string; unit: string; category: string; quantity: number; revenue: number }>(
    `SELECT m.id, m.name, m.unit, c.name category, SUM(oi.quantity) quantity, SUM(oi.quantity * oi.unit_price) revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN medicines m ON m.id = oi.medicine_id
     JOIN categories c ON c.id = m.category_id
     ${w.sql}
     GROUP BY m.id ORDER BY revenue DESC LIMIT ?`,
    [...w.params, limit],
  );
  const max = rows[0]?.revenue ?? 1;
  res.json(rows.map((r) => ({ ...r, percent: Math.round((r.revenue / max) * 100) })));
});

// ---------------- Doanh thu theo nhóm thuốc (30 ngày) ----------------
router.get('/category-revenue', requireRole('owner', 'manager'), (req, res) => {
  const today = startOfDay(new Date());
  const q = (from: Date, to: Date) => {
    const w = orderWhere(req, fmtDateTime(from), fmtDateTime(to));
    return all<{ id: number; name: string; revenue: number }>(
      `SELECT c.id, c.name, SUM(oi.quantity * oi.unit_price) revenue
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       JOIN medicines m ON m.id = oi.medicine_id JOIN categories c ON c.id = m.category_id
       ${w.sql} GROUP BY c.id ORDER BY revenue DESC`,
      w.params,
    );
  };
  const cur = q(addDays(today, -29), addDays(today, 1));
  const prev = new Map(q(addDays(today, -59), addDays(today, -29)).map((r) => [r.id, r.revenue]));
  const total = cur.reduce((s, r) => s + r.revenue, 0);
  res.json({
    total,
    items: cur.map((r) => ({
      ...r,
      share: total ? Math.round((r.revenue / total) * 1000) / 10 : 0,
      change: pctChange(r.revenue, prev.get(r.id) ?? 0),
    })),
  });
});

// ---------------- Tỷ lệ khách quay lại (6 tháng) ----------------
router.get('/retention', requireRole('owner', 'manager'), (req, res) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const { branchId } = scopeOf(req);
  const w = new Where().add("o.status = 'completed'").add('o.customer_id IS NOT NULL');
  w.addIf(branchId, 'o.branch_id = ?', branchId);

  // Với mỗi (tháng, khách): khách là "quay lại" nếu đã có đơn trước tháng đó
  const rows = all<{ month: string; tier: string; is_return: number; n: number }>(
    `WITH firsts AS (
       SELECT o.customer_id, MIN(o.created_at) first_at FROM orders o ${w.sql} GROUP BY o.customer_id
     ),
     monthly AS (
       SELECT DISTINCT substr(o.created_at,1,7) month, o.customer_id FROM orders o ${w.sql} AND o.created_at >= ?
     )
     SELECT m.month, c.tier,
            CASE WHEN substr(f.first_at,1,7) < m.month THEN 1 ELSE 0 END is_return,
            COUNT(*) n
     FROM monthly m JOIN firsts f ON f.customer_id = m.customer_id
     JOIN customers c ON c.id = m.customer_id
     GROUP BY m.month, c.tier, is_return ORDER BY m.month`,
    [...w.params, ...w.params, fmtDateTime(start)],
  );

  const months: Record<string, { month: string; label: string; new: number; 'Thường': number; 'Bạc': number; 'Vàng': number; total: number; rate: number }> = {};
  for (let d = start; d <= now; d = addMonths(d, 1)) {
    const k = fmtDate(d).slice(0, 7);
    months[k] = { month: k, label: `Th${d.getMonth() + 1}`, new: 0, 'Thường': 0, 'Bạc': 0, 'Vàng': 0, total: 0, rate: 0 };
  }
  for (const r of rows) {
    const m = months[r.month];
    if (!m) continue;
    m.total += r.n;
    if (r.is_return) m[r.tier as 'Thường' | 'Bạc' | 'Vàng'] += r.n;
    else m.new += r.n;
  }
  const list = Object.values(months).map((m) => ({
    ...m,
    rate: m.total ? Math.round(((m.total - m.new) / m.total) * 1000) / 10 : 0,
  }));
  const cur = list[list.length - 1];
  const prev = list[list.length - 2];
  res.json({ rate: cur.rate, change: Math.round((cur.rate - (prev?.rate ?? 0)) * 10) / 10, months: list });
});

export default router;
