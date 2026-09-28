/**
 * API phụ trợ cho layout: chi nhánh, danh mục, số đếm sidebar,
 * tìm kiếm toàn cục, thông báo.
 */
import { Router } from 'express';
import { all, get } from '../db/connection';
import { scopeOf } from '../middleware/auth';
import { fmtDate } from '../lib/dates';
import { normalize, Where } from '../lib/query';
import { expiringBatches, lowStock } from '../services/stock';

const router = Router();

router.get('/branches', (req, res) => {
  const u = req.user!;
  const rows = all('SELECT id, name, address FROM branches ORDER BY id');
  res.json(u.role === 'owner' ? rows : rows.filter((b) => b.id === u.branch_id));
});

router.get('/categories', (_req, res) => {
  res.json(all('SELECT id, name FROM categories ORDER BY id'));
});

/** Số đếm cho mục "Truy cập nhanh" và widget sức chứa kho ở sidebar. */
router.get('/sidebar', (req, res) => {
  const { branchId } = scopeOf(req);
  const bw = new Where();
  bw.addIf(branchId, 'branch_id = ?', branchId);
  const stock = get<{ units: number }>(`SELECT COALESCE(SUM(quantity),0) units FROM batches ${bw.sql}`, bw.params)!;
  const cap = get<{ c: number }>(`SELECT SUM(capacity) c FROM branches ${branchId ? 'WHERE id = ?' : ''}`, branchId ? [branchId] : [])!;
  const pw = new Where().add("status IN ('ordered','draft')");
  pw.addIf(branchId, 'branch_id = ?', branchId);
  res.json({
    expiring: expiringBatches(branchId, 30).length,
    lowStock: lowStock(branchId).length,
    suppliers: get<{ n: number }>('SELECT COUNT(*) n FROM suppliers')!.n,
    pendingPurchases: get<{ n: number }>(`SELECT COUNT(*) n FROM purchase_orders ${pw.sql}`, pw.params)!.n,
    storage: { units: stock.units, capacity: cap.c, percent: Math.round((stock.units / cap.c) * 100) },
  });
});

/** Tìm kiếm nhanh ở topbar: thuốc, khách hàng, đơn hàng. Không phân biệt dấu. */
router.get('/search', (req, res) => {
  const q = normalize(String(req.query.q ?? '').trim());
  if (q.length < 2) return res.json({ medicines: [], customers: [], orders: [] });
  const { branchId, staffId } = scopeOf(req);

  const medicines = all<{ id: number; code: string; name: string; unit: string; sale_price: number }>(
    'SELECT id, code, name, unit, sale_price FROM medicines WHERE is_active = 1',
  )
    .filter((m) => normalize(`${m.name} ${m.code}`).includes(q))
    .slice(0, 5);
  const customers = all<{ id: number; name: string; phone: string; tier: string }>('SELECT id, name, phone, tier FROM customers')
    .filter((c) => normalize(c.name).includes(q) || c.phone.includes(q))
    .slice(0, 5);
  const ow = new Where().add('o.code LIKE ?', `%${q.toUpperCase()}%`);
  ow.addIf(branchId, 'o.branch_id = ?', branchId);
  ow.addIf(staffId, 'o.user_id = ?', staffId);
  const orders = all(
    `SELECT o.id, o.code, o.total, o.created_at FROM orders o ${ow.sql} ORDER BY o.created_at DESC LIMIT 5`,
    ow.params,
  );
  res.json({ medicines, customers, orders });
});

/** Thông báo cho chuông: hàng hết hạn/sắp hết hạn, hết hàng, phiếu nhập giao hôm nay. */
router.get('/notifications', (req, res) => {
  const { branchId } = scopeOf(req);
  const items: { id: string; type: 'danger' | 'warning' | 'info'; title: string; detail: string; link: string }[] = [];

  for (const b of expiringBatches(branchId, 30).slice(0, 6)) {
    items.push({
      id: `exp-${b.batch_id}`,
      type: b.days_left < 0 ? 'danger' : 'warning',
      title: b.days_left < 0 ? `${b.name} đã hết hạn` : `${b.name} còn ${b.days_left} ngày hết hạn`,
      detail: `Lô ${b.batch_no} · ${b.quantity} ${b.unit} · ${b.branch}`,
      link: '/inventory?tab=expiring',
    });
  }
  for (const l of lowStock(branchId).filter((x) => x.stock === 0).slice(0, 4)) {
    items.push({
      id: `out-${l.medicine_id}-${l.branch_id}`,
      type: 'danger',
      title: `${l.name} đã hết hàng`,
      detail: l.branch,
      link: '/inventory?tab=low',
    });
  }
  const pw = new Where().add("po.status = 'ordered'").add('po.expected_date = ?', fmtDate(new Date()));
  pw.addIf(branchId, 'po.branch_id = ?', branchId);
  for (const p of all<{ id: number; code: string; supplier: string }>(
    `SELECT po.id, po.code, s.name supplier FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id ${pw.sql}`,
    pw.params,
  )) {
    items.push({ id: `po-${p.id}`, type: 'info', title: `Phiếu nhập ${p.code} giao hôm nay`, detail: p.supplier, link: '/purchases' });
  }
  res.json(items);
});

/** Thời điểm có dữ liệu mới nhất, client dùng để hiển thị "Cập nhật lần cuối". */
router.get('/last-update', (req, res) => {
  const { branchId } = scopeOf(req);
  const w = new Where();
  w.addIf(branchId, 'branch_id = ?', branchId);
  res.json(get(`SELECT MAX(created_at) AS last_order_at, COUNT(*) AS total_orders FROM orders ${w.sql}`, w.params));
});

export default router;
