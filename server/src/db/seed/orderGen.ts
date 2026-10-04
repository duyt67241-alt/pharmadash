/**
 * Bộ sinh đơn hàng giả lập. Được dùng ở 3 nơi:
 *  - seed ban đầu (3 tháng dữ liệu)
 *  - backfill khi khởi động server (bù các ngày còn thiếu -> dữ liệu luôn "tươi")
 *  - chế độ demo (sinh đơn mới mỗi vài giây)
 */
import { all, run, db } from '../connection';
import { addDays, fmtDate, fmtDateTime, parseDate, startOfDay } from '../../lib/dates';
import type { Rng } from '../../lib/rng';

interface Med {
  id: number;
  category: string;
  sale_price: number;
  purchase_price: number;
  pop: number;
}
interface Batch {
  id: number;
  medicine_id: number;
  branch_id: number;
  received_at: string;
  quantity: number;
}

export interface GenContext {
  meds: Med[];
  customers: { id: number; weight: number; from: string; until: string }[];
  staffByBranch: Map<number, number[]>;
  shifts: Map<string, { user_id: number; shift: string }[]>; // key: date|branch
  batches: Map<string, Batch[]>; // key: medicine|branch, sắp xếp theo received_at
  branches: { id: number; base: number }[];
}

// Phân bố giờ mua hàng trong ngày (7h - 21h): cao điểm sáng sớm & chiều tối
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
const HOUR_W = [3, 6, 7, 6, 5, 3, 3, 4, 4, 5, 7, 8, 8, 6, 3];

/** Trọng số khách hàng suy ra từ id: một số khách mua rất thường xuyên. */
function customerWeight(id: number) {
  const h = (id * 2654435761) % 1000;
  return 0.15 + (h / 1000) ** 3 * 6;
}

/** Hệ số mùa vụ theo nhóm thuốc (tháng 9-12 và 1-3: cảm cúm tăng). */
function seasonFactor(category: string, date: Date) {
  const m = date.getMonth() + 1;
  if (category === 'Ho - Cảm cúm') return m >= 9 || m <= 3 ? 1.6 : 0.9;
  if (category === 'Tiêu hóa') return m >= 5 && m <= 8 ? 1.3 : 1;
  if (category === 'Dị ứng') return m >= 2 && m <= 4 ? 1.4 : 1;
  return 1;
}

export function loadContext(): GenContext {
  const meds = all<Med>(`
    SELECT m.id, c.name AS category, m.sale_price, m.purchase_price, m.min_stock AS pop
    FROM medicines m JOIN categories c ON c.id = m.category_id WHERE m.is_active = 1`);
  // min_stock được seed tỉ lệ với độ phổ biến nên dùng làm trọng số bán luôn
  // Mỗi khách chỉ mua trong 'vòng đời' từ lúc gia nhập đến khi rời bỏ (suy ra từ id)
  const customers = all<{ id: number; created_at: string }>('SELECT id, created_at FROM customers').map((c) => {
    const life = 45 + ((c.id * 40503) % 420);
    return {
      id: c.id,
      weight: customerWeight(c.id),
      from: c.created_at,
      until: fmtDateTime(addDays(parseDate(c.created_at), life)),
    };
  });
  const staffByBranch = new Map<number, number[]>();
  for (const u of all<{ id: number; branch_id: number }>(
    "SELECT id, branch_id FROM users WHERE role IN ('staff','manager') AND branch_id IS NOT NULL",
  )) {
    staffByBranch.set(u.branch_id, [...(staffByBranch.get(u.branch_id) ?? []), u.id]);
  }
  const shifts = new Map<string, { user_id: number; shift: string }[]>();
  for (const s of all<{ user_id: number; date: string; shift: string; branch_id: number }>(
    'SELECT s.user_id, s.date, s.shift, u.branch_id FROM shifts s JOIN users u ON u.id = s.user_id',
  )) {
    const k = `${s.date}|${s.branch_id}`;
    shifts.set(k, [...(shifts.get(k) ?? []), s]);
  }
  const batches = new Map<string, Batch[]>();
  for (const b of all<Batch>(
    'SELECT id, medicine_id, branch_id, received_at, quantity FROM batches ORDER BY received_at',
  )) {
    const k = `${b.medicine_id}|${b.branch_id}`;
    batches.set(k, [...(batches.get(k) ?? []), b]);
  }
  const branches = all<{ id: number }>('SELECT id FROM branches ORDER BY id').map((b, i) => ({
    id: b.id,
    base: i === 0 ? 48 : 36, // số đơn trung bình/ngày
  }));
  return { meds, customers, staffByBranch, shifts, batches, branches };
}

