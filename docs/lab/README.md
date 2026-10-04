# Bộ tài liệu Lab QLDA – "Lập kế hoạch dự án với Claude Projects" (đề tài PharmaDash)

Bài lab của thầy dùng tình huống EduReg làm ví dụ; nhóm chọn đề tài riêng là **PharmaDash**, đặt trong bối cảnh dự án giả định: chuỗi Nhà thuốc Hữu Duyên (hư cấu) thuê đội 5 người làm hệ thống, ngân sách 250 triệu, khởi động 05/10/2026, go-live trước 31/12/2026.

## Các file

| File | Dùng để |
|---|---|
| `PharmaDash_YeuCauKhachHang.docx` | Tài liệu yêu cầu khách hàng (tương đương Phụ lục A) – **tải lên Knowledge** của Claude Project |
| `Instructions_ClaudeProject.txt` | Nội dung dán vào **Project Instructions** (nhớ sửa `[Nhóm XX]`) |
| `QLDA_Nhom_PharmaDash_Lab.docx` | Khung báo cáo nộp, đã có bản nháp Charter, WBS, PERT, chi phí, rủi ro. Đổi tên thành `QLDA_Nhom<số>_Lab.docx` |
| `QLDA_PharmaDash_LichDuAn.xlsx` | File Excel nộp kèm: WBS, chi phí, PERT/CPM, Gantt, Risk Register, ma trận – toàn bộ tính bằng công thức |

## Đã có trong báo cáo (AI soạn – nhóm đọc lại và chỉnh nếu cần)

- Rà soát SMART, viết lại mục tiêu 1, 2, 4; đối chiếu phạm vi với tài liệu; chọn 3 câu hỏi quan trọng nhất (mục 2).
- Sơ đồ cây WBS 3 cấp (mục 3.1).
- Phương án nén lịch đã chọn + sheet `NenLich` trong Excel: T từ 75,33 xuống 61,83 ngày, kịp hạn ~74% (mục 4.5).

## Nhóm vẫn phải tự làm (không thể / không được nhờ AI làm thay)

Các chỗ còn tô vàng `[NHÓM ĐIỀN: …]` trong file Word:

1. **Phần A:** tạo Claude Project bằng tài khoản của nhóm, chụp ảnh Instructions, Knowledge, câu trả lời kiểm tra (mục 1).
2. **Bài 3:** chạy chat `Bai3_Lich` trong Project, nhập TE của Claude vào cột vàng sheet PERT, ghi chỗ khác biệt (mục 4.4).
3. **Bài 4:** 2 rủi ro R11, R12 **từ kinh nghiệm của nhóm** (đề yêu cầu rủi ro AI không nêu).
4. **Bài 5:** 5 câu hỏi Sponsor lấy từ chat `Bai5_PhanBien`, câu trả lời và phản tư **tự viết** (đề cấm nhờ AI).
5. Nhật ký AI (mục 8), tên/MSSV, xóa hết `[NHÓM ĐIỀN]`, cập nhật mục lục.

> Quy định của thầy: dán nguyên văn đầu ra AI không kiểm tra/chỉnh sửa bị trừ tới 50% điểm tiêu chí. Nhật ký AI đã ghi rõ các phần do Claude Code soạn (dòng 0, 0b) – nhóm giữ nguyên, điền thêm cột nhận xét.

## Số liệu chính (đã kiểm tra lại bằng Excel và tính độc lập bằng Python)

- WBS: 7 hạng mục cấp 1, 47 gói công việc, 1.364 giờ công, không gói nào vi phạm 8/80.
- Dự toán: 240.988.000 đ (gồm 10% dự phòng) / ngân sách 250.000.000 đ.
- PERT gốc: đường găng A → B → C → E → I → J → M → N → O, T = 75,33 ngày > 64 ngày tới hạn; σ = 3,61; xác suất kịp hạn ≈ 0,09%.
- Sau khi nén: đường găng A → B → C → D → F → G → K → M → N → O, T = 61,83 ngày, kết thúc 29/12/2026; σ = 3,39; xác suất kịp hạn ≈ 74%.
