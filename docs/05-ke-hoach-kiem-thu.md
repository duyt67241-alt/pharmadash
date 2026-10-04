# 5. Kế hoạch kiểm thử

## 5.1 Phạm vi và chiến lược

| Mục | Nội dung |
|---|---|
| Đối tượng | Toàn bộ chức năng trong SRS (UC1–UC12) và yêu cầu phi chức năng |
| Loại kiểm thử | Chức năng (hộp đen), phân quyền, giao diện/responsive, API (bằng curl/Postman), hồi quy |
| Môi trường | Windows 11, Node 24, Chrome/Edge bản mới nhất; độ rộng 1440px (desktop), 1024px (tablet), 390px (mobile) |
| Dữ liệu | Dữ liệu seed chuẩn (`npm run seed`) – kết quả có thể lệch vài đơn do dữ liệu tự bù theo giờ |
| Tiêu chí đạt | 100% test case mức **Cao** đạt; không còn lỗi mức Nghiêm trọng / Cao |
| Tài khoản | `chu@huuduyen.vn`, `quanly@huuduyen.vn`, `nhanvien@huuduyen.vn` – mật khẩu `123456` |

## 5.2 Test case

**Ưu tiên:** C = Cao, TB = Trung bình, T = Thấp. Cột **KQ** để trống cho người kiểm thử điền (Đạt / Không đạt).

### Đăng nhập & phân quyền

| ID | Mô tả | Các bước | Kết quả mong đợi | Ưu tiên | KQ |
|---|---|---|---|---|---|
| TC01 | Đăng nhập thành công | Nhập `chu@huuduyen.vn` / `123456` → Đăng nhập | Vào trang Tổng quan, sidebar hiện "Tất cả chi nhánh" | C | |
| TC02 | Sai mật khẩu | Nhập mật khẩu `111111` | Báo "Email hoặc mật khẩu không đúng", không chuyển trang | C | |
| TC03 | Truy cập khi chưa đăng nhập | Mở trực tiếp `/orders` ở tab ẩn danh | Chuyển về `/login`; đăng nhập xong quay lại `/orders` | C | |
| TC04 | Menu theo vai trò | Đăng nhập `nhanvien@huuduyen.vn` | Chỉ có Tổng quan, Đơn hàng, Kho thuốc, Khách hàng; không có Nhập hàng/Nhân viên/Báo cáo | C | |
| TC05 | Chặn truy cập trang bằng URL | Nhân viên mở `/reports` | Hiện "Không có quyền truy cập" | C | |
| TC06 | Chặn ở API | Dùng token nhân viên gọi `GET /api/purchases` | HTTP 403 | C | |
| TC07 | Ẩn dữ liệu nhạy cảm | Nhân viên gọi `GET /api/medicines` | Không có trường `purchase_price`; KPI không có lợi nhuận | C | |
| TC08 | Nhân viên chỉ thấy đơn của mình | Nhân viên mở Đơn hàng | Mọi đơn đều có cột Nhân viên = Nguyễn Ngọc Mai | C | |
| TC09 | Quản lý bị giới hạn chi nhánh | `quanly@huuduyen.vn` gọi `/api/orders?branch=2` | Chỉ trả đơn của CN Cầu Giấy (bỏ qua tham số branch) | C | |
| TC10 | Đổi chi nhánh (chủ) | Bấm ô tài khoản → chọn "CN Đống Đa" | KPI, biểu đồ, cảnh báo đổi theo chi nhánh | TB | |
| TC11 | Đăng xuất | Ô tài khoản → Đăng xuất | Về trang đăng nhập, bấm Back không vào lại được | TB | |

### Tổng quan (Dashboard)

| ID | Mô tả | Các bước | Kết quả mong đợi | Ưu tiên | KQ |
|---|---|---|---|---|---|
| TC12 | Hiển thị KPI | Mở Tổng quan | 4 thẻ có số, huy hiệu %, mũi tên xanh (tăng) / đỏ (giảm) | C | |
| TC13 | Đổi kỳ KPI | Chọn Hôm nay / 7 ngày / 30 ngày | Số liệu và chú thích "so với…" thay đổi | C | |
| TC14 | Biểu đồ doanh thu | Bấm lần lượt 1N, 1T, 1Th, 6Th, 1Năm, Tất cả | Số cột đúng (15 giờ / 7 ngày / 30 ngày / 6 / 12 tháng…); cột kỳ hiện tại màu tím đậm | C | |
| TC15 | Tooltip biểu đồ | Di chuột lên một cột | Tooltip hiện doanh thu và số đơn; cột đang trỏ đổi màu | TB | |
| TC16 | Xem dạng bảng / tải CSV | Menu ⋮ của biểu đồ | Chuyển sang bảng; tải được file CSV | T | |
| TC17 | Lịch làm việc | Bấm ngày khác trong dải tuần, bấm mũi tên | Danh sách sự kiện đổi theo ngày; chấm màu dưới ngày có sự kiện | TB | |
| TC18 | Tùy chỉnh widget | Tùy chỉnh widget → bỏ chọn "Tỷ lệ khách quay lại" → tải lại trang | Widget vẫn ẩn; Cài đặt → Khôi phục thì hiện lại | T | |
| TC19 | Tự làm mới | Bật chế độ demo, chờ khoảng 30 giây | Số đơn / doanh thu tăng, dòng "Cập nhật lần cuối" cập nhật | TB | |
| TC20 | Skeleton | Giả lập mạng chậm (DevTools → Slow 3G), tải lại trang | Hiện khung xám trước khi có dữ liệu | T | |

