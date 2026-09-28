/**
 * Nhập hàng (phiếu nhập) & Nhà cung cấp. Chỉ Chủ và Quản lý được truy cập.
 * Luồng trạng thái phiếu: draft -> ordered -> received (tạo lô tồn kho) | cancelled
 */
import { Router } from 'express';
import { z } from 'zod';
import { all, get, run, transaction } from '../db/connection';
import { requireRole, scopeOf } from '../middleware/auth';
import { addMonths, fmtDate, fmtDateTime } from '../lib/dates';
import { HttpError } from '../lib/http';
import { intParam, normalize, pageParams, Where } from '../lib/query';

const router = Router();
router.use(['/purchases', '/suppliers'], requireRole('owner', 'manager'));

// ---------- Danh sách phiếu nhập ----------
router.get('/purchases', (req, res) => {
  const { branchId } = scopeOf(req);
  const { page, pageSize, offset } = pageParams(req.query);
  const w = new Where();
  w.addIf(branchId, 'po.branch_id = ?', branchId);
  w.addIf(req.query.status, 'po.status = ?', String(req.query.status));
  w.addIf(req.query.supplier, 'po.supplier_id = ?', Number(req.query.supplier));
  w.addIf(req.query.q, 'po.code LIKE ?', `%${String(req.query.q).toUpperCase()}%`);

  const summary = get(
    `SELECT COUNT(*) total,
            SUM(CASE WHEN status='ordered' THEN 1 ELSE 0 END) ordered,
            SUM(CASE WHEN status='draft' THEN 1 ELSE 0 END) draft,
            COALESCE(SUM(CASE WHEN status='received' AND received_at >= date('now','localtime','-30 day') THEN total END),0) received30
     FROM purchase_orders po ${w.sql}`,
    w.params,
  );
  const rows = all(
    `SELECT po.id, po.code, po.created_at, po.expected_date, po.received_at, po.status, po.total, po.note,
            s.name supplier, u.full_name created_by, br.name branch,
            (SELECT COUNT(*) FROM purchase_items WHERE purchase_order_id = po.id) items
     FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id
     JOIN users u ON u.id = po.user_id JOIN branches br ON br.id = po.branch_id
     ${w.sql}
     ORDER BY CASE po.status WHEN 'draft' THEN 0 WHEN 'ordered' THEN 1 ELSE 2 END, po.created_at DESC
     LIMIT ? OFFSET ?`,
    [...w.params, pageSize, offset],
  );
  res.json({ summary, total: (summary as { total: number }).total, page, pageSize, rows });
});

router.get('/purchases/:id', (req, res) => {
  const id = intParam(req.params.id);
  const po = loadPO(id, scopeOf(req).branchId);
  const items = all(
    `SELECT pi.id, pi.medicine_id, m.code, m.name, m.unit, pi.quantity, pi.unit_cost, pi.batch_no, pi.expiry_date,
            pi.quantity * pi.unit_cost amount
     FROM purchase_items pi JOIN medicines m ON m.id = pi.medicine_id WHERE pi.purchase_order_id = ?`,
    [id],
  );
  res.json({ ...po, items });
});

function loadPO(id: number, branchId: number | null) {
  const po = get<{ id: number; branch_id: number; status: string; code: string }>(
    `SELECT po.*, s.name supplier, s.phone supplier_phone, u.full_name created_by, br.name branch
     FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id
     JOIN users u ON u.id = po.user_id JOIN branches br ON br.id = po.branch_id WHERE po.id = ?`,
    [id],
  );
  if (!po || (branchId && po.branch_id !== branchId)) throw new HttpError(404, 'Không tìm thấy phiếu nhập');
  return po;
}

// ---------- Tạo phiếu nhập ----------
const PurchaseBody = z.object({
  supplier_id: z.coerce.number().int().positive(),
  branch_id: z.coerce.number().int().positive().optional(),
  expected_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['draft', 'ordered']).default('ordered'),
  note: z.string().max(300).optional(),
  items: z
    .array(z.object({
      medicine_id: z.coerce.number().int().positive(),
      quantity: z.coerce.number().int().positive().max(100000),
      unit_cost: z.coerce.number().int().min(0),
    }))
    .min(1, 'Phiếu nhập cần ít nhất 1 thuốc'),
});

