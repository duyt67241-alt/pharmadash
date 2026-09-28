/**
 * Báo cáo: xem trước (JSON) và xuất CSV/PDF. Chỉ Chủ và Quản lý.
 * Tải file dùng ?token= vì trình duyệt mở link trực tiếp không gửi header.
 */
import { Router, type Request } from 'express';
import { get } from '../db/connection';
import { requireRole, scopeOf } from '../middleware/auth';
import { addDays, fmtDate, startOfDay } from '../lib/dates';
import { dateParam } from '../lib/query';
import { HttpError } from '../lib/http';
import { inventoryCsv, inventoryPdf, inventoryReport, revenueCsv, revenuePdf, revenueReport } from '../services/reports';

const router = Router();
router.use('/reports', requireRole('owner', 'manager'));

function range(req: Request) {
  const to = dateParam(req.query.to) ?? fmtDate(new Date());
  const from = dateParam(req.query.from) ?? fmtDate(addDays(startOfDay(new Date()), -29));
  if (from > to) throw new HttpError(400, 'Ngày bắt đầu phải trước ngày kết thúc');
  return { from, to, branchId: scopeOf(req).branchId };
}

function branchName(branchId: number | null) {
  return branchId ? get<{ name: string }>('SELECT name FROM branches WHERE id = ?', [branchId])?.name ?? '' : 'Tất cả chi nhánh';
}

function sendFile(res: import('express').Response, name: string, type: string) {
  res.setHeader('Content-Type', type);
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
}

router.get('/reports/revenue', (req, res) => res.json(revenueReport(range(req))));
router.get('/reports/inventory', (req, res) => res.json(inventoryReport(scopeOf(req).branchId)));

router.get('/reports/revenue.csv', (req, res) => {
  const r = range(req);
  sendFile(res, `doanh-thu_${r.from}_${r.to}.csv`, 'text/csv; charset=utf-8');
  res.send(revenueCsv(revenueReport(r)));
});

router.get('/reports/revenue.pdf', (req, res) => {
  const r = range(req);
  sendFile(res, `doanh-thu_${r.from}_${r.to}.pdf`, 'application/pdf');
  revenuePdf(revenueReport(r), branchName(r.branchId)).pipe(res);
});

router.get('/reports/inventory.csv', (req, res) => {
  const { branchId } = scopeOf(req);
  sendFile(res, `ton-kho_${fmtDate(new Date())}.csv`, 'text/csv; charset=utf-8');
  res.send(inventoryCsv(inventoryReport(branchId)));
});

router.get('/reports/inventory.pdf', (req, res) => {
  const { branchId } = scopeOf(req);
  sendFile(res, `ton-kho_${fmtDate(new Date())}.pdf`, 'application/pdf');
  inventoryPdf(inventoryReport(branchId), branchName(branchId)).pipe(res);
});

export default router;
