/**
 * Nhân viên (doanh số, ca làm) và Lịch (sự kiện, lịch giao hàng, hạn thuốc, ca làm).
 */
import { Router } from 'express';
import { all } from '../db/connection';
import { requireRole, scopeOf } from '../middleware/auth';
import { addDays, fmtDate, fmtDateTime, kpiPeriod, parseDate, pctChange, startOfDay } from '../lib/dates';
import { dateParam, Where } from '../lib/query';
import { HttpError } from '../lib/http';

const router = Router();

// ---------- Doanh số nhân viên ----------
router.get('/staff', requireRole('owner', 'manager'), (req, res) => {
  const { branchId } = scopeOf(req);
  const range = (['day', 'week', 'month'] as const).find((r) => r === req.query.range) ?? 'month';
  const p = kpiPeriod(range);
  const uw = new Where().add("u.role IN ('staff','manager')");
  uw.addIf(branchId, 'u.branch_id = ?', branchId);

  const stats = (from: string, to: string) =>
    new Map(
      all<{ user_id: number; revenue: number; orders: number; customers: number }>(
        `SELECT o.user_id, SUM(o.total) revenue, COUNT(*) orders, COUNT(DISTINCT o.customer_id) customers
         FROM orders o WHERE o.status = 'completed' AND o.created_at >= ? AND o.created_at < ? GROUP BY o.user_id`,
        [from, to],
      ).map((r) => [r.user_id, r]),
    );
  const cur = stats(p.from, p.to);
  const prev = stats(p.prevFrom, p.prevTo);
  const today = fmtDate(new Date());

  const rows = all<{ id: number }>(
    `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.hired_at, br.name branch,
            (SELECT shift FROM shifts s WHERE s.user_id = u.id AND s.date = ?) today_shift
     FROM users u LEFT JOIN branches br ON br.id = u.branch_id ${uw.sql} ORDER BY u.branch_id, u.role DESC, u.full_name`,
    [today, ...uw.params],
  ).map((u) => {
    const c = cur.get(u.id);
    const revenue = c?.revenue ?? 0;
    return {
      ...u,
      revenue,
      orders: c?.orders ?? 0,
      customers: c?.customers ?? 0,
      avg_order: c?.orders ? Math.round(revenue / c.orders) : 0,
      change: pctChange(revenue, prev.get(u.id)?.revenue ?? 0),
    };
  });
  rows.sort((a, b) => b.revenue - a.revenue);
  res.json({ range, rows });
});

