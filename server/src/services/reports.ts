/**
 * Dữ liệu và xuất file báo cáo (CSV/PDF).
 * PDF dùng pdfkit + font Roboto nhúng sẵn để hiển thị đúng tiếng Việt.
 */
import PDFDocument from 'pdfkit';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { all, get } from '../db/connection';
import { fmtDateTime } from '../lib/dates';
import { Where } from '../lib/query';
import { stockList } from './stock';
import { PHARMACY_NAME } from '../db/seed/data';

const FONT_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../assets/fonts');

export interface ReportScope {
  branchId: number | null;
  from: string; // YYYY-MM-DD
  to: string;
}

const PAYMENT: Record<string, string> = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', ewallet: 'Ví điện tử', card: 'Thẻ' };

export function revenueReport({ branchId, from, to }: ReportScope) {
  const w = new Where().add("o.status = 'completed'").add('o.created_at >= ?', `${from} 00:00:00`).add('o.created_at <= ?', `${to} 23:59:59`);
  w.addIf(branchId, 'o.branch_id = ?', branchId);

  const daily = all<{ date: string; orders: number; revenue: number; cost: number; profit: number }>(
    `SELECT substr(o.created_at,1,10) date, COUNT(DISTINCT o.id) orders, 0 revenue,
            SUM(oi.quantity * oi.unit_cost) cost, 0 profit
     FROM orders o JOIN order_items oi ON oi.order_id = o.id ${w.sql} GROUP BY date ORDER BY date`,
    w.params,
  );
  // Doanh thu lấy theo tổng đơn (đã trừ chiết khấu) nên tính riêng
  const revByDay = new Map(
    all<{ date: string; revenue: number }>(`SELECT substr(o.created_at,1,10) date, SUM(o.total) revenue FROM orders o ${w.sql} GROUP BY date`, w.params)
      .map((r) => [r.date, r.revenue]),
  );
  for (const d of daily) {
    d.revenue = revByDay.get(d.date) ?? 0;
    d.profit = d.revenue - d.cost;
  }

  const summary = {
    revenue: daily.reduce((s, d) => s + d.revenue, 0),
    cost: daily.reduce((s, d) => s + d.cost, 0),
    profit: daily.reduce((s, d) => s + d.profit, 0),
    orders: daily.reduce((s, d) => s + d.orders, 0),
    customers: get<{ n: number }>(`SELECT COUNT(DISTINCT o.customer_id) n FROM orders o ${w.sql}`, w.params)!.n,
    avg_order: 0,
  };
  summary.avg_order = summary.orders ? Math.round(summary.revenue / summary.orders) : 0;

  const categories = all<{ name: string; revenue: number; quantity: number }>(
    `SELECT c.name, SUM(oi.quantity*oi.unit_price) revenue, SUM(oi.quantity) quantity
     FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN medicines m ON m.id = oi.medicine_id
     JOIN categories c ON c.id = m.category_id ${w.sql} GROUP BY c.id ORDER BY revenue DESC`,
    w.params,
  );
  const topMedicines = all<{ code: string; name: string; unit: string; quantity: number; revenue: number }>(
    `SELECT m.code, m.name, m.unit, SUM(oi.quantity) quantity, SUM(oi.quantity*oi.unit_price) revenue
     FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN medicines m ON m.id = oi.medicine_id
     ${w.sql} GROUP BY m.id ORDER BY revenue DESC LIMIT 10`,
    w.params,
  );
  const payments = all<{ method: string; orders: number; revenue: number }>(
    `SELECT o.payment_method method, COUNT(*) orders, SUM(o.total) revenue FROM orders o ${w.sql} GROUP BY method ORDER BY revenue DESC`,
    w.params,
  ).map((p) => ({ ...p, label: PAYMENT[p.method] ?? p.method }));
  const staff = all<{ name: string; branch: string; orders: number; revenue: number }>(
    `SELECT u.full_name name, br.name branch, COUNT(*) orders, SUM(o.total) revenue
     FROM orders o JOIN users u ON u.id = o.user_id JOIN branches br ON br.id = o.branch_id
     ${w.sql} GROUP BY u.id ORDER BY revenue DESC`,
    w.params,
  );
  return { from, to, summary, daily, categories, topMedicines, payments, staff };
}

export function inventoryReport(branchId: number | null) {
  const rows = stockList(branchId);
  return {
    rows,
    summary: {
      items: rows.length,
      units: rows.reduce((s, r) => s + r.stock, 0),
      value: rows.reduce((s, r) => s + r.stock * r.purchase_price, 0),
      retail_value: rows.reduce((s, r) => s + r.stock * r.sale_price, 0),
      out: rows.filter((r) => r.status === 'out').length,
      low: rows.filter((r) => r.status === 'low').length,
    },
  };
}

// ---------------- CSV ----------------
function csvCell(v: unknown) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV có BOM UTF-8 để Excel mở đúng tiếng Việt. */
export function toCsv(header: string[], rows: unknown[][]) {
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}

