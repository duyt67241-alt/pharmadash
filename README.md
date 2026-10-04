# PharmaDash – Dashboard điều hành nhà thuốc

Đồ án môn **Quản lý dự án Công nghệ thông tin**. Web app giúp chủ / quản lý nhà thuốc theo dõi hoạt động kinh doanh theo thời gian thực: doanh thu, đơn hàng, tồn kho theo lô, hạn dùng, nhập hàng, khách hàng và nhân viên. Toàn bộ dữ liệu là **dữ liệu giả lập** (nhà thuốc "Hữu Duyên" với 2 chi nhánh là hư cấu).

## Chạy nhanh

Yêu cầu: **Node.js ≥ 22.13** (khuyến nghị Node 24). Không cần cài database, vì dự án dùng SQLite tích hợp sẵn trong Node (`node:sqlite`).

```bash
npm install     # cài thư viện cho cả server và client
npm run dev     # chạy API (cổng 4000) + giao diện (cổng 5173)
```

Mở **http://localhost:5173**. Lần chạy đầu, server tự tạo CSDL và sinh dữ liệu mẫu (khoảng 2 giây).

| Vai trò | Email | Mật khẩu | Quyền |
|---|---|---|---|
| Chủ nhà thuốc | `chu@huuduyen.vn` | `123456` | Mọi chi nhánh, lợi nhuận, báo cáo |
| Quản lý | `quanly@huuduyen.vn` | `123456` | Toàn quyền tại CN Cầu Giấy |
| Nhân viên bán hàng | `nhanvien@huuduyen.vn` | `123456` | Chỉ doanh số của mình, không thấy giá nhập |

### Lệnh khác

| Lệnh | Tác dụng |
|---|---|
| `npm run seed` | Xóa và tạo lại toàn bộ dữ liệu mẫu (nên tắt `npm run dev` trước) |
| `npm run typecheck` | Kiểm tra kiểu TypeScript cho cả 2 phía |
| `npm run build` rồi `npm start -w server` | Chạy bản production tại http://localhost:4000 |

Biến môi trường (không bắt buộc): `PORT`, `JWT_SECRET`, `SEED_MONTHS` (mặc định 12), `DEMO_MODE=1` (bật sẵn chế độ demo), `DEMO_INTERVAL_MS`.

## Tính năng

- **Tổng quan**: 4 thẻ KPI (so sánh hôm nay / 7 ngày / 30 ngày với kỳ trước), biểu đồ doanh thu (1N · 1T · 1Th · 6Th · 1Năm · Tất cả, có dạng bảng và xuất CSV), lịch làm việc (họp, lịch nhập hàng, hạn thuốc, ca làm), top thuốc bán chạy, cảnh báo tồn kho, doanh thu theo nhóm, tỷ lệ khách quay lại. Tự làm mới mỗi 30 giây.
- **Đơn hàng**: lọc theo ngày, nhân viên, phương thức thanh toán, loại khách, trạng thái; xem chi tiết từng đơn.
- **Kho thuốc**: 101 loại thuốc, tồn kho **theo lô**, cảnh báo hết hạn 30/60/90 ngày và dưới mức tồn tối thiểu; thêm/sửa/ngừng kinh doanh; nhập danh mục từ CSV.
- **Nhập hàng**: phiếu nhập theo luồng Nháp → Đã đặt → Nhận hàng (tự tạo lô tồn kho); quản lý nhà cung cấp.
- **Khách hàng**: hạng thành viên (Vàng/Bạc/Thường), lịch sử mua, thuốc hay mua.
- **Nhân viên**: xếp hạng doanh số, lịch ca theo tuần.
- **Báo cáo**: xem trước và xuất **CSV** (mở được bằng Excel) / **PDF** (đúng tiếng Việt) cho doanh thu và tồn kho.
- **Phân quyền** 3 vai trò, kiểm tra ở cả server lẫn giao diện.
- Giao diện **sáng/tối**, responsive (desktop, tablet tự thu sidebar thành icon, mobile), tìm kiếm toàn cục **Ctrl+K** không phân biệt dấu.
- **Chế độ demo** (Cài đặt hoặc menu "Nhập dữ liệu"): server tự sinh đơn mới mỗi 15 giây để số liệu thay đổi trực tiếp khi thuyết trình.

## Công nghệ

| Tầng | Công nghệ |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS 3 (design token trong `client/tailwind.config.ts` + `client/src/index.css`), Recharts, lucide-react, TanStack Query, React Router |
| Backend | Node.js, Express, TypeScript (chạy bằng `tsx`), JWT, bcryptjs, zod, pdfkit |
| CSDL | SQLite (`node:sqlite` tích hợp sẵn trong Node) |

## Cấu trúc thư mục

```
├─ server/
│  ├─ src/
│  │  ├─ index.ts            # khởi động, tự seed / bù dữ liệu
│  │  ├─ db/                 # schema.sql, kết nối, seed (dữ liệu thuốc VN, bộ sinh đơn hàng)
│  │  ├─ middleware/auth.ts  # JWT, phân quyền, phạm vi chi nhánh
│  │  ├─ routes/             # auth, meta, dashboard, medicines, orders, purchases, staff, reports
│  │  ├─ services/           # truy vấn tồn kho, xuất CSV/PDF, mô phỏng realtime
│  │  └─ lib/                # ngày giờ, query builder, RNG có seed
│  └─ assets/fonts/          # Roboto (PDF tiếng Việt)
├─ client/
│  ├─ tailwind.config.ts     # design token
│  └─ src/
│     ├─ api/                # fetch client, hooks, kiểu dữ liệu
│     ├─ components/
│     │  ├─ layout/          # Sidebar, Topbar, AppLayout
│     │  ├─ ui/              # Button, Badge/StatBadge, Modal/Drawer, Dropdown, Skeleton...
│     │  ├─ data/            # DataTable, bộ lọc ngày
│     │  └─ widgets/         # KpiCard, ChartCard, RevenueChart, CalendarWidget...
│     ├─ context/            # Auth (vai trò + chi nhánh), Theme
│     └─ pages/              # các trang
└─ docs/                     # tài liệu quản lý dự án
```

## Ghi chú về dữ liệu mẫu

- Dữ liệu sinh ra **tính lùi từ ngày chạy**, và mỗi lần khởi động server sẽ tự bù các đơn còn thiếu đến thời điểm hiện tại, nên "hôm nay" và "tuần này" luôn có số liệu.
- Mặc định có **12 tháng** lịch sử bán hàng (khoảng 32.000 đơn) để các tab 6 tháng / 1 năm có dữ liệu. Muốn đúng 3 tháng như đề bài ban đầu: `SEED_MONTHS=3 npm run seed` (PowerShell: `$env:SEED_MONTHS=3; npm run seed`).
- Tên thuốc là sản phẩm phổ biến tại Việt Nam, nhưng giá chỉ mang tính minh họa.

Tài liệu dự án: xem thư mục [docs/](docs/).