router.post('/purchases', (req, res) => {
  const b = PurchaseBody.parse(req.body);
  const u = req.user!;
  const branchId = u.role === 'owner' ? b.branch_id ?? scopeOf(req).branchId : u.branch_id;
  if (!branchId) throw new HttpError(400, 'Vui lòng chọn chi nhánh nhận hàng');

  const id = transaction(() => {
    const today = fmtDate(new Date()).slice(2).replace(/-/g, '');
    const seq = get<{ n: number }>('SELECT COUNT(*) + 1 n FROM purchase_orders WHERE code LIKE ?', [`PN${today}%`])!.n;
    const total = b.items.reduce((s, i) => s + i.quantity * i.unit_cost, 0);
    const r = run(
      `INSERT INTO purchase_orders (code, supplier_id, user_id, branch_id, created_at, expected_date, status, total, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [`PN${today}${String(seq + 100).padStart(3, '0')}`, b.supplier_id, u.id, branchId, fmtDateTime(new Date()), b.expected_date, b.status, total, b.note ?? null],
    );
    const poId = Number(r.lastInsertRowid);
    for (const it of b.items) {
      run('INSERT INTO purchase_items (purchase_order_id, medicine_id, quantity, unit_cost) VALUES (?, ?, ?, ?)', [poId, it.medicine_id, it.quantity, it.unit_cost]);
    }
    return poId;
  });
  res.status(201).json({ id });
});

// ---------- Đổi trạng thái: đặt hàng / hủy ----------
router.patch('/purchases/:id/status', (req, res) => {
  const id = intParam(req.params.id);
  const { status } = z.object({ status: z.enum(['ordered', 'cancelled']) }).parse(req.body);
  const po = loadPO(id, scopeOf(req).branchId);
  if (po.status === 'received' || po.status === 'cancelled') throw new HttpError(400, 'Phiếu đã hoàn tất, không thể đổi trạng thái');
  run('UPDATE purchase_orders SET status = ? WHERE id = ?', [status, id]);
  res.json({ ok: true });
});

// ---------- Nhận hàng: tạo lô tồn kho cho từng dòng ----------
const ReceiveBody = z.object({
  items: z
    .array(z.object({
      id: z.coerce.number().int().positive(),
      batch_no: z.string().trim().min(1).max(30).optional(),
      expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }))
    .optional(),
});

router.patch('/purchases/:id/receive', (req, res) => {
  const id = intParam(req.params.id);
  const body = ReceiveBody.parse(req.body ?? {});
  const po = loadPO(id, scopeOf(req).branchId);
  if (po.status !== 'ordered') throw new HttpError(400, 'Chỉ nhận hàng cho phiếu đang ở trạng thái "Đã đặt"');

  const overrides = new Map((body.items ?? []).map((i) => [i.id, i]));
  const now = new Date();
  transaction(() => {
    const items = all<{ id: number; medicine_id: number; quantity: number; batch_no: string | null; expiry_date: string | null }>(
      'SELECT id, medicine_id, quantity, batch_no, expiry_date FROM purchase_items WHERE purchase_order_id = ?',
      [id],
    );
    for (const it of items) {
      const o = overrides.get(it.id);
      const batchNo = o?.batch_no ?? it.batch_no ?? `L${fmtDate(now).replace(/-/g, '').slice(2)}${it.id}`;
      // Mặc định hạn dùng 24 tháng nếu không nhập
      const expiry = o?.expiry_date ?? it.expiry_date ?? fmtDate(addMonths(now, 24));
      if (expiry <= fmtDate(now)) throw new HttpError(400, `Lô ${batchNo} có hạn dùng không hợp lệ`);
      run('UPDATE purchase_items SET batch_no = ?, expiry_date = ? WHERE id = ?', [batchNo, expiry, it.id]);
      run(
        'INSERT INTO batches (medicine_id, branch_id, batch_no, quantity, expiry_date, received_at, purchase_item_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [it.medicine_id, po.branch_id, batchNo, it.quantity, expiry, fmtDateTime(now), it.id],
      );
    }
    run("UPDATE purchase_orders SET status = 'received', received_at = ? WHERE id = ?", [fmtDateTime(now), id]);
  });
  res.json({ ok: true });
});

// ---------- Nhà cung cấp ----------
router.get('/suppliers', (req, res) => {
  const q = normalize(String(req.query.q ?? ''));
  const rows = all<{ name: string }>(
    `SELECT s.*,
            (SELECT COUNT(*) FROM medicines m WHERE m.supplier_id = s.id AND m.is_active = 1) medicines,
            (SELECT COUNT(*) FROM purchase_orders p WHERE p.supplier_id = s.id) purchases,
            (SELECT COALESCE(SUM(total),0) FROM purchase_orders p WHERE p.supplier_id = s.id AND p.status = 'received') purchased_total,
            (SELECT MAX(created_at) FROM purchase_orders p WHERE p.supplier_id = s.id) last_purchase
     FROM suppliers s ORDER BY s.name`,
  );
  res.json(q ? rows.filter((r) => normalize(r.name).includes(q)) : rows);
});

const SupplierBody = z.object({
  name: z.string().trim().min(3).max(150),
  phone: z.string().trim().max(30).optional().default(''),
  email: z.string().trim().email().or(z.literal('')).optional().default(''),
  address: z.string().trim().max(200).optional().default(''),
  tax_code: z.string().trim().max(20).optional().default(''),
});

router.post('/suppliers', (req, res) => {
  const b = SupplierBody.parse(req.body);
  const r = run('INSERT INTO suppliers (name, phone, email, address, tax_code) VALUES (?, ?, ?, ?, ?)', [b.name, b.phone, b.email, b.address, b.tax_code]);
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

router.put('/suppliers/:id', (req, res) => {
  const b = SupplierBody.parse(req.body);
  const r = run('UPDATE suppliers SET name=?, phone=?, email=?, address=?, tax_code=? WHERE id = ?', [b.name, b.phone, b.email, b.address, b.tax_code, intParam(req.params.id)]);
  if (!r.changes) throw new HttpError(404, 'Không tìm thấy nhà cung cấp');
  res.json({ ok: true });
});

export default router;