export class OrderGenerator {
  private seqByDay = new Map<string, number>();
  private eligible = { day: '', list: [] as GenContext['customers'], weights: [] as number[] };
  private insertOrder = db.prepare(`
    INSERT INTO orders (code, customer_id, user_id, branch_id, created_at, payment_method, subtotal, discount, total, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  private insertItem = db.prepare(`
    INSERT INTO order_items (order_id, medicine_id, batch_id, quantity, unit_price, unit_cost)
    VALUES (?, ?, ?, ?, ?, ?)`);
  private decBatch = db.prepare('UPDATE batches SET quantity = quantity - ? WHERE id = ? AND quantity >= ?');

  constructor(
    private rng: Rng,
    private ctx: GenContext,
    /** true: trừ tồn kho theo lô khi bán (demo/backfill). Seed thì gán tồn kho cuối cùng riêng. */
    private deductStock = false,
  ) {
    // Tiếp nối số thứ tự hóa đơn lớn nhất đã có của mọi ngày (mã HDyymmdd<chi nhánh><stt>).
    // Không giới hạn số ngày: máy có thể tắt nhiều ngày rồi backfill bắt đầu từ ngày đã có đơn.
    for (const r of all<{ d: string; b: number; n: number }>(
      'SELECT substr(created_at,1,10) d, branch_id b, MAX(CAST(substr(code,10) AS INTEGER)) n FROM orders GROUP BY d, b',
    )) {
      this.seqByDay.set(`${r.d}|${r.b}`, r.n);
    }
  }

  /** Sinh toàn bộ đơn của một ngày; nếu có `until` thì chỉ sinh các đơn trước thời điểm đó. */
  generateDay(day: Date, progress: number, until?: Date, after?: Date) {
    const weekend = day.getDay() === 0 || day.getDay() === 6 ? 1.15 : 1;
    for (const br of this.ctx.branches) {
      const n = Math.round(br.base * weekend * (0.9 + 0.2 * progress) * (0.85 + this.rng.next() * 0.3));
      const times: Date[] = [];
      for (let i = 0; i < n; i++) {
        const h = this.rng.weighted(HOURS, HOUR_W);
        const t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, this.rng.int(0, 59), this.rng.int(0, 59));
        if (until && t > until) continue;
        if (after && t <= after) continue;
        times.push(t);
      }
      times.sort((a, b) => a.getTime() - b.getTime());
      for (const t of times) this.createOrder(br.id, t, progress);
    }
  }

  /** Tạo 1 đơn hàng ngẫu nhiên tại chi nhánh `branchId` vào thời điểm `t`. */
  createOrder(branchId: number, t: Date, progress = 1) {
    const { rng, ctx } = this;
    const dateKey = fmtDate(t);
    const staffId = this.pickStaff(branchId, dateKey, t.getHours());

    // Chọn thuốc: trọng số = độ phổ biến x mùa vụ
    const nItems = rng.weighted([1, 2, 3, 4], [45, 30, 17, 8]);
    const weights = ctx.meds.map((m) => m.pop * seasonFactor(m.category, t));
    const chosen = new Map<number, Med>();
    for (let i = 0; i < nItems; i++) {
      const m = rng.weighted(ctx.meds, weights);
      chosen.set(m.id, m);
    }

    const lines = [...chosen.values()].map((m) => {
      const qty = m.sale_price < 20000 ? rng.int(1, 5) : rng.weighted([1, 2, 3], [70, 22, 8]);
      return { m, qty, batch: this.pickBatch(m.id, branchId, t, qty) };
    });
    const subtotal = lines.reduce((s, l) => s + l.qty * l.m.sale_price, 0);

    const isMember = rng.chance(0.58);
    const pool = this.customersOn(dateKey);
    const customerId = isMember && pool.list.length ? rng.weighted(pool.list, pool.weights).id : null;
    const discount = customerId && subtotal >= 500000 ? Math.round((subtotal * 0.05) / 1000) * 1000 : 0;
    // Xu hướng: chuyển khoản/ví điện tử tăng dần theo thời gian
    const payment = rng.weighted(
      ['cash', 'transfer', 'ewallet', 'card'] as const,
      [48 - 10 * progress, 27 + 8 * progress, 14 + 2 * progress, 11],
    );
    const status = rng.chance(0.008) ? 'refunded' : 'completed';

    const seqKey = `${dateKey}|${branchId}`;
    const seq = (this.seqByDay.get(seqKey) ?? 0) + 1;
    this.seqByDay.set(seqKey, seq);
    const code = `HD${dateKey.slice(2).replace(/-/g, '')}${branchId}${String(seq).padStart(3, '0')}`;

    const res = this.insertOrder.run(
      code, customerId, staffId, branchId, fmtDateTime(t), payment, subtotal, discount, subtotal - discount, status,
    );
    const orderId = Number(res.lastInsertRowid);
    for (const l of lines) {
      this.insertItem.run(orderId, l.m.id, l.batch?.id ?? null, l.qty, l.m.sale_price, l.m.purchase_price);
    }
    return orderId;
  }

  /** Khách còn 'hoạt động' trong ngày (cache theo ngày). */
  private customersOn(dateKey: string) {
    if (this.eligible.day !== dateKey) {
      const ts = `${dateKey} 23:59:59`;
      const start = `${dateKey} 00:00:00`;
      const list = this.ctx.customers.filter((c) => c.from <= ts && c.until >= start);
      this.eligible = { day: dateKey, list, weights: list.map((c) => c.weight) };
    }
    return this.eligible;
  }

  private pickStaff(branchId: number, dateKey: string, hour: number) {
    const onShift = (this.ctx.shifts.get(`${dateKey}|${branchId}`) ?? []).filter((s) =>
      hour < 14 ? s.shift === 'morning' : s.shift === 'afternoon',
    );
    if (onShift.length) return this.rng.pick(onShift).user_id;
    return this.rng.pick(this.ctx.staffByBranch.get(branchId) ?? [1]);
  }

  /** Lấy lô nhập gần nhất trước thời điểm bán (còn hàng nếu đang trừ kho). */
  private pickBatch(medId: number, branchId: number, t: Date, qty: number) {
    const list = this.ctx.batches.get(`${medId}|${branchId}`) ?? [];
    const ts = fmtDateTime(t);
    const eligible = list.filter((b) => b.received_at <= ts);
    if (!eligible.length) return undefined;
    if (this.deductStock) {
      // FEFO đơn giản: lô cũ nhất còn đủ hàng
      const b = eligible.find((x) => x.quantity >= qty);
      if (!b) return eligible[eligible.length - 1];
      const r = this.decBatch.run(qty, b.id, qty);
      if (r.changes) b.quantity -= qty;
      return b;
    }
    return eligible[eligible.length - 1];
  }
}

/** Sinh ca làm việc cho các ngày trong [from, to] chưa có ca. */
export function generateShifts(from: Date, to: Date) {
  const users = all<{ id: number; branch_id: number; role: string }>(
    "SELECT id, branch_id, role FROM users WHERE role IN ('staff','manager') AND branch_id IS NOT NULL ORDER BY id",
  );
  const existing = new Set(all<{ date: string }>('SELECT DISTINCT date FROM shifts').map((r) => r.date));
  const ins = db.prepare('INSERT INTO shifts (user_id, date, shift, start_time, end_time) VALUES (?, ?, ?, ?, ?)');
  for (let d = startOfDay(from); d <= to; d = addDays(d, 1)) {
    const key = fmtDate(d);
    if (existing.has(key)) continue;
    const week = Math.floor(d.getTime() / (7 * 86_400_000));
    users.forEach((u, i) => {
      // Quản lý làm giờ hành chính (ca sáng) từ T2-T6
      if (u.role === 'manager') {
        if (d.getDay() >= 1 && d.getDay() <= 5) ins.run(u.id, key, 'morning', '08:00', '17:00');
        return;
      }
      if (d.getDay() === i % 7) return; // mỗi nhân viên nghỉ 1 ngày/tuần
      const morning = (i + week) % 2 === 0;
      ins.run(u.id, key, morning ? 'morning' : 'afternoon', morning ? '07:00' : '14:00', morning ? '14:00' : '22:00');
    });
  }
}

/** Cập nhật điểm & hạng khách hàng từ lịch sử mua (1 điểm / 10.000đ). */
export function recomputeCustomerStats() {
  run(`
    UPDATE customers SET
      points = COALESCE((SELECT SUM(total) / 10000 FROM orders o WHERE o.customer_id = customers.id AND o.status = 'completed'), 0),
      tier = CASE
        WHEN COALESCE((SELECT SUM(total) FROM orders o WHERE o.customer_id = customers.id AND o.status = 'completed'), 0) >= 8000000 THEN 'Vàng'
        WHEN COALESCE((SELECT SUM(total) FROM orders o WHERE o.customer_id = customers.id AND o.status = 'completed'), 0) >= 3000000 THEN 'Bạc'
        ELSE 'Thường' END`);
  // Ngày tạo khách không được sau đơn đầu tiên
  run(`
    UPDATE customers SET created_at = (SELECT MIN(created_at) FROM orders o WHERE o.customer_id = customers.id)
    WHERE created_at > (SELECT MIN(created_at) FROM orders o WHERE o.customer_id = customers.id)`);
}
