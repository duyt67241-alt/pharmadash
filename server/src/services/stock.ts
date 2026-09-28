/**
 * Các truy vấn tồn kho dùng chung (sidebar, cảnh báo, báo cáo).
 */
import { all, get } from '../db/connection';
import { addDays, fmtDate } from '../lib/dates';
import { Where } from '../lib/query';

export interface StockRow {
  id: number;
  code: string;
  name: string;
  active_ingredient: string;
  category_id: number;
  category: string;
  supplier_id: number | null;
  supplier: string | null;
  unit: string;
  purchase_price: number;
  sale_price: number;
  min_stock: number;
  min_stock_branch: number;
  requires_rx: number;
  stock: number;
  nearest_expiry: string | null;
  status: 'out' | 'low' | 'ok';
}

/** Danh sách thuốc kèm tồn kho (tổng các lô còn hàng, chưa hết hạn không bắt buộc) trong phạm vi chi nhánh. */
export function stockList(branchId: number | null): StockRow[] {
  const bw = new Where();
  bw.addIf(branchId, 'b.branch_id = ?', branchId);
  // min_stock định nghĩa theo 1 chi nhánh -> khi xem tất cả chi nhánh thì nhân số chi nhánh
  const nBranches = branchId ? 1 : get<{ n: number }>('SELECT COUNT(*) n FROM branches')!.n;
  const rows = all<Omit<StockRow, 'status'>>(
    `SELECT m.id, m.code, m.name, m.active_ingredient, m.category_id, c.name AS category,
            m.supplier_id, s.name AS supplier, m.unit, m.purchase_price, m.sale_price,
            m.min_stock * ? AS min_stock, m.min_stock AS min_stock_branch, m.requires_rx,
            COALESCE(st.stock, 0) AS stock, st.nearest_expiry
     FROM medicines m
     JOIN categories c ON c.id = m.category_id
     LEFT JOIN suppliers s ON s.id = m.supplier_id
     LEFT JOIN (
       SELECT b.medicine_id, SUM(b.quantity) AS stock,
              MIN(CASE WHEN b.quantity > 0 THEN b.expiry_date END) AS nearest_expiry
       FROM batches b ${bw.sql}
       GROUP BY b.medicine_id
     ) st ON st.medicine_id = m.id
     WHERE m.is_active = 1
     ORDER BY m.name`,
    [nBranches, ...bw.params],
  );
  return rows.map((r) => ({ ...r, status: r.stock <= 0 ? 'out' : r.stock < r.min_stock ? 'low' : 'ok' }));
}

export interface ExpiringRow {
  batch_id: number;
  batch_no: string;
  medicine_id: number;
  code: string;
  name: string;
  unit: string;
  branch_id: number;
  branch: string;
  quantity: number;
  expiry_date: string;
  days_left: number;
  value: number;
}

/** Các lô còn hàng sẽ hết hạn trong `days` ngày tới (kể cả đã hết hạn). */
export function expiringBatches(branchId: number | null, days: number): ExpiringRow[] {
  const w = new Where().add('b.quantity > 0').add('b.expiry_date <= ?', fmtDate(addDays(new Date(), days)));
  w.addIf(branchId, 'b.branch_id = ?', branchId);
  return all<ExpiringRow>(
    `SELECT b.id AS batch_id, b.batch_no, m.id AS medicine_id, m.code, m.name, m.unit,
            b.branch_id, br.name AS branch, b.quantity, b.expiry_date,
            CAST(julianday(b.expiry_date) - julianday(date('now','localtime')) AS INTEGER) AS days_left,
            b.quantity * m.purchase_price AS value
     FROM batches b
     JOIN medicines m ON m.id = b.medicine_id
     JOIN branches br ON br.id = b.branch_id
     ${w.sql}
     ORDER BY b.expiry_date`,
    w.params,
  );
}

/** Thuốc dưới mức tồn tối thiểu (tính theo từng chi nhánh). */
export function lowStock(branchId: number | null) {
  const w = new Where().add('m.is_active = 1');
  w.addIf(branchId, 'br.id = ?', branchId);
  return all<{
    medicine_id: number; code: string; name: string; unit: string; branch_id: number;
    branch: string; stock: number; min_stock: number;
  }>(
    `SELECT m.id AS medicine_id, m.code, m.name, m.unit, br.id AS branch_id, br.name AS branch,
            COALESCE((SELECT SUM(quantity) FROM batches b WHERE b.medicine_id = m.id AND b.branch_id = br.id), 0) AS stock,
            m.min_stock
     FROM medicines m CROSS JOIN branches br
     ${w.sql}
     GROUP BY m.id, br.id
     HAVING stock < m.min_stock
     ORDER BY stock * 1.0 / m.min_stock, m.name`,
    w.params,
  );
}