const STATUS_LABEL = { ok: 'Đủ hàng', low: 'Sắp hết', out: 'Hết hàng' };

export function revenueCsv(r: ReturnType<typeof revenueReport>) {
  return toCsv(
    ['Ngày', 'Số đơn', 'Doanh thu (VND)', 'Giá vốn (VND)', 'Lợi nhuận gộp (VND)'],
    [...r.daily.map((d) => [d.date, d.orders, d.revenue, d.cost, d.profit]), ['TỔNG', r.summary.orders, r.summary.revenue, r.summary.cost, r.summary.profit]],
  );
}

export function inventoryCsv(r: ReturnType<typeof inventoryReport>) {
  return toCsv(
    ['Mã', 'Tên thuốc', 'Hoạt chất', 'Nhóm', 'Đơn vị', 'Giá nhập', 'Giá bán', 'Tồn kho', 'Tồn tối thiểu', 'Giá trị tồn (giá nhập)', 'Hạn gần nhất', 'Nhà cung cấp', 'Trạng thái'],
    r.rows.map((m) => [m.code, m.name, m.active_ingredient, m.category, m.unit, m.purchase_price, m.sale_price, m.stock, m.min_stock, m.stock * m.purchase_price, m.nearest_expiry ?? '', m.supplier ?? '', STATUS_LABEL[m.status]]),
  );
}

// ---------------- PDF ----------------
const vnd = (n: number) => n.toLocaleString('vi-VN') + ' đ';
const vnDate = (s: string) => s.split('-').reverse().join('/');
const PURPLE = '#6D4AFF';
const GRAY = '#6B7280';

interface Col { header: string; width: number; align?: 'left' | 'right' | 'center' }

function createDoc(title: string, subtitle: string) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true, info: { Title: title } });
  doc.registerFont('R', join(FONT_DIR, 'Roboto-Regular.ttf'));
  doc.registerFont('B', join(FONT_DIR, 'Roboto-Bold.ttf'));

  doc.rect(0, 0, doc.page.width, 6).fill(PURPLE);
  doc.font('B').fontSize(10).fillColor(PURPLE).text(PHARMACY_NAME.toUpperCase(), 40, 28);
  doc.font('B').fontSize(18).fillColor('#111827').text(title, 40, 44);
  doc.font('R').fontSize(9.5).fillColor(GRAY).text(subtitle, 40, 68);
  doc.moveDown(1.5);
  return doc;
}

function heading(doc: PDFKit.PDFDocument, text: string) {
  if (doc.y > doc.page.height - 120) doc.addPage();
  doc.moveDown(0.8).font('B').fontSize(11.5).fillColor('#111827').text(text, 40);
  doc.moveDown(0.4);
}

/** Vẽ bảng đơn giản, tự sang trang khi hết chỗ. */
function table(doc: PDFKit.PDFDocument, cols: Col[], rows: (string | number)[][], opts: { boldLast?: boolean } = {}) {
  const x0 = 40;
  const rowH = 18;
  const drawHeader = () => {
    let x = x0;
    doc.rect(x0, doc.y, cols.reduce((s, c) => s + c.width, 0), rowH).fill('#F3F0FF');
    const y = doc.y + 5;
    doc.font('B').fontSize(8.5).fillColor('#3B2A99');
    for (const c of cols) {
      doc.text(c.header, x + 4, y, { width: c.width - 8, align: c.align ?? 'left', lineBreak: false });
      x += c.width;
    }
    doc.y = y - 5 + rowH;
  };
  drawHeader();
  rows.forEach((r, i) => {
    if (doc.y + rowH > doc.page.height - 50) {
      doc.addPage();
      doc.y = 40;
      drawHeader();
    }
    const y = doc.y;
    if (i % 2 === 1) doc.rect(x0, y, cols.reduce((s, c) => s + c.width, 0), rowH).fill('#FAFAFC');
    const bold = opts.boldLast && i === rows.length - 1;
    doc.font(bold ? 'B' : 'R').fontSize(8.5).fillColor('#1F2937');
    let x = x0;
    cols.forEach((c, j) => {
      doc.text(String(r[j] ?? ''), x + 4, y + 5, { width: c.width - 8, align: c.align ?? 'left', lineBreak: false, ellipsis: true });
      x += c.width;
    });
    doc.y = y + rowH;
  });
  doc.x = x0;
}

function summaryBoxes(doc: PDFKit.PDFDocument, items: [string, string][]) {
  const w = (doc.page.width - 80 - (items.length - 1) * 8) / items.length;
  const y = doc.y;
  items.forEach(([label, value], i) => {
    const x = 40 + i * (w + 8);
    doc.roundedRect(x, y, w, 50, 6).lineWidth(0.8).strokeColor('#ECECF3').stroke();
    doc.font('R').fontSize(8).fillColor(GRAY).text(label, x + 10, y + 9, { width: w - 20 });
    doc.font('B').fontSize(12).fillColor('#111827').text(value, x + 10, y + 24, { width: w - 20 });
  });
  doc.y = y + 60;
  doc.x = 40;
}