// ---------- Lịch ca làm theo tuần ----------
router.get('/staff/shifts', requireRole('owner', 'manager'), (req, res) => {
  const { branchId } = scopeOf(req);
  const base = dateParam(req.query.week) ? parseDate(String(req.query.week)) : new Date();
  // Tuần bắt đầu từ thứ 2
  const monday = addDays(startOfDay(base), -((base.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => fmtDate(addDays(monday, i)));
  const w = new Where().add('s.date >= ?', days[0]).add('s.date <= ?', days[6]);
  w.addIf(branchId, 'u.branch_id = ?', branchId);
  const shifts = all(
    `SELECT s.user_id, s.date, s.shift, s.start_time, s.end_time FROM shifts s JOIN users u ON u.id = s.user_id ${w.sql}`,
    w.params,
  );
  const uw = new Where().add("role IN ('staff','manager')");
  uw.addIf(branchId, 'branch_id = ?', branchId);
  const staff = all(`SELECT id, full_name, role, branch_id FROM users ${uw.sql} ORDER BY branch_id, role DESC, full_name`, uw.params);
  res.json({ days, staff, shifts });
});

// ---------- Lịch tháng: số sự kiện mỗi ngày ----------
router.get('/calendar', (req, res) => {
  const month = String(req.query.month ?? fmtDate(new Date()).slice(0, 7));
  if (!/^\d{4}-\d{2}$/.test(month)) throw new HttpError(400, 'month phải có dạng YYYY-MM');
  const { branchId } = scopeOf(req);
  const from = `${month}-01`;
  const to = `${month}-31`;
  const result: Record<string, { events: number; deliveries: number; expiries: number }> = {};
  const bump = (d: string, k: 'events' | 'deliveries' | 'expiries', n: number) => {
    result[d] ??= { events: 0, deliveries: 0, expiries: 0 };
    result[d][k] += n;
  };

  const ew = new Where().add('substr(start_at,1,10) BETWEEN ? AND ?', from, to);
  if (branchId) ew.add('(branch_id IS NULL OR branch_id = ?)', branchId);
  for (const r of all<{ d: string; n: number }>(`SELECT substr(start_at,1,10) d, COUNT(*) n FROM events ${ew.sql} GROUP BY d`, ew.params)) bump(r.d, 'events', r.n);

  const pw = new Where().add("status IN ('ordered','received')").add('expected_date BETWEEN ? AND ?', from, to);
  pw.addIf(branchId, 'branch_id = ?', branchId);
  for (const r of all<{ d: string; n: number }>(`SELECT expected_date d, COUNT(*) n FROM purchase_orders ${pw.sql} GROUP BY d`, pw.params)) bump(r.d, 'deliveries', r.n);

  const bw = new Where().add('quantity > 0').add('expiry_date BETWEEN ? AND ?', from, to);
  bw.addIf(branchId, 'branch_id = ?', branchId);
  for (const r of all<{ d: string; n: number }>(`SELECT expiry_date d, COUNT(*) n FROM batches ${bw.sql} GROUP BY d`, bw.params)) bump(r.d, 'expiries', r.n);

  res.json(result);
});

// ---------- Lịch ngày: danh sách chi tiết ----------
router.get('/calendar/day', (req, res) => {
  const date = dateParam(req.query.date) ?? fmtDate(new Date());
  const { branchId } = scopeOf(req);
  const items: { id: string; kind: string; title: string; time: string; subtitle: string; people?: string[] }[] = [];

  const ew = new Where().add('substr(e.start_at,1,10) = ?', date);
  if (branchId) ew.add('(e.branch_id IS NULL OR e.branch_id = ?)', branchId);
  for (const e of all<{ id: number; title: string; type: string; location: string; start_at: string; end_at: string; branch: string | null }>(
    `SELECT e.*, br.name branch FROM events e LEFT JOIN branches br ON br.id = e.branch_id ${ew.sql} ORDER BY e.start_at`,
    ew.params,
  )) {
    items.push({
      id: `ev${e.id}`, kind: e.type, title: e.title,
      time: `${e.start_at.slice(11, 16)} - ${e.end_at.slice(11, 16)}`,
      subtitle: [e.location, e.branch].filter(Boolean).join(' · '),
    });
  }

  const pw = new Where().add('po.expected_date = ?', date).add("po.status IN ('ordered','received')");
  pw.addIf(branchId, 'po.branch_id = ?', branchId);
  for (const p of all<{ id: number; code: string; supplier: string; status: string; branch: string; items: number }>(
    `SELECT po.id, po.code, po.status, s.name supplier, br.name branch,
            (SELECT COUNT(*) FROM purchase_items WHERE purchase_order_id = po.id) items
     FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id JOIN branches br ON br.id = po.branch_id ${pw.sql}`,
    pw.params,
  )) {
    items.push({
      id: `po${p.id}`, kind: 'delivery', title: `Nhận hàng ${p.code}`,
      time: p.status === 'received' ? 'Đã nhận' : 'Trong ngày',
      subtitle: `${p.supplier} · ${p.items} mặt hàng · ${p.branch}`,
    });
  }

  const bw = new Where().add('b.expiry_date = ?', date).add('b.quantity > 0');
  bw.addIf(branchId, 'b.branch_id = ?', branchId);
  const exp = all<{ name: string; quantity: number; unit: string }>(
    `SELECT m.name, b.quantity, m.unit FROM batches b JOIN medicines m ON m.id = b.medicine_id ${bw.sql}`,
    bw.params,
  );
  if (exp.length) {
    items.push({
      id: `exp${date}`, kind: 'expiry', title: `${exp.length} lô thuốc hết hạn`, time: 'Cả ngày',
      subtitle: exp.map((e) => `${e.name} (${e.quantity} ${e.unit})`).join(', '),
    });
  }

  const sw = new Where().add('s.date = ?', date);
  sw.addIf(branchId, 'u.branch_id = ?', branchId);
  const shifts = all<{ shift: string; full_name: string; start_time: string; end_time: string }>(
    `SELECT s.shift, s.start_time, s.end_time, u.full_name FROM shifts s JOIN users u ON u.id = s.user_id ${sw.sql} ORDER BY s.start_time`,
    sw.params,
  );
  for (const sh of ['morning', 'afternoon'] as const) {
    const people = shifts.filter((s) => s.shift === sh);
    if (!people.length) continue;
    items.push({
      id: `sh${sh}`, kind: 'shift', title: sh === 'morning' ? 'Ca sáng' : 'Ca chiều',
      time: sh === 'morning' ? '07:00 - 14:00' : '14:00 - 22:00',
      subtitle: `${people.length} nhân sự`, people: people.map((p) => p.full_name),
    });
  }
  res.json({ date, items });
});

// Dùng cho test nhanh: thời gian máy chủ
router.get('/time', (_req, res) => res.json({ now: fmtDateTime(new Date()) }));

export default router;
