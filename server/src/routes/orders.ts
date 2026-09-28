/**
 * Đơn hàng (chỉ xem + lọc) và Khách hàng.
 */
import { Router } from 'express';
import { all, get } from '../db/connection';
import { scopeOf } from '../middleware/auth';
import { HttpError } from '../lib/http';
import { dateParam, intParam, normalize, pageParams, Where } from '../lib/query';

const router = Router();

export const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Tiền mặt',
  transfer: 'Chuyển khoản',
  ewallet: 'Ví điện tử',
  card: 'Thẻ',
};

// ---------- Danh sách đơn hàng ----------
router.get('/orders', (req, res) => {
  const { branchId, staffId } = scopeOf(req);
  const from = dateParam(req.query.from);
  const to = dateParam(req.query.to);
  const { page, pageSize, offset } = pageParams(req.query);

  const w = new Where();
  w.addIf(branchId, 'o.branch_id = ?', branchId);
  w.addIf(staffId, 'o.user_id = ?', staffId);
  w.addIf(from, 'o.created_at >= ?', `${from} 00:00:00`);
  w.addIf(to, 'o.created_at <= ?', `${to} 23:59:59`);
  // Lọc theo nhân viên chỉ có tác dụng với chủ/quản lý
  if (!staffId) w.addIf(req.query.staff, 'o.user_id = ?', Number(req.query.staff));
  w.addIf(req.query.payment, 'o.payment_method = ?', String(req.query.payment));
  w.addIf(req.query.status, 'o.status = ?', String(req.query.status));
  if (req.query.customer === 'member') w.add('o.customer_id IS NOT NULL');
  if (req.query.customer === 'walkin') w.add('o.customer_id IS NULL');
  const q = String(req.query.q ?? '').trim();
  if (q) {
    // Tìm theo mã đơn, SĐT hoặc tên khách (không dấu)
    const ids = all<{ id: number; name: string; phone: string }>('SELECT id, name, phone FROM customers')
      .filter((c) => normalize(c.name).includes(normalize(q)) || c.phone.includes(q))
      .map((c) => c.id)
      .slice(0, 500);
    w.add(`(o.code LIKE ? ${ids.length ? `OR o.customer_id IN (${ids.join(',')})` : ''})`, `%${q.toUpperCase()}%`);
  }

  const sortCol = ({ created_at: 'o.created_at', total: 'o.total', code: 'o.code' } as Record<string, string>)[String(req.query.sort)] ?? 'o.created_at';
  const dir = req.query.dir === 'asc' ? 'ASC' : 'DESC';

  const summary = get<{ count: number; revenue: number; avg: number }>(
    `SELECT COUNT(*) count, COALESCE(SUM(CASE WHEN o.status='completed' THEN o.total END),0) revenue,
            COALESCE(AVG(o.total),0) avg FROM orders o ${w.sql}`,
    w.params,
  )!;
  const rows = all(
    `SELECT o.id, o.code, o.created_at, o.payment_method, o.subtotal, o.discount, o.total, o.status,
            c.name customer, c.phone customer_phone, u.full_name staff, br.name branch,
            (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) items
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     JOIN users u ON u.id = o.user_id
     JOIN branches br ON br.id = o.branch_id
     ${w.sql}
     ORDER BY ${sortCol} ${dir} LIMIT ? OFFSET ?`,
    [...w.params, pageSize, offset],
  );
  res.json({ summary: { ...summary, avg: Math.round(summary.avg) }, total: summary.count, page, pageSize, rows });
});

// ---------- Chi tiết đơn ----------
router.get('/orders/:id', (req, res) => {
  const { branchId, staffId } = scopeOf(req);
  const order = get<{ branch_id: number; user_id: number }>(
    `SELECT o.*, c.name customer, c.phone customer_phone, c.tier customer_tier,
            u.full_name staff, br.name branch, br.address branch_address
     FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
     JOIN users u ON u.id = o.user_id JOIN branches br ON br.id = o.branch_id
     WHERE o.id = ?`,
    [intParam(req.params.id)],
  );
  if (!order || (branchId && order.branch_id !== branchId) || (staffId && order.user_id !== staffId)) {
    throw new HttpError(404, 'Không tìm thấy đơn hàng');
  }
  const items = all(
    `SELECT oi.id, m.code, m.name, m.unit, oi.quantity, oi.unit_price, b.batch_no, b.expiry_date,
            oi.quantity * oi.unit_price amount, m.requires_rx
     FROM order_items oi JOIN medicines m ON m.id = oi.medicine_id LEFT JOIN batches b ON b.id = oi.batch_id
     WHERE oi.order_id = ?`,
    [intParam(req.params.id)],
  );
  res.json({ ...order, items });
});

