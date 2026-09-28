import { Keyboard, ShieldCheck, Store, UserRound } from 'lucide-react';
import { PageHeader } from '../components/ui/Misc';

const ROLES = [
  { icon: ShieldCheck, title: 'Chủ nhà thuốc', email: 'chu@taman.vn', items: ['Xem mọi chi nhánh (đổi ở ô tài khoản trên sidebar)', 'Thấy lợi nhuận, giá nhập, báo cáo', 'Quản lý kho, nhập hàng, nhân viên'] },
  { icon: Store, title: 'Quản lý', email: 'quanly@taman.vn', items: ['Toàn quyền trong chi nhánh của mình', 'Duyệt / nhận phiếu nhập', 'Xuất báo cáo CSV/PDF'] },
  { icon: UserRound, title: 'Nhân viên bán hàng', email: 'nhanvien@taman.vn', items: ['Chỉ thấy doanh số và đơn của mình', 'Xem tồn kho, cảnh báo hạn dùng (không thấy giá nhập)', 'Tra cứu khách hàng'] },
];

export default function Help() {
  return (
    <div className="max-w-4xl space-y-5 p-4 md:p-6">
      <PageHeader title="Trợ giúp" description="Hướng dẫn nhanh khi sử dụng / trình diễn hệ thống" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {ROLES.map((r) => (
          <div key={r.title} className="card p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary-ink"><r.icon className="h-4 w-4" /></span>
              <div>
                <div className="text-[13px] font-semibold text-ink">{r.title}</div>
                <div className="text-2xs text-ink-3">{r.email} / 123456</div>
              </div>
            </div>
            <ul className="list-disc space-y-1 pl-4 text-xs text-ink-2">{r.items.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        ))}
      </div>
      <div className="card p-5 text-[13px] text-ink-2">
        <h2 className="mb-2 flex items-center gap-2 font-semibold text-ink"><Keyboard className="h-4 w-4" /> Mẹo sử dụng</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><b className="text-ink">Ctrl + K</b>: tìm nhanh thuốc, khách hàng, mã đơn (gõ không dấu cũng được).</li>
          <li>Dữ liệu dashboard tự làm mới mỗi 30 giây; bật <b className="text-ink">chế độ demo</b> trong Cài đặt để thấy số liệu nhảy trực tiếp.</li>
          <li>Tồn kho được quản lý theo <b className="text-ink">lô</b>: mỗi lô có hạn dùng riêng, nhận hàng từ phiếu nhập sẽ tạo lô mới.</li>
          <li>Mỗi khi khởi động, server tự bù dữ liệu bán hàng đến thời điểm hiện tại; chạy <code className="rounded bg-muted px-1">npm run seed</code> để tạo lại từ đầu.</li>
          <li>Báo cáo CSV mở trực tiếp bằng Excel (UTF-8 có BOM), PDF hỗ trợ đầy đủ tiếng Việt.</li>
        </ul>
      </div>
    </div>
  );
}
