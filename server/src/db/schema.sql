-- ============================================================
-- Schema CSDL Dashboard nhà thuốc (SQLite)
-- Tiền tệ lưu dạng số nguyên (VND). Ngày giờ lưu dạng chuỗi
-- giờ địa phương 'YYYY-MM-DD HH:MM:SS' để so sánh chuỗi được.
-- ============================================================
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS branches (
  id        INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  address   TEXT,
  capacity  INTEGER NOT NULL DEFAULT 20000   -- sức chứa kho (đơn vị sản phẩm)
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('owner','manager','staff')),
  branch_id     INTEGER REFERENCES branches(id),   -- NULL = chủ nhà thuốc (mọi chi nhánh)
  phone         TEXT,
  hired_at      TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS suppliers (
  id        INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  phone     TEXT,
  email     TEXT,
  address   TEXT,
  tax_code  TEXT
);

CREATE TABLE IF NOT EXISTS medicines (
  id                INTEGER PRIMARY KEY,
  code              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  active_ingredient TEXT,
  category_id       INTEGER NOT NULL REFERENCES categories(id),
  supplier_id       INTEGER REFERENCES suppliers(id),
  unit              TEXT NOT NULL,
  purchase_price    INTEGER NOT NULL,
  sale_price        INTEGER NOT NULL,
  min_stock         INTEGER NOT NULL DEFAULT 20,
  requires_rx       INTEGER NOT NULL DEFAULT 0,
  is_active         INTEGER NOT NULL DEFAULT 1
);

-- Tồn kho quản lý theo lô: mỗi lô có hạn dùng riêng
CREATE TABLE IF NOT EXISTS batches (
  id                INTEGER PRIMARY KEY,
  medicine_id       INTEGER NOT NULL REFERENCES medicines(id),
  branch_id         INTEGER NOT NULL REFERENCES branches(id),
  batch_no          TEXT NOT NULL,
  quantity          INTEGER NOT NULL DEFAULT 0,
  expiry_date       TEXT NOT NULL,
  received_at       TEXT NOT NULL,
  purchase_item_id  INTEGER REFERENCES purchase_items(id)
);

CREATE TABLE IF NOT EXISTS customers (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  phone       TEXT UNIQUE,
  gender      TEXT,
  birth_year  INTEGER,
  points      INTEGER NOT NULL DEFAULT 0,
  tier        TEXT NOT NULL DEFAULT 'Thường',  -- Thường | Bạc | Vàng
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id              INTEGER PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,
  customer_id     INTEGER REFERENCES customers(id),   -- NULL = khách lẻ
  user_id         INTEGER NOT NULL REFERENCES users(id),
  branch_id       INTEGER NOT NULL REFERENCES branches(id),
  created_at      TEXT NOT NULL,
  payment_method  TEXT NOT NULL CHECK (payment_method IN ('cash','card','transfer','ewallet')),
  subtotal        INTEGER NOT NULL,
  discount        INTEGER NOT NULL DEFAULT 0,
  total           INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','refunded'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id          INTEGER PRIMARY KEY,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  medicine_id INTEGER NOT NULL REFERENCES medicines(id),
  batch_id    INTEGER REFERENCES batches(id),
  quantity    INTEGER NOT NULL,
  unit_price  INTEGER NOT NULL,
  unit_cost   INTEGER NOT NULL      -- giá vốn tại thời điểm bán, dùng tính lợi nhuận
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id             INTEGER PRIMARY KEY,
  code           TEXT NOT NULL UNIQUE,
  supplier_id    INTEGER NOT NULL REFERENCES suppliers(id),
  user_id        INTEGER NOT NULL REFERENCES users(id),
  branch_id      INTEGER NOT NULL REFERENCES branches(id),
  created_at     TEXT NOT NULL,
  expected_date  TEXT NOT NULL,
  received_at    TEXT,
  status         TEXT NOT NULL DEFAULT 'ordered' CHECK (status IN ('draft','ordered','received','cancelled')),
  total          INTEGER NOT NULL DEFAULT 0,
  note           TEXT
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id                 INTEGER PRIMARY KEY,
  purchase_order_id  INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  medicine_id        INTEGER NOT NULL REFERENCES medicines(id),
  quantity           INTEGER NOT NULL,
  unit_cost          INTEGER NOT NULL,
  batch_no           TEXT,
  expiry_date        TEXT
);

CREATE TABLE IF NOT EXISTS shifts (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  date        TEXT NOT NULL,
  shift       TEXT NOT NULL CHECK (shift IN ('morning','afternoon')),
  start_time  TEXT NOT NULL,
  end_time    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY,
  branch_id  INTEGER REFERENCES branches(id),   -- NULL = toàn hệ thống
  title      TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'meeting',
  location   TEXT,
  start_at   TEXT NOT NULL,
  end_at     TEXT NOT NULL
);

-- Chỉ mục cho các truy vấn thống kê thường dùng
CREATE INDEX IF NOT EXISTS idx_orders_created   ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_branch    ON orders(branch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_customer  ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_user      ON orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_items_order      ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_items_medicine   ON order_items(medicine_id);
CREATE INDEX IF NOT EXISTS idx_batches_medicine ON batches(medicine_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry   ON batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_shifts_date      ON shifts(date);
