/**
 * Seed toàn bộ CSDL với dữ liệu giả lập ~3 tháng, tính lùi từ thời điểm chạy.
 */
import bcrypt from 'bcryptjs';
import { db, get, migrate, transaction } from '../connection';
import { createRng } from '../../lib/rng';
import { addDays, addMonths, fmtDate, fmtDateTime, parseDate, startOfDay } from '../../lib/dates';
import {
  BRANCHES, CATEGORIES, DEMO_PASSWORD, DEMO_USERS, FIRST_FEMALE, FIRST_MALE, LAST_NAMES,
  MEDICINES, MIDDLE_FEMALE, MIDDLE_MALE, SUPPLIERS,
} from './data';
import { OrderGenerator, generateShifts, loadContext, recomputeCustomerStats } from './orderGen';

const TABLES = [
  'order_items', 'orders', 'batches', 'purchase_items', 'purchase_orders',
  'shifts', 'events', 'customers', 'medicines', 'suppliers', 'categories', 'users', 'branches',
];

/** Số ngày lịch sử bán hàng (mặc định 12 tháng để các tab 6 tháng / 1 năm có dữ liệu; đặt SEED_MONTHS=3 nếu muốn ít hơn). */
export const HISTORY_DAYS = Math.round(Number(process.env.SEED_MONTHS ?? 12) * 30.4);