// ---------- Danh sách nhân viên cho bộ lọc ----------
router.get('/orders-filters/staff', (req, res) => {
  const { branchId } = scopeOf(req);
  const w = new Where().add("role IN ('staff','manager')");
  w.addIf(branchId, 'branch_id = ?', branchId);
  res.json(all(`SELECT id, full_name FROM users ${w.sql} ORDER BY full_name`, w.params));
});

// ---------- Khách hàng ----------
router.get('/customers', (req, res) => {
  const { branchId } = scopeOf(req);
  const { page, pageSize, offset } = pageParams(req.query);
  const ow = new Where().add("o.status = 'completed'");
  ow.addIf(branchId, 'o.branch_id = ?', branchId);

  let rows = all<{ id: number; name: string; phone: string; tier: string; orders: number; spent: number; last_order: string | null }>(
    `SELECT c.id, c.name, c.phone, c.gender, c.birth_year, c.tier, c.points, c.created_at,
            COALESCE(s.orders,0) orders, COALESCE(s.spent,0) spent, s.last_order
     FROM customers c
     LEFT JOIN (SELECT o.customer_id, COUNT(*) orders, SUM(o.total) spent, MAX(o.created_at) last_order
                FROM orders o ${ow.sql} GROUP BY o.customer_id) s ON s.customer_id = c.id`,
    ow.params,
  );
  // Chi nhánh cụ thể: chỉ hiện khách đã từng mua ở chi nhánh đó
  if (branchId) rows = rows.filter((r) => r.orders > 0);

  const summary = {
    total: rows.length,
    gold: rows.filter((r) => r.tier === 'Vàng').length,
    silver: rows.filter((r) => r.tier === 'Bạc').length,
    active30: rows.filter((r) => r.last_order && Date.now() - new Date(r.last_order.replace(' ', 'T')).getTime() < 30 * 86_400_000).length,
  };

  const q = normalize(String(req.query.q ?? '').trim());
  if (q) rows = rows.filter((r) => normalize(r.name).includes(q) || r.phone.includes(q));
  if (req.query.tier) rows = rows.filter((r) => r.tier === req.query.tier);
  const sort = String(req.query.sort ?? 'spent');
  const dir = req.query.dir === 'asc' ? 1 : -1;
  rows.sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name, 'vi') * dir;
    if (sort === 'last_order') return String(a.last_order ?? '').localeCompare(String(b.last_order ?? '')) * dir;
    if (sort === 'orders') return (a.orders - b.orders) * dir;
    return (a.spent - b.spent) * dir;
  });
  res.json({ summary, total: rows.length, page, pageSize, rows: rows.slice(offset, offset + pageSize) });
});

router.get('/customers/:id', (req, res) => {
  const id = intParam(req.params.id);
  const { branchId, staffId } = scopeOf(req);
  const customer = get('SELECT * FROM customers WHERE id = ?', [id]);
  if (!customer) throw new HttpError(404, 'Không tìm thấy khách hàng');
  const ow = new Where().add('o.customer_id = ?', id);
  ow.addIf(branchId, 'o.branch_id = ?', branchId);
  const orders = all<{ total: number; status: string }>(
    `SELECT o.id, o.code, o.created_at, o.total, o.status, o.payment_method, br.name branch, u.full_name staff,
            (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) items
     FROM orders o JOIN branches br ON br.id = o.branch_id JOIN users u ON u.id = o.user_id
     ${ow.sql} ORDER BY o.created_at DESC`,
    ow.params,
  );
  const favorites = all(
    `SELECT m.name, m.unit, SUM(oi.quantity) quantity, COUNT(DISTINCT o.id) times
     FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN medicines m ON m.id = oi.medicine_id
     ${ow.sql} GROUP BY m.id ORDER BY times DESC, quantity DESC LIMIT 5`,
    ow.params,
  );
  const done = orders.filter((o) => o.status === 'completed');
  res.json({
    ...customer,
    stats: {
      orders: done.length,
      spent: done.reduce((s, o) => s + o.total, 0),
      avg: done.length ? Math.round(done.reduce((s, o) => s + o.total, 0) / done.length) : 0,
    },
    favorites,
    // Nhân viên chỉ xem 20 đơn gần nhất
    orders: orders.slice(0, staffId ? 20 : 100),
  });
});

export default router;