### Kho thuốc

| ID | Mô tả | Các bước | Kết quả mong đợi | Ưu tiên | KQ |
|---|---|---|---|---|---|
| TC21 | Tìm kiếm không dấu | Gõ "hoat huyet" | Tìm thấy "Hoạt huyết dưỡng não Traphaco" | TB | |
| TC22 | Lọc theo nhóm / tình trạng | Chọn "Kháng sinh" + "Sắp hết" | Chỉ hiện thuốc thỏa cả hai điều kiện | TB | |
| TC23 | Thêm thuốc hợp lệ | Thêm thuốc → điền đủ → Lưu | Thông báo thành công, thuốc xuất hiện trong danh sách | C | |
| TC24 | Validate giá | Giá nhập 50.000, giá bán 30.000 | Báo lỗi "Giá nhập không được cao hơn giá bán" | C | |
| TC25 | Trùng mã thuốc | Thêm thuốc với mã `T0001` | Báo lỗi dữ liệu bị trùng (HTTP 409) | TB | |
| TC26 | Chi tiết theo lô | Bấm vào một thuốc | Drawer hiện tồn, bán 30 ngày, biểu đồ, danh sách lô kèm badge hạn dùng | C | |
| TC27 | Ngừng kinh doanh | Drawer → Ngừng kinh doanh → Xác nhận | Thuốc biến mất khỏi danh sách; đơn cũ vẫn hiển thị tên thuốc | TB | |
| TC28 | Cảnh báo hạn dùng | Tab "Sắp hết hạn" → chọn ≤ 30 ngày | Chỉ hiện lô có hạn ≤ 30 ngày (gồm cả lô quá hạn, badge đỏ) | C | |
| TC29 | Đặt hàng từ cảnh báo | Tab "Sắp hết hàng" → nút Đặt hàng | Mở form phiếu nhập, đã điền sẵn thuốc, NCC, chi nhánh | TB | |
| TC30 | Nhập CSV | Nhập dữ liệu → tải file mẫu → nhập lại chính file đó | Báo "Thêm mới 2"; nhập lần 2 báo "Cập nhật 2" | T | |

### Nhập hàng

| ID | Mô tả | Các bước | Kết quả mong đợi | Ưu tiên | KQ |
|---|---|---|---|---|---|
| TC31 | Tạo phiếu thiếu thông tin | Tạo phiếu, không chọn NCC → Đặt hàng | Báo "Chọn nhà cung cấp" | TB | |
| TC32 | Tạo phiếu đặt hàng | Chọn NCC, 2 thuốc → Đặt hàng | Phiếu mới ở trạng thái "Đã đặt · chờ giao"; tổng tiền đúng | C | |
| TC33 | Nhận hàng | Mở phiếu → Nhận hàng vào kho → Xác nhận | Trạng thái "Đã nhập kho"; tồn kho các thuốc tăng đúng số lượng; lô mới xuất hiện | C | |
| TC34 | Không nhận 2 lần | Gọi lại `PATCH /api/purchases/:id/receive` | HTTP 400 "Chỉ nhận hàng cho phiếu đang ở trạng thái Đã đặt" | C | |
| TC35 | Hạn dùng không hợp lệ | Khi nhận hàng, đặt hạn dùng = hôm qua (qua API) | Báo lỗi, không tạo lô nào | TB | |
| TC36 | Nháp → Đặt hàng / Hủy | Mở phiếu nháp → Đặt hàng; phiếu khác → Hủy | Trạng thái chuyển đúng | T | |
| TC37 | Thêm / sửa nhà cung cấp | Tab Nhà cung cấp → Thêm | Thẻ NCC mới hiện ra; tên < 3 ký tự thì báo lỗi | T | |

### Đơn hàng, Khách hàng, Nhân viên, Báo cáo

