/**
 * Kho thuốc: danh sách, chi tiết theo lô, thêm/sửa/ngừng kinh doanh, nhập CSV, cảnh báo.
 */
import { Router, type Request } from 'express';
import { z } from 'zod';
import { all, get, run, transaction } from '../db/connection';
import { requireRole, scopeOf } from '../middleware/auth';
import { addDays, fmtDateTime, startOfDay } from '../lib/dates';
import { HttpError } from '../lib/http';
import { intParam, normalize, pageParams, Where } from '../lib/query';
import { expiringBatches, lowStock, stockList, type StockRow } from '../services/stock';

const router = Router();

/** Nhân viên bán hàng không được xem giá nhập. */
function hideCost<T extends { purchase_price?: number }>(req: Request, row: T): T {
  if (req.user!.role !== 'staff') return row;
  const { purchase_price: _omit, ...rest } = row;
  return rest as T;
}

// ---------- Danh sách ----------
router.get('/medicines', (req, res) => {
  const { branchId } = scopeOf(req);
  const q = normalize(String(req.query.q ?? '').trim());
  const category = Number(req.query.category) || null;
  const status = String(req.query.status ?? '');
  const rx = String(req.query.rx ?? '');
  const sort = String(req.query.sort ?? 'name');
  const dir = req.query.dir === 'desc' ? -1 : 1;
  const { page, pageSize, offset } = pageParams(req.query);

  let rows = stockList(branchId);
  const summary = {
    total: rows.length,
    out: rows.filter((r) => r.status === 'out').length,
    low: rows.filter((r) => r.status === 'low').length,
    value: rows.reduce((s, r) => s + r.stock * r.purchase_price, 0),
  };
  if (q) rows = rows.filter((r) => normalize(`${r.name} ${r.code} ${r.active_ingredient}`).includes(q));
  if (category) rows = rows.filter((r) => r.category_id === category);
  if (status) rows = rows.filter((r) => r.status === status);
  if (rx) rows = rows.filter((r) => String(r.requires_rx) === rx);

  const key = (['name', 'code', 'stock', 'sale_price', 'nearest_expiry', 'category'] as const).find((k) => k === sort) ?? 'name';
  rows.sort((a, b) => {
    const va = a[key as keyof StockRow] ?? '';
    const vb = b[key as keyof StockRow] ?? '';
    return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'vi')) * dir;
  });

  res.json({
    summary: req.user!.role === 'staff' ? { ...summary, value: undefined } : summary,
    total: rows.length,
    page,
    pageSize,
    rows: rows.slice(offset, offset + pageSize).map((r) => hideCost(req, r)),
  });
});

// ---------- Chi tiết ----------
router.get('/medicines/:id', (req, res) => {
  const id = intParam(req.params.id);
  const { branchId } = scopeOf(req);
  const med = stockList(branchId).find((m) => m.id === id);
  if (!med) throw new HttpError(404, 'Không tìm thấy thuốc');

  const bw = new Where().add('b.medicine_id = ?', id);
  bw.addIf(branchId, 'b.branch_id = ?', branchId);
  const batches = all(
    `SELECT b.id, b.batch_no, b.quantity, b.expiry_date, b.received_at, br.name branch,
            CAST(julianday(b.expiry_date) - julianday(date('now','localtime')) AS INTEGER) days_left
     FROM batches b JOIN branches br ON br.id = b.branch_id
     ${bw.sql} AND b.quantity > 0 ORDER BY b.expiry_date`,
    bw.params,
  );

  // Doanh số 30 ngày gần nhất theo ngày (sparkline)
  const ow = new Where().add('oi.medicine_id = ?', id).add("o.status = 'completed'")
    .add('o.created_at >= ?', fmtDateTime(addDays(startOfDay(new Date()), -29)));
  ow.addIf(branchId, 'o.branch_id = ?', branchId);
  const sales = all<{ d: string; qty: number; revenue: number }>(
    `SELECT substr(o.created_at,1,10) d, SUM(oi.quantity) qty, SUM(oi.quantity*oi.unit_price) revenue
     FROM order_items oi JOIN orders o ON o.id = oi.order_id ${ow.sql} GROUP BY d ORDER BY d`,
    ow.params,
  );
  res.json({
    ...hideCost(req, med),
    batches,
    sales30: {
      quantity: sales.reduce((s, r) => s + r.qty, 0),
      revenue: sales.reduce((s, r) => s + r.revenue, 0),
      daily: sales,
    },
  });
});