export function seed(now = new Date()) {
  const rng = createRng(20250928);
  const t0 = Date.now();

  db.exec('PRAGMA foreign_keys = OFF');
  for (const t of TABLES) db.exec(`DROP TABLE IF EXISTS ${t}`);
  db.exec('PRAGMA foreign_keys = ON');
  migrate();

  const today = startOfDay(now);
  const start = addDays(today, -(HISTORY_DAYS - 1));

  transaction(() => {
    // ---------- Danh mục cơ bản ----------
    const insBranch = db.prepare('INSERT INTO branches (name, address, capacity) VALUES (?, ?, ?)');
    BRANCHES.forEach((b) => insBranch.run(b.name, b.address, b.capacity));

    const insCat = db.prepare('INSERT INTO categories (name) VALUES (?)');
    CATEGORIES.forEach((c) => insCat.run(c));

    const insSup = db.prepare('INSERT INTO suppliers (name, phone, email, address, tax_code) VALUES (?, ?, ?, ?, ?)');
    SUPPLIERS.forEach((s, i) =>
      insSup.run(s.name, s.phone, `kinhdoanh${i + 1}@ncc-demo.vn`, s.address, `01${String(rng.int(10000000, 99999999))}`),
    );

    // Nhà cung cấp chính theo nhóm thuốc
    const supplierFor = (catIdx: number) => {
      if (CATEGORIES[catIdx] === 'Dụng cụ y tế') return 5;
      if (CATEGORIES[catIdx] === 'Thực phẩm chức năng') return 6;
      return [1, 2, 3, 4, 7, 8][catIdx % 6];
    };

    const insMed = db.prepare(`
      INSERT INTO medicines (code, name, active_ingredient, category_id, supplier_id, unit, purchase_price, sale_price, min_stock, requires_rx)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    let medNo = 0;
    CATEGORIES.forEach((cat, ci) => {
      for (const [name, ingredient, unit, price, rx, pop] of MEDICINES[cat]) {
        medNo++;
        const cost = Math.round((price * (0.62 + rng.next() * 0.16)) / 100) * 100;
        insMed.run(`T${String(medNo).padStart(4, '0')}`, name, ingredient, ci + 1, supplierFor(ci), unit, cost, price, pop * 6 + 4, rx ? 1 : 0);
      }
    });

    // ---------- Người dùng ----------
    const hash = bcrypt.hashSync(DEMO_PASSWORD, 8);
    const insUser = db.prepare(
      'INSERT INTO users (full_name, email, password_hash, role, branch_id, phone, hired_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    DEMO_USERS.forEach((u) =>
      insUser.run(
        u.full_name, u.email, hash, u.role, u.branch === null ? null : u.branch + 1,
        `09${rng.int(10000000, 99999999)}`, fmtDate(addDays(today, -rng.int(200, 1500))),
      ),
    );

    // ---------- Khách hàng ----------
    const insCus = db.prepare(
      'INSERT INTO customers (name, phone, gender, birth_year, created_at) VALUES (?, ?, ?, ?, ?)',
    );
    const phones = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      const female = rng.chance(0.58);
      const name = `${rng.pick(LAST_NAMES)} ${rng.pick(female ? MIDDLE_FEMALE : MIDDLE_MALE)} ${rng.pick(female ? FIRST_FEMALE : FIRST_MALE)}`;
      let phone: string;
      do phone = `${rng.pick(['09', '03', '08', '07'])}${rng.int(10000000, 99999999)}`;
      while (phones.has(phone));
      phones.add(phone);
      // 25% là khách cũ (tạo trước kỳ dữ liệu), 75% khách mới gia nhập dần trong kỳ
      const created = rng.chance(0.25) ? addDays(start, -rng.int(10, 400)) : addDays(start, rng.int(0, HISTORY_DAYS - 1));
      insCus.run(name, phone, female ? 'Nữ' : 'Nam', rng.int(1950, 2005), fmtDateTime(created));
    }

    // ---------- Ca làm việc (từ đầu kỳ đến 2 tuần tới) ----------
    generateShifts(start, addDays(today, 14));

    // ---------- Lô tồn kho đầu kỳ + phiếu nhập lịch sử ----------
    const meds = db.prepare('SELECT id, supplier_id, purchase_price, min_stock FROM medicines').all() as {
      id: number; supplier_id: number; purchase_price: number; min_stock: number;
    }[];
    const insBatch = db.prepare(
      'INSERT INTO batches (medicine_id, branch_id, batch_no, quantity, expiry_date, received_at, purchase_item_id) VALUES (?, ?, ?, 0, ?, ?, ?)',
    );
    const batchNo = () => `L${rng.int(10, 99)}${String.fromCharCode(65 + rng.int(0, 25))}${rng.int(1000, 9999)}`;
    const branchIds = BRANCHES.map((_, i) => i + 1);

    for (const m of meds) {
      for (const b of branchIds) {
        const received = addDays(start, -rng.int(20, 120));
        insBatch.run(m.id, b, batchNo(), fmtDate(addMonths(received, rng.int(10, 36))), fmtDateTime(received), null);
      }
    }

    const insPO = db.prepare(`
      INSERT INTO purchase_orders (code, supplier_id, user_id, branch_id, created_at, expected_date, received_at, status, total, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insPI = db.prepare(
      'INSERT INTO purchase_items (purchase_order_id, medicine_id, quantity, unit_cost, batch_no, expiry_date) VALUES (?, ?, ?, ?, ?, ?)',
    );
    let poSeq = 0;
    const createPO = (branch: number, supplier: number, created: Date, expected: Date, status: string) => {
      poSeq++;
      created = new Date(created);
      created.setHours(rng.int(8, 17), rng.int(0, 59));
      const pool = meds.filter((m) => m.supplier_id === supplier);
      const items = (pool.length >= 4 ? pool : meds).slice().sort(() => rng.next() - 0.5).slice(0, rng.int(4, 10));
      const managerId = branch === 1 ? 2 : 3;
      const code = `PN${fmtDate(created).slice(2).replace(/-/g, '')}${String(poSeq).padStart(3, '0')}`;
      const r = insPO.run(
        code, supplier, managerId, branch, fmtDateTime(created), fmtDate(expected),
        status === 'received' ? fmtDateTime(expected) : null, status, 0,
        status === 'draft' ? 'Chờ duyệt số lượng' : null,
      );
      const poId = Number(r.lastInsertRowid);
      let total = 0;
      for (const m of items) {
        const qty = Math.max(10, Math.round((m.min_stock * rng.int(15, 40)) / 10 / 10) * 10);
        const no = batchNo();
        const exp = fmtDate(addMonths(expected, rng.int(8, 30)));
        const pi = insPI.run(poId, m.id, qty, m.purchase_price, no, exp);
        total += qty * m.purchase_price;
        if (status === 'received') {
          const receivedAt = new Date(expected);
          receivedAt.setHours(rng.int(8, 11), rng.int(0, 59));
          insBatch.run(m.id, branch, no, exp, fmtDateTime(receivedAt), Number(pi.lastInsertRowid));
        }
      }
      db.prepare('UPDATE purchase_orders SET total = ? WHERE id = ?').run(total, poId);
    };

    // Lịch sử: mỗi chi nhánh nhập hàng khoảng 4 ngày/lần, luân phiên nhà cung cấp
    for (const b of branchIds) {
      let sup = b;
      for (let d = addDays(start, rng.int(0, 3)); d < today; d = addDays(d, rng.int(3, 5))) {
        const expected = addDays(d, rng.int(1, 3));
        if (expected >= today) break;
        createPO(b, (sup++ % SUPPLIERS.length) + 1, d, expected, 'received');
      }
      // Sắp tới: phiếu đã đặt đang chờ giao (1 phiếu giao hôm nay để lịch có sự kiện)
      createPO(b, ((sup + 1) % SUPPLIERS.length) + 1, addDays(today, -2), today, 'ordered');
      createPO(b, ((sup + 2) % SUPPLIERS.length) + 1, addDays(today, -1), addDays(today, rng.int(2, 4)), 'ordered');
      createPO(b, ((sup + 3) % SUPPLIERS.length) + 1, today, addDays(today, rng.int(6, 10)), 'draft');
    }

    // ---------- Sự kiện lịch ----------
    const insEv = db.prepare('INSERT INTO events (branch_id, title, type, location, start_at, end_at) VALUES (?, ?, ?, ?, ?, ?)');
    const at = (d: Date, hm: string) => `${fmtDate(d)} ${hm}:00`;
    for (let d = start; d <= addDays(today, 40); d = addDays(d, 1)) {
      if (d.getDay() === 1) insEv.run(null, 'Họp giao ban đầu tuần', 'meeting', 'Google Meet', at(d, '08:00'), at(d, '08:30'));
      const next = addDays(d, 7);
      if (d.getDay() === 6 && next.getMonth() !== d.getMonth()) {
        for (const b of branchIds) insEv.run(b, 'Kiểm kê kho cuối tháng', 'inventory', 'Tại cửa hàng', at(d, '18:00'), at(d, '21:00'));
      }
    }
    insEv.run(null, 'Gặp trình dược viên - thuốc cảm cúm mùa thu', 'meeting', 'CN Cầu Giấy', at(today, '10:00'), at(today, '10:45'));
    insEv.run(1, 'Đào tạo tư vấn thuốc không kê đơn', 'training', 'Zalo Meeting', at(today, '15:00'), at(today, '16:00'));
    insEv.run(2, 'Kiểm tra định kỳ GPP', 'inspection', 'CN Đống Đa', at(addDays(today, 3), '09:00'), at(addDays(today, 3), '11:00'));
    insEv.run(null, 'Đào tạo phần mềm mới cho nhân viên', 'training', 'Google Meet', at(addDays(today, 1), '14:00'), at(addDays(today, 1), '15:00'));
  });

  // ---------- Đơn hàng 3 tháng ----------
  const ctx = loadContext();
  const gen = new OrderGenerator(rng, ctx, false);
  transaction(() => {
    for (let d = start, i = 0; d <= today; d = addDays(d, 1), i++) {
      gen.generateDay(d, i / HISTORY_DAYS, d.getTime() === today.getTime() ? now : undefined);
    }
  });

  // ---------- Gán tồn kho hiện tại theo lô ----------
  transaction(() => {
    const setQty = db.prepare('UPDATE batches SET quantity = ?, expiry_date = COALESCE(?, expiry_date) WHERE id = ?');
    const medRows = db.prepare('SELECT id, min_stock FROM medicines').all() as { id: number; min_stock: number }[];
    for (const m of medRows) {
      for (const b of [1, 2]) {
        const list = db
          .prepare('SELECT id, received_at FROM batches WHERE medicine_id = ? AND branch_id = ? ORDER BY received_at DESC')
          .all(m.id, b) as { id: number; received_at: string }[];
        const roll = rng.next();
        // ~6% hết hàng, ~10% dưới mức tối thiểu, còn lại đủ hàng
        const target =
          roll < 0.06 ? 0 : roll < 0.16 ? rng.int(1, m.min_stock - 1) : Math.round(m.min_stock * (1.2 + rng.next() * 3));
        const first = Math.round(target * 0.7);
        // Lô còn hàng phải còn hạn ít nhất ~5 tháng (trừ các lô được chọn làm cảnh báo bên dưới)
        const safeExpiry = () => fmtDate(addDays(today, rng.int(150, 720)));
        list.forEach((bt, i) => {
          const q = i === 0 ? first : i === 1 ? target - first : 0;
          const exp = (db.prepare('SELECT expiry_date FROM batches WHERE id = ?').get(bt.id) as { expiry_date: string }).expiry_date;
          setQty.run(q, q > 0 && exp < fmtDate(addDays(today, 150)) ? safeExpiry() : null, bt.id);
        });
        // Một số lô đầu kỳ còn tồn và sắp hết hạn (hoặc đã hết hạn) -> tạo cảnh báo
        const oldest = list[list.length - 1];
        const r2 = rng.next();
        if (list.length > 1 && target > 0 && r2 < 0.14) {
          const daysLeft = r2 < 0.015 ? -rng.int(1, 10) : rng.int(3, 90);
          setQty.run(rng.int(4, 30), fmtDate(addDays(today, daysLeft)), oldest.id);
        }
      }
    }
  });

  recomputeCustomerStats();

  const n = get<{ o: number; i: number }>('SELECT (SELECT COUNT(*) FROM orders) o, (SELECT COUNT(*) FROM order_items) i')!;
  console.log(`✔ Seed xong: ${n.o} đơn hàng, ${n.i} dòng sản phẩm (${Date.now() - t0}ms)`);
}

/**
 * Bù dữ liệu bán hàng từ đơn cuối cùng đến hiện tại, để khi mở app
 * vào ngày khác thì "hôm nay/tuần này" vẫn có số liệu.
 */
export function backfill(now = new Date()) {
  const last = get<{ t: string | null }>('SELECT MAX(created_at) t FROM orders')?.t;
  if (!last) return;
  const lastDate = parseDate(last);
  if (now.getTime() - lastDate.getTime() < 10 * 60_000) return;

  generateShifts(startOfDay(lastDate), addDays(startOfDay(now), 14));
  const gen = new OrderGenerator(createRng(Date.now() & 0xffffffff), loadContext(), true);
  let count = 0;
  transaction(() => {
    const before = get<{ n: number }>('SELECT COUNT(*) n FROM orders')!.n;
    for (let d = startOfDay(lastDate); d <= now; d = addDays(d, 1)) {
      gen.generateDay(d, 1, now, lastDate);
    }
    count = get<{ n: number }>('SELECT COUNT(*) n FROM orders')!.n - before;
  });
  recomputeCustomerStats();
  if (count) console.log(`↻ Đã bù ${count} đơn hàng từ ${last} đến nay`);
}
