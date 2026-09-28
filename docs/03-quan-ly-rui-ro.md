# 3. Kế hoạch quản lý rủi ro

**Thang đánh giá:** Xác suất (XS) và Tác động (TĐ) từ 1 (thấp) đến 5 (cao). **Mức rủi ro = XS × TĐ**: ≥ 15 là Cao, 8–14 là Trung bình, < 8 là Thấp.

## 3.1 Bảng rủi ro

| ID | Rủi ro | Nhóm | XS | TĐ | Mức | Biện pháp phòng ngừa | Phương án ứng phó | Phụ trách | Trạng thái |
|---|---|---|---|---|---|---|---|---|---|
| R01 | Yêu cầu thay đổi / phình phạm vi (thêm POS, kết nối cổng dược…) | Phạm vi | 4 | 4 | **16 – Cao** | Chốt phạm vi trong SRS, ghi rõ "Ngoài phạm vi"; ưu tiên MoSCoW | Đưa yêu cầu mới vào backlog, chỉ nhận sau M3 nếu còn thời gian | PM | Đang theo dõi |
| R02 | Trễ tiến độ do thành viên bận thi giữa kỳ | Lịch trình | 4 | 3 | **12 – TB** | Dự phòng 1 tuần cuối; họp nhanh 2 lần/tuần | Dồn nhân lực vào hạng mục Must, cắt hạng mục Could | PM | Đang theo dõi |
| R03 | Lỗi cài đặt trên máy giảng viên (thư viện native, phiên bản Node) | Kỹ thuật | 3 | 5 | **15 – Cao** | Dùng `node:sqlite` tích hợp sẵn thay `better-sqlite3`; ghi rõ Node ≥ 22.13 | Chuẩn bị sẵn laptop demo + video quay màn hình | BE | Đã xử lý |
| R04 | Dữ liệu giả thiếu thực tế, demo không thuyết phục | Chất lượng | 3 | 3 | 9 – TB | Seed theo mùa vụ, giờ cao điểm, vòng đời khách hàng, tên thuốc VN | Tinh chỉnh tham số seed, chạy lại `npm run seed` | BE | Đã xử lý |
| R05 | Dữ liệu "cũ" khi demo vào ngày khác ngày seed (dashboard hôm nay = 0) | Kỹ thuật | 4 | 4 | **16 – Cao** | Server tự bù đơn hàng đến thời điểm hiện tại khi khởi động | Chạy lại `npm run seed` trước buổi demo | BE | Đã xử lý |
| R06 | PDF lỗi font tiếng Việt | Kỹ thuật | 4 | 3 | **12 – TB** | Nhúng font Roboto vào pdfkit | Dùng CSV thay thế | BE | Đã xử lý |
| R07 | Lộ dữ liệu nhạy cảm (giá nhập, lợi nhuận) cho nhân viên | Bảo mật | 2 | 4 | 8 – TB | Kiểm tra quyền **ở server** (không chỉ ẩn trên giao diện); có test case riêng | Sửa khẩn và kiểm thử hồi quy phân quyền | BE, QA | Đã xử lý |
| R08 | Hiệu năng truy vấn chậm khi dữ liệu lớn | Kỹ thuật | 2 | 3 | 6 – Thấp | Tạo chỉ mục theo `created_at`, `branch_id`; tính toán ở SQL | Giảm `SEED_MONTHS` | BE | Đã xử lý |
| R09 | Thành viên rời nhóm / nghỉ dài ngày | Nhân sự | 2 | 4 | 8 – TB | Code review chéo, tài liệu hóa trong README, commit nhỏ thường xuyên | Phân công lại theo WBS | PM | Đang theo dõi |
| R10 | Giao diện không đồng nhất giữa các trang | Chất lượng | 3 | 2 | 6 – Thấp | Design token trong tailwind.config, component dùng chung (KpiCard, ChartCard, DataTable…) | Rà soát UI trước M3 | FE | Đã xử lý |
| R11 | Mất mã nguồn / xung đột khi làm nhóm | Kỹ thuật | 2 | 5 | 10 – TB | Git, nhánh theo tính năng, đẩy lên remote hằng ngày | Khôi phục từ lịch sử git | PM | Đang theo dõi |
| R12 | Sự cố thiết bị / mạng trong buổi demo | Vận hành | 2 | 5 | 10 – TB | Ứng dụng chạy hoàn toàn offline (font, dữ liệu đều cục bộ) | Video demo dự phòng, ảnh chụp màn hình | Cả nhóm | Đang theo dõi |

## 3.2 Ma trận rủi ro

| XS \ TĐ | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| **5** | | | | | |
| **4** | | | R06 · R02 | R01 · R05 | |
| **3** | | R10 | R04 | | R03 |
| **2** | | | R08 | R07 · R09 | R11 · R12 |
| **1** | | | | | |

## 3.3 Quy trình theo dõi

1. Rà soát bảng rủi ro trong buổi họp hằng tuần, cập nhật XS/TĐ và trạng thái.
2. Rủi ro mức **Cao** phải có người phụ trách và hạn xử lý cụ thể.
3. Rủi ro mới phát sinh được bổ sung với mã tiếp theo (R13…).