function footer(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.font('R').fontSize(8).fillColor(GRAY).text(
      `Xuất lúc ${fmtDateTime(new Date())} · Trang ${i + 1}/${range.count}`,
      40, doc.page.height - 30, { width: doc.page.width - 80, align: 'right', lineBreak: false },
    );
  }
}

export function revenuePdf(r: ReturnType<typeof revenueReport>, branchName: string) {
  const doc = createDoc('Báo cáo doanh thu', `${branchName} · Từ ${vnDate(r.from)} đến ${vnDate(r.to)}`);
  const s = r.summary;
  summaryBoxes(doc, [
    ['Doanh thu', vnd(s.revenue)],
    ['Lợi nhuận gộp', vnd(s.profit)],
    ['Số đơn hàng', s.orders.toLocaleString('vi-VN')],
    ['Giá trị TB/đơn', vnd(s.avg_order)],
  ]);

  heading(doc, 'Doanh thu theo nhóm thuốc');
  table(doc, [{ header: 'Nhóm thuốc', width: 235 }, { header: 'Số lượng', width: 80, align: 'right' }, { header: 'Doanh thu', width: 120, align: 'right' }, { header: 'Tỷ trọng', width: 80, align: 'right' }],
    r.categories.map((c) => [c.name, c.quantity.toLocaleString('vi-VN'), vnd(c.revenue), `${((c.revenue / (s.revenue || 1)) * 100).toFixed(1)}%`]));

  heading(doc, 'Top 10 thuốc bán chạy');
  table(doc, [{ header: '#', width: 25 }, { header: 'Tên thuốc', width: 250 }, { header: 'Số lượng', width: 100, align: 'right' }, { header: 'Doanh thu', width: 140, align: 'right' }],
    r.topMedicines.map((m, i) => [i + 1, m.name, `${m.quantity.toLocaleString('vi-VN')} ${m.unit}`, vnd(m.revenue)]));

  heading(doc, 'Theo phương thức thanh toán');
  table(doc, [{ header: 'Phương thức', width: 235 }, { header: 'Số đơn', width: 140, align: 'right' }, { header: 'Doanh thu', width: 140, align: 'right' }],
    r.payments.map((p) => [p.label, p.orders.toLocaleString('vi-VN'), vnd(p.revenue)]));

  heading(doc, 'Doanh số theo nhân viên');
  table(doc, [{ header: 'Nhân viên', width: 185 }, { header: 'Chi nhánh', width: 110 }, { header: 'Số đơn', width: 80, align: 'right' }, { header: 'Doanh thu', width: 140, align: 'right' }],
    r.staff.map((st) => [st.name, st.branch, st.orders.toLocaleString('vi-VN'), vnd(st.revenue)]));

  heading(doc, 'Chi tiết theo ngày');
  table(doc, [{ header: 'Ngày', width: 95 }, { header: 'Số đơn', width: 70, align: 'right' }, { header: 'Doanh thu', width: 120, align: 'right' }, { header: 'Giá vốn', width: 115, align: 'right' }, { header: 'Lợi nhuận gộp', width: 115, align: 'right' }],
    [...r.daily.map((d) => [vnDate(d.date), d.orders, vnd(d.revenue), vnd(d.cost), vnd(d.profit)]), ['TỔNG', s.orders, vnd(s.revenue), vnd(s.cost), vnd(s.profit)]],
    { boldLast: true });

  footer(doc);
  doc.end();
  return doc;
}

export function inventoryPdf(r: ReturnType<typeof inventoryReport>, branchName: string) {
  const doc = createDoc('Báo cáo tồn kho', `${branchName} · Tại thời điểm ${fmtDateTime(new Date()).slice(0, 16)}`);
  const s = r.summary;
  summaryBoxes(doc, [
    ['Số mặt hàng', s.items.toLocaleString('vi-VN')],
    ['Tổng số lượng', s.units.toLocaleString('vi-VN')],
    ['Giá trị tồn (giá nhập)', vnd(s.value)],
    ['Hết / sắp hết hàng', `${s.out} / ${s.low}`],
  ]);
  heading(doc, 'Danh sách tồn kho');
  table(doc,
    [{ header: 'Mã', width: 42 }, { header: 'Tên thuốc', width: 146 }, { header: 'Nhóm', width: 88 }, { header: 'Tồn', width: 52, align: 'right' }, { header: 'Giá trị tồn', width: 80, align: 'right' }, { header: 'Hạn gần nhất', width: 57, align: 'center' }, { header: 'Trạng thái', width: 50 }],
    r.rows.map((m) => [m.code, m.name, m.category, `${m.stock} ${m.unit}`, vnd(m.stock * m.purchase_price), m.nearest_expiry ? vnDate(m.nearest_expiry) : '—', STATUS_LABEL[m.status]]),
  );
  footer(doc);
  doc.end();
  return doc;
}