// ---------- Thêm / sửa ----------
const MedicineBody = z.object({
  code: z.string().trim().min(2).max(20),
  name: z.string().trim().min(2).max(120),
  active_ingredient: z.string().trim().max(200).optional().default(''),
  category_id: z.coerce.number().int().positive(),
  supplier_id: z.coerce.number().int().positive().nullable().optional(),
  unit: z.string().trim().min(1).max(20),
  purchase_price: z.coerce.number().int().min(0),
  sale_price: z.coerce.number().int().min(0),
  min_stock: z.coerce.number().int().min(0),
  requires_rx: z.coerce.boolean().optional().default(false),
});

router.post('/medicines', requireRole('owner', 'manager'), (req, res) => {
  const b = MedicineBody.parse(req.body);
  if (b.sale_price < b.purchase_price) throw new HttpError(400, 'Giá bán không được thấp hơn giá nhập');
  const r = run(
    `INSERT INTO medicines (code, name, active_ingredient, category_id, supplier_id, unit, purchase_price, sale_price, min_stock, requires_rx)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [b.code.toUpperCase(), b.name, b.active_ingredient, b.category_id, b.supplier_id ?? null, b.unit, b.purchase_price, b.sale_price, b.min_stock, b.requires_rx ? 1 : 0],
  );
  res.status(201).json({ id: Number(r.lastInsertRowid) });
});

router.put('/medicines/:id', requireRole('owner', 'manager'), (req, res) => {
  const id = intParam(req.params.id);
  const b = MedicineBody.parse(req.body);
  if (b.sale_price < b.purchase_price) throw new HttpError(400, 'Giá bán không được thấp hơn giá nhập');
  const r = run(
    `UPDATE medicines SET code=?, name=?, active_ingredient=?, category_id=?, supplier_id=?, unit=?,
            purchase_price=?, sale_price=?, min_stock=?, requires_rx=? WHERE id = ? AND is_active = 1`,
    [b.code.toUpperCase(), b.name, b.active_ingredient, b.category_id, b.supplier_id ?? null, b.unit, b.purchase_price, b.sale_price, b.min_stock, b.requires_rx ? 1 : 0, id],
  );
  if (!r.changes) throw new HttpError(404, 'Không tìm thấy thuốc');
  res.json({ ok: true });
});

/** "Xóa" = ngừng kinh doanh (xóa mềm) để không mất lịch sử bán hàng. */
router.delete('/medicines/:id', requireRole('owner', 'manager'), (req, res) => {
  const r = run('UPDATE medicines SET is_active = 0 WHERE id = ?', [intParam(req.params.id)]);
  if (!r.changes) throw new HttpError(404, 'Không tìm thấy thuốc');
  res.json({ ok: true });
});

// ---------- Nhập danh mục thuốc từ CSV ----------
// Cột: code,name,active_ingredient,category,unit,purchase_price,sale_price,min_stock,requires_rx
router.post('/medicines/import', requireRole('owner', 'manager'), (req, res) => {
  const csv = z.object({ csv: z.string().min(1).max(2_000_000) }).parse(req.body).csv.replace(/^﻿/, '');
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new HttpError(400, 'File CSV cần có dòng tiêu đề và ít nhất 1 dòng dữ liệu');
  const header = splitCsv(lines[0]).map((h) => h.trim().toLowerCase());
  const need = ['code', 'name', 'category', 'unit', 'purchase_price', 'sale_price'];
  const missing = need.filter((h) => !header.includes(h));
  if (missing.length) throw new HttpError(400, `Thiếu cột: ${missing.join(', ')}`);

  const cats = new Map(all<{ id: number; name: string }>('SELECT id, name FROM categories').map((c) => [normalize(c.name), c.id]));
  const result = { inserted: 0, updated: 0, errors: [] as string[] };
  transaction(() => {
    lines.slice(1).forEach((line, i) => {
      const cells = splitCsv(line);
      const rec = Object.fromEntries(header.map((h, j) => [h, (cells[j] ?? '').trim()]));
      const categoryId = cats.get(normalize(rec.category));
      if (!categoryId) return void result.errors.push(`Dòng ${i + 2}: không có nhóm thuốc "${rec.category}"`);
      const parsed = MedicineBody.safeParse({ ...rec, category_id: categoryId, requires_rx: ['1', 'true', 'có', 'x'].includes((rec.requires_rx ?? '').toLowerCase()), min_stock: rec.min_stock || 20 });
      if (!parsed.success) return void result.errors.push(`Dòng ${i + 2}: dữ liệu không hợp lệ`);
      const b = parsed.data;
      const exists = get<{ id: number }>('SELECT id FROM medicines WHERE code = ?', [b.code.toUpperCase()]);
      if (exists) {
        run(`UPDATE medicines SET name=?, active_ingredient=?, category_id=?, unit=?, purchase_price=?, sale_price=?, min_stock=?, requires_rx=?, is_active=1 WHERE id=?`,
          [b.name, b.active_ingredient, b.category_id, b.unit, b.purchase_price, b.sale_price, b.min_stock, b.requires_rx ? 1 : 0, exists.id]);
        result.updated++;
      } else {
        run(`INSERT INTO medicines (code, name, active_ingredient, category_id, unit, purchase_price, sale_price, min_stock, requires_rx) VALUES (?,?,?,?,?,?,?,?,?)`,
          [b.code.toUpperCase(), b.name, b.active_ingredient, b.category_id, b.unit, b.purchase_price, b.sale_price, b.min_stock, b.requires_rx ? 1 : 0]);
        result.inserted++;
      }
    });
  });
  res.json(result);
});

/** Tách 1 dòng CSV, hỗ trợ giá trị trong dấu ngoặc kép. */
function splitCsv(line: string) {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

// ---------- Cảnh báo tồn kho ----------
router.get('/inventory/alerts', (req, res) => {
  const { branchId } = scopeOf(req);
  const type = String(req.query.type ?? 'expiring');
  if (type === 'low') return res.json(lowStock(branchId));
  const days = [30, 60, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 90;
  const rows = expiringBatches(branchId, days);
  res.json(req.user!.role === 'staff' ? rows.map(({ value: _v, ...r }) => r) : rows);
});

/** Tóm tắt cho card "Cảnh báo tồn kho" ở trang tổng quan. */
router.get('/inventory/alert-summary', (req, res) => {
  const { branchId } = scopeOf(req);
  const exp = expiringBatches(branchId, 90);
  const low = lowStock(branchId);
  const items = [
    ...exp.map((e) => ({
      key: `e${e.batch_id}`, medicine_id: e.medicine_id, name: e.name, detail: `Lô ${e.batch_no} · ${e.quantity} ${e.unit}`,
      kind: e.days_left < 0 ? 'expired' : e.days_left <= 30 ? 'exp30' : e.days_left <= 60 ? 'exp60' : 'exp90',
      days_left: e.days_left, branch: e.branch,
    })),
    ...low.map((l) => ({
      key: `l${l.medicine_id}-${l.branch_id}`, medicine_id: l.medicine_id, name: l.name, detail: `Còn ${l.stock}/${l.min_stock} ${l.unit}`,
      kind: l.stock === 0 ? 'out' : 'low', days_left: null, branch: l.branch,
    })),
  ];
  const order = ['expired', 'out', 'exp30', 'low', 'exp60', 'exp90'];
  items.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  res.json({
    counts: {
      expired: exp.filter((e) => e.days_left < 0).length,
      exp30: exp.filter((e) => e.days_left >= 0 && e.days_left <= 30).length,
      exp60: exp.filter((e) => e.days_left > 30 && e.days_left <= 60).length,
      exp90: exp.filter((e) => e.days_left > 60).length,
      out: low.filter((l) => l.stock === 0).length,
      low: low.filter((l) => l.stock > 0).length,
    },
    items: items.slice(0, Number(req.query.limit) || 6),
  });
});

export default router;