| ID | Mô tả | Các bước | Kết quả mong đợi | Ưu tiên | KQ |
|---|---|---|---|---|---|
| TC38 | Lọc đơn theo ngày | Chọn "Hôm nay" | Chỉ còn đơn hôm nay; ô thống kê cập nhật theo | C | |
| TC39 | Khoảng ngày tùy chọn | Từ 01/09 đến 07/09 → Áp dụng | Mọi đơn nằm trong khoảng; nút "Áp dụng" bị vô hiệu khi từ > đến | TB | |
| TC40 | Lọc theo thanh toán + nhân viên | Chọn "Ví điện tử" + 1 nhân viên | Kết quả thỏa cả hai | TB | |
| TC41 | Chi tiết đơn | Bấm một đơn | Hiện sản phẩm, số lô, tạm tính − chiết khấu = tổng | C | |
| TC42 | Phân trang & sắp xếp | Bấm "Tổng tiền", sang trang 2 | Sắp xếp giảm/tăng đúng; số dòng hiển thị đúng | TB | |
| TC43 | Hạng khách hàng | Lọc "Vàng" | Mọi khách có tổng chi tiêu ≥ 8.000.000 đ | TB | |
| TC44 | Lịch sử khách | Bấm một khách → bấm 1 đơn trong lịch sử | Chuyển sang trang Đơn hàng, mở đúng đơn đó | T | |
| TC45 | Doanh số nhân viên | Trang Nhân viên, chọn 30 ngày | Bảng xếp hạng giảm dần theo doanh số, % so kỳ trước | TB | |
| TC46 | Lịch ca | Bấm tuần sau / tuần này | Lưới 7 ngày, mỗi ô Sáng/Chiều/Nghỉ | T | |
| TC47 | Xuất CSV doanh thu | Báo cáo → Xuất CSV → mở bằng Excel | Tiếng Việt hiển thị đúng; dòng TỔNG khớp số trên màn hình | C | |
| TC48 | Xuất PDF doanh thu | Báo cáo → Xuất PDF | PDF mở được, đúng dấu tiếng Việt, có số trang, không có trang trắng | C | |
| TC49 | Xuất PDF tồn kho | Báo cáo → Tồn kho → Xuất PDF | Liệt kê đủ thuốc, cột trạng thái đúng | TB | |

### Giao diện & phi chức năng

| ID | Mô tả | Các bước | Kết quả mong đợi | Ưu tiên | KQ |
|---|---|---|---|---|---|
| TC50 | Responsive tablet | Thu cửa sổ về khoảng 1024px | Sidebar thu thành icon, KPI dạng 2x2, không có thanh cuộn ngang | C | |
| TC51 | Responsive mobile | Khoảng 390px | Sidebar ẩn, mở bằng nút ☰; các card xếp 1 cột | TB | |
| TC52 | Thu gọn sidebar | Desktop, bấm « | Sidebar còn icon, trạng thái được nhớ sau khi tải lại | T | |
| TC53 | Dark mode | Bấm icon mặt trăng | Toàn bộ giao diện và biểu đồ đổi màu, chữ vẫn đọc rõ; tải lại trang vẫn giữ | TB | |
| TC54 | Tìm kiếm toàn cục | Ctrl+K → gõ "nguyen" | Gợi ý khách hàng có tên "Nguyễn…"; bấm → mở chi tiết | TB | |
| TC55 | Thông báo | Bấm chuông | Danh sách cảnh báo; bấm một mục → đi tới trang tương ứng | T | |
| TC56 | Hiệu năng | DevTools → Network, tải Tổng quan | Mỗi API < 500 ms | TB | |
| TC57 | Dữ liệu tự bù | Tắt server, đợi > 10 phút, bật lại | Log "Đã bù N đơn hàng"; KPI hôm nay có dữ liệu mới | T | |
| TC58 | Bàn phím | Dùng Tab để di chuyển trên bảng, Enter mở chi tiết, Esc đóng | Có viền focus rõ, thao tác được hoàn toàn bằng bàn phím | T | |

## 5.3 Mẫu báo cáo lỗi

| Trường | Ví dụ |
|---|---|
| Mã lỗi | BUG-012 |
| Test case | TC48 |
| Mức độ | Trung bình |
| Mô tả | File PDF doanh thu có 2 trang trắng ở cuối |
| Các bước tái hiện | Đăng nhập quản lý → Báo cáo → Xuất PDF |
| Kết quả thực tế / mong đợi | 4 trang (2 trắng) / 2 trang |
| Nguyên nhân & cách sửa | Chữ chân trang vẽ dưới lề dưới làm pdfkit tự sang trang → tạm bỏ lề dưới khi vẽ chân trang |
| Trạng thái | Đã sửa, đã kiểm thử lại |
