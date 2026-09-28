# Bộ tài liệu Lab QLDA – "Lập kế hoạch dự án với Claude Projects" (đề tài PharmaDash)

Bài lab của thầy dùng tình huống EduReg làm ví dụ; nhóm chọn đề tài riêng là **PharmaDash**, đặt trong bối cảnh dự án giả định: chuỗi Nhà thuốc Tâm An (hư cấu) thuê đội 5 người làm hệ thống, ngân sách 250 triệu, khởi động 05/10/2026, go-live trước 31/12/2026.

## Các file

| File | Dùng để |
|---|---|
| `PharmaDash_YeuCauKhachHang.docx` | Tài liệu yêu cầu khách hàng (tương đương Phụ lục A) – **tải lên Knowledge** của Claude Project |
| `Instructions_ClaudeProject.txt` | Nội dung dán vào **Project Instructions** (nhớ sửa `[Nhóm XX]`) |
| `QLDA_Nhom_PharmaDash_Lab.docx` | Khung báo cáo nộp, đã có bản nháp Charter, WBS, PERT, chi phí, rủi ro. Đổi tên thành `QLDA_Nhom<số>_Lab.docx` |
| `QLDA_PharmaDash_LichDuAn.xlsx` | File Excel nộp kèm: WBS, chi phí, PERT/CPM, Gantt, Risk Register, ma trận – toàn bộ tính bằng công thức |

## Nhóm vẫn phải tự làm (bài lab chấm các phần này)

Các chỗ nhóm cần điền được **tô vàng `[NHÓM ĐIỀN: …]`** trong file Word (và nền vàng trong Excel).

1. **Phần A – Claude Project:** tạo Project `QLDA_Nhom<số>_PharmaDash`, dán Instructions, tải tài liệu yêu cầu lên Knowledge, hỏi thử "Tóm tắt 5 yêu cầu chính…", **chụp màn hình** chèn vào mục 1.
2. **Chạy từng bài trong Claude Project** (chat Bai1_Charter … Bai5_PhanBien) bằng các prompt mẫu của thầy; so sánh câu trả lời của Claude với bản nháp trong báo cáo, **sửa theo ý nhóm** và ghi vào nhật ký AI (mục 8).
3. **Bài 1:** viết lại ≥ 2 mục tiêu SMART, đối chiếu phạm vi, chọn 3 câu hỏi quan trọng nhất và giải thích.
4. **Bài 2:** tự vẽ **sơ đồ cây WBS** (draw.io / SmartArt) – không chỉ dán bảng.
5. **Bài 3:** nhập TE mà Claude trả lời vào cột vàng sheet PERT, ghi chỗ khác biệt; **chọn phương án nén lịch** (lịch gốc trễ 11,33 ngày) và lý giải.
6. **Bài 4:** bổ sung **2 rủi ro R11, R12** của nhóm (ma trận tự cập nhật; nhớ sắp lại bảng theo điểm).
7. **Bài 5:** dán 5 câu hỏi của "Sponsor" và **tự viết câu trả lời**, viết phần phản tư – theo quy định bài lab, phần này không nhờ AI.

> Quy định của thầy: dán nguyên văn đầu ra AI không kiểm tra/chỉnh sửa bị trừ tới 50% điểm tiêu chí. Bản nháp ở đây là điểm xuất phát – nhóm cần đọc, kiểm tra số liệu và chỉnh sửa, và ghi rõ trong nhật ký rằng bản nháp do AI (Claude Code) tạo.

## Số liệu chính (đã kiểm tra lại bằng Excel và tính độc lập bằng Python)

- WBS: 7 hạng mục cấp 1, 47 gói công việc, 1.364 giờ công, không gói nào vi phạm 8/80.
- Dự toán: 240.988.000 đ (gồm 10% dự phòng) / ngân sách 250.000.000 đ.
- PERT: đường găng A → B → C → E → I → J → M → N → O, T = 75,33 ngày làm việc > 64 ngày tới hạn; σ = 3,61; xác suất kịp hạn ≈ 0,09%.
