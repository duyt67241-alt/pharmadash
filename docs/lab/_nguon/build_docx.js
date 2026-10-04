// Tạo báo cáo Lab QLDA (Word) và tài liệu yêu cầu khách hàng (Knowledge) cho dự án PharmaDash
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType,
  HeadingLevel, PageOrientation, ImageRun, LevelFormat, BorderStyle, PageBreak, Footer, PageNumber, TableOfContents,
} = require('docx');

const OUT_DIR = process.argv[2];
const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8'));
const FONT = 'Arial';
const NAVY = '1F4E79';
const PORTRAIT_W = 11906 - 2 * 1134; // 9638
const LAND_W = 16838 - 2 * 1134;     // 14570

// ---------------- helpers ----------------
const run = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size ?? 21, bold: o.bold, italics: o.italics, color: o.color, highlight: o.highlight });
/** Đoạn văn; chấp nhận chuỗi hoặc mảng [chuỗi | {t, bold, fill}] */
function P(content, o = {}) {
  const parts = Array.isArray(content) ? content : [content];
  return new Paragraph({
    alignment: o.align,
    spacing: { after: o.after ?? 100, before: o.before ?? 0, line: 276 },
    numbering: o.bullet ? { reference: 'bullets', level: 0 } : o.num ? { reference: o.num, level: 0 } : undefined,
    children: parts.map((x) => (typeof x === 'string' ? run(x, o) : x.fill ? todoRun(x.t) : run(x.t, { ...o, ...x }))),
  });
}
/** Chỗ nhóm phải tự điền: tô vàng */
const todoRun = (t) => run(`[NHÓM ĐIỀN: ${t}]`, { highlight: 'yellow', italics: true, color: '7A5C00' });
const TODO = (t, o = {}) => new Paragraph({ spacing: { after: 120 }, children: [todoRun(t)], ...o });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, keepNext: true, keepLines: true, spacing: { before: 240, after: 160 }, children: [run(t, { size: 30, bold: true, color: NAVY })] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, keepLines: true, spacing: { before: 200, after: 120 }, children: [run(t, { size: 25, bold: true, color: NAVY })] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, keepNext: true, keepLines: true, spacing: { before: 160, after: 80 }, children: [run(t, { size: 22, bold: true, color: '2E5C8A' })] });
const bullets = (items, o = {}) => items.map((t) => P(t, { ...o, bullet: true, after: 60 }));
const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
const borders = { top: border, bottom: border, left: border, right: border };

/** Bảng: rows là mảng các mảng ô; ô là chuỗi hoặc {t, bold, fill, todo, align} */
function T(widths, rows, o = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((cells, ri) => new TableRow({
      tableHeader: ri === 0 && o.header !== false,
      cantSplit: true,
      children: cells.map((c, ci) => {
        const cc = typeof c === 'object' && c !== null ? c : { t: String(c ?? '') };
        const isHead = ri === 0 && o.header !== false;
        const lines = String(cc.t ?? '').split('\n');
        return new TableCell({
          width: { size: widths[ci], type: WidthType.DXA },
          borders,
          margins: { top: 50, bottom: 50, left: 90, right: 90 },
          shading: isHead ? { fill: NAVY, type: ShadingType.CLEAR, color: 'auto' } : cc.fill ? { fill: cc.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
          children: lines.map((line) => new Paragraph({
            keepNext: !!o.keep && ri < rows.length - 1,
            alignment: cc.align ?? (isHead ? AlignmentType.CENTER : undefined),
            spacing: { after: 20 },
            children: [cc.todo ? todoRun(line) : run(line, { size: o.size ?? 19, bold: isHead || cc.bold, color: isHead ? 'FFFFFF' : undefined })],
          })),
        });
      }),
    })),
  });
}
const fmt = (n, d = 2) => (Math.abs(n) < 0.005 ? 0 : n).toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d });
const vnd = (n) => `${Math.round(n).toLocaleString('vi-VN')} đ`;
const C = AlignmentType.CENTER;
const R = AlignmentType.RIGHT;
const img = (file, w, h) => new Paragraph({ alignment: C, spacing: { after: 120 }, children: [new ImageRun({ type: 'png', data: fs.readFileSync(path.join(__dirname, file)), transformation: { width: w, height: h } })] });
const caption = (t) => P(t, { align: C, italics: true, size: 18, color: '595959' });
const br = () => new Paragraph({ children: [new PageBreak()] });

const numbering = {
  config: [
    { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    ...['n1', 'n2', 'n3', 'n4'].map((r) => ({ reference: r, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] })),
  ],
};
const styles = {
  default: { document: { run: { font: FONT, size: 21 } } },
  paragraphStyles: [
    { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 30, bold: true, color: NAVY }, paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 } },
    { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 25, bold: true, color: NAVY }, paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 } },
    { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 22, bold: true, color: '2E5C8A' }, paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 } },
  ],
};
const footer = new Footer({ children: [new Paragraph({ alignment: R, children: [run('QLDA CNTT – Lab Claude Projects – PharmaDash · Trang ', { size: 16, color: '808080' }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: '808080' })] })] });
const portrait = { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } };
const landscape = { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } };

// ======================================================================
// 1) TÀI LIỆU YÊU CẦU KHÁCH HÀNG (nạp vào Knowledge của Claude Project)
// ======================================================================
const FR = [
  ['FR01', 'Xem các chỉ số kinh doanh (doanh thu, số đơn, lợi nhuận, số khách) theo hôm nay / 7 ngày / 30 ngày, so sánh với kỳ trước', 'Bắt buộc'],
  ['FR02', 'Biểu đồ doanh thu theo giờ / ngày / tháng; top thuốc bán chạy; doanh thu theo nhóm thuốc', 'Bắt buộc'],
  ['FR03', 'Quản lý danh mục thuốc và tồn kho theo từng lô (số lô, hạn dùng, số lượng) tại từng chi nhánh', 'Bắt buộc'],
  ['FR04', 'Cảnh báo thuốc sắp hết hạn (30/60/90 ngày) và thuốc dưới mức tồn tối thiểu', 'Bắt buộc'],
  ['FR05', 'Tra cứu và lọc hóa đơn bán hàng theo ngày, nhân viên, phương thức thanh toán', 'Bắt buộc'],
  ['FR06', 'Lập phiếu nhập hàng, quản lý nhà cung cấp, nhận hàng vào kho theo lô', 'Bắt buộc'],
  ['FR07', 'Xuất báo cáo doanh thu, tồn kho ra Excel/CSV và PDF', 'Bắt buộc'],
  ['FR08', 'Phân quyền: chủ nhà thuốc xem tất cả; quản lý xem chi nhánh của mình; nhân viên chỉ xem doanh số của mình, không xem giá nhập', 'Bắt buộc'],
  ['FR09', 'Theo dõi khách hàng thân thiết, lịch sử mua hàng, hạng thành viên', 'Nên có'],
  ['FR10', 'Doanh số theo nhân viên và lịch ca làm việc', 'Nên có'],
  ['FR11', 'Lịch làm việc chung (họp, ngày giao hàng, ngày thuốc hết hạn); giao diện sáng/tối', 'Có thể có'],
  ['FR12', 'Ứng dụng di động riêng; đặt hàng tự động với nhà cung cấp', 'Giai đoạn sau'],
];
const knowledge = new Document({
  styles, numbering,
  sections: [{
    properties: portrait,
    children: [
      P('TÀI LIỆU YÊU CẦU KHÁCH HÀNG – DỰ ÁN PHARMADASH', { bold: true, size: 30, color: NAVY, align: C, after: 60 }),
      P('Hệ thống Dashboard điều hành chuỗi nhà thuốc (tình huống giả định phục vụ học tập)', { italics: true, align: C, after: 240 }),
      H2('A1. Giới thiệu'),
      P('Chuỗi Nhà thuốc Tâm An có 2 chi nhánh tại Hà Nội (Cầu Giấy và Đống Đa), khoảng 12 nhân viên, kinh doanh khoảng 1.200 mặt hàng thuốc và vật tư y tế, trung bình 80–110 hóa đơn mỗi ngày trên cả chuỗi.'),
      P('Hiện nay việc bán hàng dùng một phần mềm bán hàng mua sẵn tại quầy; tồn kho và hạn dùng được theo dõi bằng file Excel riêng ở từng chi nhánh. Cuối mỗi tháng chủ nhà thuốc mất khoảng 1 ngày làm việc để tổng hợp báo cáo từ 2 chi nhánh. Năm 2025 nhà thuốc phải hủy khoảng 45 triệu đồng thuốc hết hạn do phát hiện muộn, đồng thời thường xuyên hết hàng các thuốc bán chạy vào mùa cảm cúm.'),
      P('Chủ nhà thuốc muốn có một hệ thống web giúp theo dõi hoạt động kinh doanh gần như theo thời gian thực trên một màn hình, cảnh báo sớm hàng sắp hết hạn / sắp hết và xuất báo cáo nhanh.'),
      H2('A2. Yêu cầu chức năng'),
      T([900, 6938, 1800], [['Mã', 'Yêu cầu', 'Ưu tiên'], ...FR.map(([a, b, c]) => [{ t: a, bold: true }, b, c])]),
      H2('A3. Yêu cầu phi chức năng'),
      ...bullets([
        'Dữ liệu trên dashboard cập nhật gần như thời gian thực so với phần mềm bán hàng.',
        'Thời gian mở trang tổng quan dưới 2 giây với dữ liệu 2 năm.',
        'Dùng tốt trên máy tính và máy tính bảng tại quầy; giao diện tiếng Việt.',
        'Bảo mật thông tin khách hàng và giá nhập; tuân thủ quy định về bảo vệ dữ liệu cá nhân.',
        'Sao lưu dữ liệu hằng ngày; sẵn sàng trong giờ mở cửa (7h–22h).',
      ]),
      H2('A4. Ràng buộc và thông tin khác'),
      ...bullets([
        'Ngân sách: 250 triệu đồng (gồm phát triển, hosting năm đầu, đào tạo).',
        'Khởi động dự án ngày 05/10/2026; phải vận hành chính thức trước 31/12/2026 để phục vụ kiểm kê cuối năm và mùa cao điểm Tết.',
        'Cần chuyển dữ liệu cũ: danh mục khoảng 1.200 mặt hàng, tồn kho hiện tại theo lô, lịch sử bán hàng 2 năm.',
        'Dữ liệu bán hàng phải lấy từ phần mềm bán hàng đang dùng (chưa xác định có hỗ trợ kết nối hay không).',
        'Chủ nhà thuốc muốn xem bản demo sau mỗi tháng.',
        'Đội dự án: 1 PM, 1 BA, 1 lập trình viên backend, 1 lập trình viên frontend (kiêm thiết kế giao diện), 1 tester.',
      ]),
    ],
  }],
});

// ======================================================================
// 2) BÁO CÁO LAB
// ======================================================================
const A = D.activities;
const SC = D.scenario;
const crit = D.crit.join(' → ');
const INSTRUCTIONS = [
  '# VAI TRÒ',
  'Bạn là trợ lý quản lý dự án phần mềm, có kinh nghiệm theo chuẩn PMBOK và Agile. Bạn hỗ trợ nhóm sinh viên [Nhóm XX] lập kế hoạch dự án PharmaDash.',
  '',
  '# BỐI CẢNH',
  '- Dự án: hệ thống Dashboard điều hành chuỗi nhà thuốc PharmaDash (xem file Knowledge).',
  '- Ràng buộc: ngân sách 250 triệu đồng, khởi động 05/10/2026, go-live trước 31/12/2026, đội 5 người (PM, BA, BE, FE, QA).',
  '',
  '# QUY TẮC ĐẦU RA',
  '- Trả lời bằng tiếng Việt, thuật ngữ chuyên ngành kèm tiếng Anh trong ngoặc.',
  '- Ưu tiên trình bày dạng bảng khi liệt kê công việc, rủi ro, mốc thời gian.',
  '- Mọi con số (thời gian, chi phí) phải ghi rõ giả định dùng để tính.',
  '- Chỉ dựa trên thông tin trong Knowledge; nếu thiếu thông tin, hãy liệt kê câu hỏi cần làm rõ với khách hàng thay vì tự bịa.',
  '',
  '# CÁCH LÀM VIỆC',
  '- Không làm hộ toàn bộ: sau mỗi đầu ra, đặt 2–3 câu hỏi gợi mở để nhóm tự kiểm tra và cải thiện.',
  '- Khi được yêu cầu "phản biện", hãy chỉ ra điểm yếu của bản kế hoạch.',
];
fs.writeFileSync(path.join(OUT_DIR, 'Instructions_ClaudeProject.txt'), '﻿' + INSTRUCTIONS.join('\r\n'), 'utf8');

// --- WBS
const wbsRows = D.wbs.map(([code, lvl, name, deliv, role, h]) => {
  const fill = lvl === 1 ? 'D9E2F3' : lvl === 2 ? 'EEF3FA' : undefined;
  const hours = lvl === 3 ? h : D.wbs.filter((w) => w[1] === 3 && w[0].startsWith(lvl === 1 ? code.split('.')[0] + '.' : code + '.')).reduce((s, w) => s + w[5], 0);
  return [{ t: code, bold: lvl < 3, fill }, { t: '   '.repeat(lvl - 1) + name, bold: lvl < 3, fill }, { t: deliv, fill }, { t: role, fill, align: C }, { t: String(hours), bold: lvl < 3, fill, align: R }];
});
const totalHours = D.wbs.filter((w) => w[1] === 3).reduce((s, w) => s + w[5], 0);
const wpCount = D.wbs.filter((w) => w[1] === 3).length;

// --- Chi phí
const roleHours = Object.fromEntries(D.rates.map(([r]) => [r, D.wbs.filter((w) => w[1] === 3 && w[4] === r).reduce((s, w) => s + w[5], 0)]));
const labor = D.rates.reduce((s, [r, , rate]) => s + rate * roleHours[r], 0);
const other = D.other.reduce((s, [, , q, p]) => s + q * p, 0);
const direct = labor + other;
const cont = direct * D.contingency;
const total = direct + cont;

// --- Rủi ro (sắp theo điểm)
const risks = [...D.risks].sort((a, b) => b.xs * b.td - a.xs * a.td);
const level = (s) => (s >= 15 ? 'Cao' : s >= 8 ? 'Trung bình' : 'Thấp');
const lvFill = (s) => (s >= 15 ? 'F8CBCB' : s >= 8 ? 'FCE4C4' : 'D8F0DD');

const cover = [
  P('TRƯỜNG ……………………………… · KHOA ………………………………', { align: C, bold: true, after: 60 }),
  P('HỌC PHẦN: QUẢN LÝ DỰ ÁN CÔNG NGHỆ THÔNG TIN', { align: C, bold: true, color: '404040', after: 1200 }),
  P('BÁO CÁO BÀI THỰC HÀNH (LAB)', { align: C, bold: true, size: 36, color: NAVY, after: 120 }),
  P('Lập kế hoạch dự án phần mềm với trợ lý AI – Claude Projects', { align: C, size: 26, color: NAVY, after: 600 }),
  P([{ t: 'Đề tài: ', bold: true }, { t: 'PharmaDash – Hệ thống Dashboard điều hành chuỗi nhà thuốc' }], { align: C, size: 24, after: 60 }),
  P('(dự án giả định: khách hàng là chuỗi Nhà thuốc Tâm An – hư cấu)', { align: C, italics: true, size: 19, after: 600 }),
  T([900, 3900, 2600, 2238], [
    ['STT', 'Họ và tên', 'MSSV', 'Vai trò trong lab'],
    ['1', { t: 'Họ tên', todo: true }, { t: 'MSSV', todo: true }, 'Trưởng nhóm (PM)'],
    ['2', { t: 'Họ tên', todo: true }, { t: 'MSSV', todo: true }, 'Thư ký – ghi nhật ký AI (BA)'],
    ['3', { t: 'Họ tên', todo: true }, { t: 'MSSV', todo: true }, 'Phụ trách WBS, chi phí (BE)'],
    ['4', { t: 'Họ tên', todo: true }, { t: 'MSSV', todo: true }, 'Phụ trách lịch, PERT (FE)'],
    ['5', { t: 'Họ tên', todo: true }, { t: 'MSSV', todo: true }, 'Phụ trách rủi ro (QA)'],
  ]),
  P('', { after: 400 }),
  P([{ t: 'Nhóm: ' , bold: true }, { t: 'số nhóm', fill: true }, { t: '     Giảng viên: ', bold: true }, { t: 'tên giảng viên', fill: true }], { align: C }),
  P([{ t: 'Tên file nộp: ', bold: true }, { t: 'QLDA_Nhom<số>_Lab.docx + QLDA_Nhom<số>_LichDuAn.xlsx' }], { align: C }),
  br(),
  P('MỤC LỤC', { bold: true, size: 26, color: NAVY }),
  new TableOfContents('Mục lục', { hyperlink: true, headingStyleRange: '1-2' }),
  P('(Trong Word: nhấp chuột phải vào mục lục → Update Field để cập nhật số trang.)', { italics: true, size: 18, color: '808080' }),
  br(),
];

const part1 = [
  H1('1. Thiết lập Claude Project'),
  T([2600, 7038], [
    ['Mục', 'Thiết lập'],
    ['Tên Project', 'QLDA_Nhom<số>_PharmaDash'],
    ['Mô tả', 'Trợ lý lập kế hoạch dự án PharmaDash – môn Quản lý dự án CNTT'],
    ['Knowledge (tài liệu)', 'PharmaDash_YeuCauKhachHang.docx (yêu cầu khách hàng)\nWBS_PharmaDash (tải lên sau khi hoàn thành Bài 2)\nQLDA_PharmaDash_LichDuAn.xlsx hoặc bản xuất PDF (tải lên sau Bài 3, 4 để dùng cho Bài 5)'],
    ['Quy ước chat', 'Mỗi bài một cuộc chat riêng: Bai1_Charter, Bai2_WBS, Bai3_Lich, Bai4_RuiRo, Bai5_PhanBien'],
  ]),
  H3('Nội dung Project Instructions đã dùng'),
  T([PORTRAIT_W], [[{ t: INSTRUCTIONS.join('\n'), fill: 'F4F6F9' }]], { header: false, size: 18 }),
  H3('Ảnh chụp màn hình'),
  TODO('Chèn ảnh chụp phần Instructions của Project'),
  TODO('Chèn ảnh chụp danh sách file Knowledge'),
  TODO('Chèn ảnh câu trả lời kiểm tra "Tóm tắt 5 yêu cầu chính của khách hàng trong tài liệu"'),
];

const part2 = [
  br(),
  H1('2. Project Charter (Tuyên bố dự án)'),
  T([2700, 6938], [
    ['Mục', 'Nội dung'],
    ['Tên dự án / Mã dự án', 'PharmaDash – Hệ thống Dashboard điều hành chuỗi nhà thuốc / PD-2026-01'],
    ['Nhà tài trợ (Sponsor) / Quản lý dự án (PM)', 'Chủ chuỗi Nhà thuốc Tâm An / Trưởng nhóm dự án'],
    ['Mục đích và lý do thực hiện (Business case)', 'Chủ nhà thuốc hiện mất khoảng 1 ngày/tháng tổng hợp báo cáo thủ công từ 2 chi nhánh; năm 2025 phải hủy khoảng 45 triệu đồng thuốc hết hạn do phát hiện muộn và thường hết hàng thuốc bán chạy vào mùa cảm cúm. PharmaDash tập trung số liệu bán hàng – tồn kho theo lô trên một màn hình, cảnh báo sớm hạn dùng và hết hàng, giúp giảm thất thoát và ra quyết định nhập hàng nhanh hơn.'],
    ['Ngân sách tổng', `250.000.000 đ (dự toán ${vnd(total)}, gồm 10% dự phòng – xem mục 5)`],
    ['Thời gian', 'Khởi động 05/10/2026 – go-live chậm nhất 31/12/2026 (64 ngày làm việc)'],
    ['Phê duyệt', 'Sponsor: ……………………   PM: ……………………   Ngày: …/…/2026'],
  ]),
  H2('2.1 Mục tiêu SMART'),
  T([500, 6338, 2800], [
    ['#', 'Mục tiêu', 'Đo lường / thời hạn'],
    ['1', 'Đưa PharmaDash vào vận hành tại 2 chi nhánh, hiển thị doanh thu – đơn hàng – lợi nhuận với độ trễ dữ liệu không quá 15 phút so với phần mềm bán hàng.', 'Go-live trước 31/12/2026; đo độ trễ khi UAT'],
    ['2', 'Giảm giá trị thuốc hết hạn phải hủy ít nhất 50% so với cùng kỳ năm 2025 nhờ cảnh báo hạn dùng 30/60/90 ngày.', 'So sánh quý I/2027 với quý I/2025'],
    ['3', 'Rút thời gian lập báo cáo doanh thu, tồn kho tháng từ khoảng 1 ngày xuống dưới 10 phút.', 'Từ kỳ báo cáo tháng 01/2027'],
    ['4', 'Hoàn thành dự án trong ngân sách 250 triệu đồng và đào tạo 100% người dùng (chủ, 2 quản lý, nhân viên).', 'Tại thời điểm nghiệm thu'],
  ]),
  P([{ t: 'Ghi chú: ', bold: true }, { t: 'yêu cầu khách hàng dùng cụm từ “gần như thời gian thực”; con số “15 phút” ở mục tiêu 1 là giả định, cần xác nhận lại với khách hàng (câu hỏi Q2).', italics: true }], { size: 19 }),
  H3('Rà soát SMART và viết lại'),
  T([500, 3000, 6138], [
    ['#', 'Điểm chưa đạt SMART', 'Mục tiêu viết lại'],
    ['1', 'M: con số “15 phút” là giả định, tài liệu chỉ ghi “gần như thời gian thực”.\nS: “vận hành” chưa nói rõ chức năng nào, cho ai.',
      'Đến 31/12/2026, 100% người dùng của 2 chi nhánh (chủ, 2 quản lý, nhân viên) sử dụng được các chức năng bắt buộc FR01–FR08; dữ liệu bán hàng trên PharmaDash trễ không quá ngưỡng thống nhất với khách hàng ở câu hỏi Q2 (đề xuất ≤ 15 phút), đo trong tuần UAT.'],
    ['2', 'A/R: kết quả “giảm 50% thuốc hủy” phụ thuộc cả việc nhân viên xử lý cảnh báo, chỉ đo được sau khi dự án kết thúc – đây là lợi ích kinh doanh, không phải mục tiêu dự án.\nM: tài liệu chỉ có số liệu cả năm 2025, không có số liệu quý.',
      'Mục tiêu dự án: trước go-live, hệ thống cảnh báo đúng 100% lô thuốc có hạn dùng ≤ 90 ngày trong dữ liệu đã chuyển đổi (đối soát với file kiểm kê).\nChỉ tiêu lợi ích (chuyển sang mục 2.8): giá trị thuốc hết hạn phải hủy năm 2027 ≤ 22,5 triệu đồng (giảm 50% so với 45 triệu năm 2025).'],
    ['4', 'S: gộp 2 mục tiêu khác nhau (ngân sách và đào tạo).\nM: “đào tạo 100%” chưa có cách đo.',
      '4a. Tổng chi phí thực tế khi nghiệm thu ≤ 250 triệu đồng; chênh lệch so với dự toán theo dõi hằng tuần không vượt ±10%.\n4b. Trước 31/12/2026, toàn bộ người dùng (chủ, 2 quản lý, nhân viên) hoàn thành buổi đào tạo và tự thực hiện đúng 5 thao tác cơ bản (xem KPI, tra tồn kho theo lô, xem cảnh báo, lọc đơn, xuất báo cáo).'],
  ], { size: 18 }),
  P('Mục tiêu 3 giữ nguyên: đã có số liệu gốc trong tài liệu (khoảng 1 ngày), con số đích (dưới 10 phút) và thời hạn.', { italics: true, size: 19 }),
  H2('2.2 Phạm vi'),
  T([4819, 4819], [
    ['Trong phạm vi (In scope)', 'Ngoài phạm vi (Out of scope)'],
    ['• Dashboard tổng quan: KPI, biểu đồ doanh thu, top thuốc, doanh thu theo nhóm (FR01–FR02)\n• Tồn kho theo lô, cảnh báo hạn dùng / hết hàng (FR03–FR04)\n• Tra cứu hóa đơn, lọc theo ngày / nhân viên / thanh toán (FR05)\n• Nhập hàng, nhà cung cấp (FR06)\n• Báo cáo Excel/CSV, PDF (FR07)\n• Phân quyền 3 vai trò (FR08)\n• Khách hàng thân thiết, doanh số và ca nhân viên (FR09–FR10)\n• Đồng bộ dữ liệu từ phần mềm bán hàng, chuyển đổi dữ liệu cũ\n• Đào tạo người dùng, hỗ trợ 2 tuần sau go-live',
     '• Thay thế phần mềm bán hàng tại quầy (POS)\n• Ứng dụng di động riêng, đặt hàng tự động với NCC (FR12 – giai đoạn sau)\n• Tích hợp phần mềm kế toán, hóa đơn điện tử (chờ khách trả lời Q9)\n• Bảo trì dài hạn sau 2 tuần hỗ trợ\n• FR11 (lịch chung, giao diện tối) chỉ làm nếu còn thời gian'],
  ]),
  H3('Đối chiếu phạm vi với tài liệu yêu cầu'),
  ...bullets([
    'Bản nháp AI tự thêm mục “bán hàng online / website thương mại điện tử” vào ngoài phạm vi dù tài liệu không hề nhắc tới → đã bỏ, vì liệt kê thứ khách hàng không yêu cầu chỉ gây nhiễu.',
    '“Tích hợp phần mềm kế toán, hóa đơn điện tử” cũng không có trong tài liệu → giữ ở ngoài phạm vi nhưng ghi chú chờ khách trả lời Q9, vì đây là nhu cầu phổ biến của nhà thuốc.',
    '“Hỗ trợ 2 tuần sau go-live” là giả định của bản nháp, tài liệu không quy định → cần xác nhận với khách hàng khi duyệt Charter.',
    'Yêu cầu phi chức năng “sao lưu hằng ngày, sẵn sàng 7h–22h” chưa xuất hiện trong phạm vi → đã có ở gói WBS 7.1.1 và tiêu chí nghiệm thu nên giữ nguyên.',
    'Không có yêu cầu nào trong tài liệu (FR01–FR12) bị bỏ sót.',
  ], { size: 20 }),
  H2('2.3 Sản phẩm bàn giao chính'),
  ...bullets(['Hệ thống web PharmaDash chạy trên máy chủ, có dữ liệu thật của 2 chi nhánh', 'Mã nguồn và tài liệu kỹ thuật (kiến trúc, CSDL, API)', 'Tài liệu SRS, kế hoạch và kết quả kiểm thử, biên bản UAT', 'Hướng dẫn sử dụng theo vai trò; 2 buổi đào tạo']),
  H2('2.4 Các bên liên quan'),
  T([2600, 4238, 2800], [
    ['Bên liên quan', 'Vai trò / quan tâm', 'Mức ảnh hưởng'],
    ['Chủ chuỗi nhà thuốc (Sponsor)', 'Phê duyệt phạm vi, ngân sách; xem demo hằng tháng; ký nghiệm thu', 'Cao'],
    ['Quản lý 2 chi nhánh', 'Người dùng chính; cung cấp yêu cầu; tham gia UAT', 'Cao'],
    ['Nhân viên bán hàng / dược sĩ', 'Người dùng hằng ngày; tra cứu tồn kho, doanh số cá nhân', 'Trung bình'],
    ['Dược sĩ phụ trách chuyên môn', 'Tư vấn quy định dược (GPP, thuốc kê đơn), làm sạch dữ liệu thuốc', 'Trung bình'],
    ['Nhà cung cấp phần mềm bán hàng', 'Cung cấp dữ liệu / API để đồng bộ', 'Cao (ảnh hưởng tiến độ)'],
    ['Nhà cung cấp hosting', 'Máy chủ, sao lưu', 'Thấp'],
    ['Đội dự án (PM, BA, BE, FE, QA)', 'Lập kế hoạch, phát triển, kiểm thử, triển khai', 'Cao'],
  ]),
  H2('2.5 Mốc thời gian chính (mục tiêu)'),
  T([1100, 5138, 1700, 1700], [
    ['Mốc', 'Nội dung', 'Mục tiêu', 'Theo PERT gốc'],
    ['M0', 'Khởi động dự án, Charter được phê duyệt', '05/10/2026', '12/10/2026'],
    ['M1', 'SRS được khách hàng phê duyệt', '28/10/2026', A.find((a) => a.id === 'C').end],
    ['Demo 1', 'Thiết kế giao diện + prototype', '30/10/2026', '—'],
    ['Demo 2', 'Dashboard tổng quan + kho thuốc chạy với dữ liệu mẫu', '27/11/2026', '—'],
    ['M2', 'Hoàn thành phát triển, bắt đầu kiểm thử hệ thống', '04/12/2026', A.find((a) => a.id === 'J').end],
    ['Demo 3 / M3', 'UAT và nghiệm thu', '23/12/2026', A.find((a) => a.id === 'N').end],
    ['M4', 'Go-live, đào tạo xong', '31/12/2026', D.end],
  ]),
  P([{ t: 'Nhận xét: ', bold: true }, { t: `lịch PERT gốc (mục 4) kết thúc ngày ${D.end}, trễ ${fmt(D.T - 64)} ngày làm việc so với mục tiêu. Sau khi nén lịch (mục 4.5), ngày kết thúc dự kiến là ${SC.end}, kịp hạn 31/12/2026.` }], { size: 19 }),
  H2('2.6 Giả định và ràng buộc'),
  T([4819, 4819], [
    ['Giả định (Assumptions)', 'Ràng buộc (Constraints)'],
    ['• Phần mềm bán hàng hiện tại cho phép xuất dữ liệu (API hoặc file)\n• Khách hàng cử 1 đầu mối trả lời yêu cầu trong 2 ngày làm việc\n• Dữ liệu tồn kho cũ có đủ số lô và hạn dùng\n• Đội 5 người làm toàn thời gian, không thay đổi nhân sự\n• Đơn giá nhân công theo giả định ở mục 5',
     '• Ngân sách tối đa 250 triệu đồng\n• Go-live trước 31/12/2026 (64 ngày làm việc)\n• Đội cố định 5 người\n• Demo cho Sponsor cuối mỗi tháng\n• Phải chuyển dữ liệu 2 năm và khoảng 1.200 mặt hàng'],
  ]),
  H2('2.7 Rủi ro cấp cao'),
  ...bullets(['Không đồng bộ được dữ liệu từ phần mềm bán hàng hiện tại (R01)', 'Lịch gốc dài hơn thời hạn (R02)', 'Phình phạm vi sau các buổi demo (R03)', 'Dữ liệu cũ thiếu / sai lô và hạn dùng (R04)']),
  H2('2.8 Tiêu chí thành công và nghiệm thu'),
  ...bullets([
    'Go-live trước 31/12/2026; chi phí thực tế ≤ 250 triệu đồng',
    '100% test case mức ưu tiên Cao đạt trong UAT; không còn lỗi nghiêm trọng',
    'Chênh lệch tồn kho giữa hệ thống và kiểm kê thực tế < 1% số mặt hàng',
    '100% người dùng được đào tạo; khảo sát hài lòng sau 1 tháng ≥ 4/5',
    'Chỉ tiêu lợi ích (đo sau dự án): giá trị thuốc hết hạn phải hủy năm 2027 ≤ 22,5 triệu đồng (giảm 50% so với năm 2025)',
  ]),
  H2('2.9 Thông tin còn thiếu – câu hỏi làm rõ với khách hàng'),
  T([700, 5638, 3300], [
    ['#', 'Câu hỏi', 'Ảnh hưởng tới'],
    ['Q1', 'Phần mềm bán hàng đang dùng là phần mềm nào? Có API hoặc xuất dữ liệu tự động không, tần suất bao lâu?', 'Kiến trúc, WBS 4.4.1, rủi ro R01'],
    ['Q2', '“Gần như thời gian thực” cụ thể là trễ tối đa bao nhiêu phút là chấp nhận được?', 'Mục tiêu SMART 1, thiết kế đồng bộ'],
    ['Q3', 'Có bao nhiêu tài khoản người dùng? Dược sĩ phụ trách chuyên môn cần quyền gì?', 'Phân quyền, đào tạo'],
    ['Q4', 'Dữ liệu cũ ở định dạng nào, ai chịu trách nhiệm làm sạch và xác nhận?', 'WBS 4.4.2, rủi ro R04'],
    ['Q5', 'Hạ tầng: thuê máy chủ ngoài hay đặt tại cửa hàng? Ai chi trả chi phí từ năm thứ hai?', 'Chi phí, triển khai'],
    ['Q6', 'Có quy định GPP / Sở Y tế nào về lưu trữ, báo cáo thuốc kê đơn mà hệ thống phải đáp ứng?', 'Phạm vi, rủi ro R09'],
    ['Q7', 'Có kế hoạch mở thêm chi nhánh trong 1–2 năm tới không?', 'Kiến trúc, khả năng mở rộng'],
    ['Q8', 'Ai là người ký nghiệm thu? Tiêu chí nghiệm thu cụ thể là gì?', 'Kết thúc dự án'],
    ['Q9', 'Có cần kết nối phần mềm kế toán hoặc hóa đơn điện tử không?', 'Phạm vi (hiện để ngoài phạm vi)'],
  ]),
  H3('3 câu hỏi quan trọng nhất'),
  T([700, 8938], [
    ['#', 'Lý do ưu tiên'],
    ['Q1', 'Quyết định khả thi của cả dự án: nếu phần mềm bán hàng không cho lấy dữ liệu, dashboard không có số liệu thật. Liên quan trực tiếp rủi ro R01 (điểm cao nhất 20) và gói 4.4.1 (60 giờ). Câu trả lời có thể đổi kiến trúc (API tự động hay nhập file theo ca).'],
    ['Q2', 'Không có câu trả lời thì mục tiêu SMART số 1 không đo được và không nghiệm thu được. Ngưỡng trễ cũng quyết định cách thiết kế đồng bộ: vài phút thì phải đồng bộ liên tục, cuối ca thì nhập file là đủ – chênh lệch đáng kể về giờ công.'],
    ['Q4', 'Giá trị cốt lõi của hệ thống là cảnh báo hạn dùng theo lô. Nếu dữ liệu cũ thiếu số lô, hạn dùng thì cảnh báo sai ngay từ ngày đầu (rủi ro R04). Cần biết sớm để lập kế hoạch làm sạch dữ liệu và xác định ai chịu trách nhiệm xác nhận số liệu.'],
  ], { size: 19 }),
];

const dict = [
  { code: '4.4.1', name: 'Đồng bộ dữ liệu bán hàng từ phần mềm bán hàng hiện có', desc: 'Xây dựng bộ đồng bộ đọc hóa đơn và dòng hàng từ phần mềm bán hàng (qua API hoặc file xuất), chuẩn hóa mã thuốc, ghi vào CSDL PharmaDash theo chu kỳ.', out: 'Bộ đồng bộ chạy tự động; nhật ký đồng bộ; tài liệu cấu hình', acc: 'Dữ liệu 1 ngày bán hàng khớp 100% tổng tiền và số hóa đơn với phần mềm bán hàng; độ trễ ≤ thời gian đã thống nhất (Q2)', owner: 'BE', hours: 60, dep: '4.1.1, 2.1.2; phụ thuộc bên ngoài: nhà cung cấp phần mềm bán hàng', risk: 'R01, R04' },
  { code: '5.2.1', name: 'Trang Tổng quan (dashboard)', desc: 'Giao diện 4 thẻ KPI có so sánh kỳ trước, biểu đồ doanh thu nhiều khoảng thời gian, lịch làm việc, top thuốc, cảnh báo tồn kho, doanh thu theo nhóm; tự làm mới dữ liệu.', out: 'Trang Tổng quan hoàn chỉnh, responsive, theo phân quyền', acc: 'Số liệu khớp API; tải trang < 2 giây; nhân viên không thấy lợi nhuận; hiển thị đúng trên màn hình 1024px', owner: 'FE', hours: 56, dep: '5.1.1, 5.1.2, 4.2.1, 3.2.2', risk: 'R02, R08' },
  { code: '6.2.1', name: 'Kiểm thử chức năng', desc: 'Thực hiện bộ test case chức năng cho toàn bộ các trang và API, ghi nhận lỗi, kiểm tra lại sau khi sửa.', out: 'Báo cáo kết quả kiểm thử, danh sách lỗi có mức độ', acc: '100% test case được chạy; 100% test case mức Cao đạt; không còn lỗi mức Nghiêm trọng', owner: 'QA', hours: 64, dep: '6.1.1, 5.2.x, 4.2.x', risk: 'R02' },
];
const part3 = [
  br(),
  H1('3. Phạm vi và WBS'),
  P(`WBS theo hướng sản phẩm bàn giao, 3 cấp, gồm 7 hạng mục cấp 1, ${wpCount} gói công việc (work package). Tổng ${totalHours.toLocaleString('vi-VN')} giờ công. Kiểm tra trong file Excel (sheet WBS): tổng giờ cấp 1 = tổng giờ các gói (quy tắc 100%), không gói nào vi phạm quy tắc 8/80 (mọi gói từ 8 đến 80 giờ). WBS đã có đủ các hạng mục quản lý dự án (1.0), kiểm thử (6.0), triển khai và đào tạo (7.0).`),
];
// Sơ đồ cây đặt ở trang ngang để đọc được đủ 3 cấp
const part3tree = [
  H2('3.1 Sơ đồ cây WBS'),
  img('wbs_tree.png', 960, 357),
  caption('Hình 3.1 – Sơ đồ cây WBS 3 cấp (cấp 1 nằm ngang; cấp 2, cấp 3 xếp dọc dưới mỗi nhánh; h = giờ công)'),
];
const part3b = [
  H2('3.2 Bảng WBS'),
  T([700, 3538, 3200, 700, 1500], [['Mã WBS', 'Tên hạng mục / gói công việc', 'Sản phẩm bàn giao', 'Vai trò', 'Giờ công'], ...wbsRows, [{ t: '' }, { t: 'TỔNG', bold: true }, '', '', { t: totalHours.toLocaleString('vi-VN'), bold: true, align: R }]], { size: 17 }),
  P('Giờ công là giả định (ước lượng chuyên gia – expert judgment) cho đội có kinh nghiệm trung bình.', { italics: true, size: 18 }),
  H2('3.3 Từ điển WBS (3 gói công việc quan trọng nhất)'),
  ...dict.flatMap((d) => [
    H3(`${d.code} – ${d.name}`),
    T([2400, 7238], [
      ['Trường', 'Nội dung'],
      ['Mô tả công việc', d.desc], ['Sản phẩm bàn giao', d.out], ['Tiêu chí chấp nhận', d.acc],
      ['Người phụ trách', d.owner], ['Ước lượng', `${d.hours} giờ công`], ['Phụ thuộc', d.dep], ['Rủi ro liên quan', d.risk],
    ], { keep: true }),
  ]),
];

const part4 = [
  H1('4. Ước lượng, lịch dự án và đường găng'),
  P('Chọn 15 hoạt động chính từ WBS. Ước lượng 3 điểm PERT, đơn vị ngày làm việc (T2–T6), ngày làm việc thứ 1 là 05/10/2026. Công thức: TE = (O + 4M + P) / 6; σ = (P − O) / 6. Toàn bộ phần tính được lập bằng công thức trong file Excel (sheet PERT, Gantt) – sửa O/M/P thì lịch tự tính lại.'),
  H2('4.1 Bảng PERT và CPM'),
  T([560, 3800, 900, 520, 520, 520, 820, 700, 820, 820, 820, 820, 800, 1150, 1000].map((w) => Math.round(w * LAND_W / 14590)).map((w, i, arr) => (i === arr.length - 1 ? LAND_W - arr.slice(0, -1).reduce((s, x) => s + x, 0) : w)), [
    ['Mã', 'Hoạt động', 'Trước', 'O', 'M', 'P', 'TE', 'σ²', 'ES', 'EF', 'LS', 'LF', 'Slack', 'Bắt đầu', 'Kết thúc'],
    ...A.map((a) => {
      const f = a.crit ? 'FCE4E4' : undefined;
      return [{ t: a.id, bold: true, fill: f, align: C }, { t: a.name, fill: f }, { t: a.pred.join(', ') || '—', fill: f, align: C }, { t: a.o, fill: f, align: C }, { t: a.m, fill: f, align: C }, { t: a.p, fill: f, align: C },
        { t: fmt(a.te), fill: f, align: R, bold: true }, { t: fmt(a.var), fill: f, align: R }, { t: fmt(a.es), fill: f, align: R }, { t: fmt(a.ef), fill: f, align: R }, { t: fmt(a.ls), fill: f, align: R }, { t: fmt(a.lf), fill: f, align: R }, { t: fmt(a.slack), fill: f, align: R, bold: a.crit }, { t: a.start, fill: f, align: C }, { t: a.end, fill: f, align: C }];
    }),
  ], { size: 17 }),
  P('Hàng tô hồng: hoạt động găng (Slack = 0).', { italics: true, size: 18 }),
  H2('4.2 Kết quả'),
  T([5200, 9370], [
    ['Chỉ tiêu', 'Giá trị'],
    ['Đường găng', crit],
    ['Thời gian dự án kỳ vọng T', `${fmt(D.T)} ngày làm việc (kết thúc dự kiến ${D.end})`],
    ['Σσ² đường găng / độ lệch chuẩn σ', `${fmt(D.sumvar)} / ${fmt(D.sigma)} ngày`],
    ['Số ngày làm việc tới hạn chót 31/12/2026', '64 ngày'],
    ['Chênh lệch', `Trễ ${fmt(D.T - 64)} ngày làm việc (khoảng 2,3 tuần)`],
    ['Z = (64 − T)/σ ; xác suất kịp hạn', `Z = ${fmt(D.z)} ; P ≈ ${(D.prob * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}% – gần như không thể kịp nếu giữ nguyên kế hoạch`],
    ['Đường gần găng', 'A → B → C → D → F → G → K → M → N → O, slack chỉ 0,5 ngày: nếu rút ngắn đường găng quá 0,5 ngày thì đường này trở thành găng.'],
  ]),
  H2('4.3 Biểu đồ Gantt'),
  img('gantt.png', 960, 181),
  caption('Hình 4.1 – Gantt lấy từ sheet Gantt (đỏ: hoạt động găng; cột cam: 31/12/2026, ngày làm việc thứ 64)'),
  H2('4.4 So sánh kết quả Excel với câu trả lời của AI (Claude Project)'),
  TODO('Nhập TE mà Claude trả lời trong chat Bai3_Lich vào cột “TE theo AI” của sheet PERT, rồi ghi lại các chỗ khác biệt (sai số học, hiểu sai quan hệ phụ thuộc, sai đường găng...) vào bảng dưới'),
  T([1500, 4500, 4500, 4070], [['Mục', 'Kết quả của AI', 'Kết quả Excel', 'Nhận xét / nguyên nhân'], ...[1, 2, 3].map(() => [{ t: '…', todo: true }, { t: '…', todo: true }, { t: '…', todo: true }, { t: '…', todo: true }])]),
  H2('4.5 Phương án nén lịch (AI gợi ý – nhóm tự chọn và lý giải)'),
  T([700, 3600, 1500, 3400, 5370].map((w) => Math.round(w * LAND_W / 14570)), [
    ['#', 'Phương án', 'Loại', 'Ước tính rút ngắn / chi phí', 'Rủi ro / lưu ý'],
    ['1', 'Làm màn hình nghiệp vụ (J) song song với khung giao diện (I) từ khi I xong khoảng 50%, dùng mockup và API giả lập', 'Fast-tracking', '≈ 3,5 ngày; không tốn thêm tiền', 'Phải sửa lại nếu component thay đổi; tăng phối hợp FE'],
    ['2', 'Kiểm thử theo từng module (M) chồng lên 5 ngày cuối của J', 'Fast-tracking', '≈ 5 ngày; không tốn thêm tiền', 'Nhiều vòng kiểm thử hồi quy hơn; QA phải sẵn sàng sớm'],
    ['3', 'Bắt đầu thiết kế giao diện (E) khi SRS xong khoảng 70%', 'Fast-tracking', '≈ 2 ngày', 'SRS thay đổi thì mockup phải làm lại'],
    ['4', 'Thuê thêm 1 lập trình viên frontend bán thời gian cho J (khoảng 160 giờ)', 'Crashing', '≈ 5 ngày; khoảng 24 triệu đồng', 'Vượt phần “còn lại” 9 triệu, phải dùng quỹ dự phòng; mất thời gian làm quen dự án'],
    ['5', 'Dời FR09–FR10 (khách hàng, nhân viên) sang giai đoạn 2', 'Giảm phạm vi', '≈ 3–4 ngày ở J và G', 'Cần Sponsor đồng ý; ảnh hưởng mục tiêu người dùng'],
  ], { size: 18 }),
  P('Lưu ý khi chọn phương án: cần rút ngắn ít nhất 11,33 ngày. Khi rút ngắn nhánh J quá 0,5 ngày, nhánh G → K sẽ trở thành găng, nên phải tính lại toàn bộ đường găng (sửa O/M/P hoặc quan hệ trước – sau trong file Excel để kiểm chứng).', { size: 19 }),
  H3('Phương án chọn: kết hợp phương án 1, 2, 3, 5 và thêm 2 điểm fast-tracking (không dùng crashing)'),
  T([700, 4700, 1500, 1500, 1200, 4970].map((w) => Math.round(w * LAND_W / 14570)), [
    ['Mã', 'Hoạt động', 'TE gốc', 'TE mới', 'Chồng lấn', 'Thay đổi'],
    ...SC.rows.filter((r) => r.note).map((r) => [{ t: r.id, bold: true, align: C }, r.name, { t: fmt((r.o0 + 4 * r.m0 + r.p0) / 6), align: R }, { t: fmt(r.te), align: R, bold: true }, { t: r.ov ? `${fmt(r.ov, 1)} ngày` : '—', align: C }, r.note]),
  ], { size: 17 }),
  P('Cách mô hình trong Excel (sheet NenLich): “chồng lấn” = số ngày hoạt động được bắt đầu sớm trước khi hoạt động trước kết thúc; ES = MAX(0; MAX(EF trước) − chồng lấn).', { italics: true, size: 18 }),
  T([5200, 9370], [
    ['Kết quả (tính lại bằng Excel)', 'Giá trị'],
    ['T gốc → T sau khi nén', `${fmt(D.T)} → ${fmt(SC.T)} ngày làm việc (rút ngắn ${fmt(D.T - SC.T)} ngày)`],
    ['Đường găng mới', SC.crit.join(' → ')],
    ['Độ lệch chuẩn σ / dự trữ so với hạn', `${fmt(SC.sigma)} ngày / ${fmt(64 - SC.T)} ngày`],
    ['Xác suất kịp hạn 31/12/2026', `≈ ${(SC.prob * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% (lịch gốc: ≈ ${(D.prob * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%)`],
    ['Ngày kết thúc dự kiến', SC.end],
    ['Chi phí phát sinh', 'Không (không thuê thêm người)'],
  ]),
  H3('Lý do chọn'),
  ...bullets([
    'Ngân sách chỉ còn dư khoảng 9 triệu. Crashing (phương án 4, khoảng 24 triệu) phải lấy quỹ dự phòng – quỹ này cần giữ cho rủi ro R01 (điểm cao nhất). Người mới vào giữa dự án còn mất thời gian làm quen (định luật Brooks).',
    'FR09–FR10 được tài liệu xếp “Nên có”, không phải “Bắt buộc” → dời sang giai đoạn 2 ít ảnh hưởng nhất tới mục tiêu chính (cảnh báo hạn dùng, báo cáo nhanh).',
    'Chỉ fast-tracking thì chưa đủ: nén riêng nhánh J sẽ làm nhánh G → K (slack gốc 0,5 ngày) trở thành găng. Vì vậy phải nén cả nhánh backend (D, G, K) – kết quả Excel xác nhận đường găng mới đi qua D → F → G → K.',
    'Sau khi nén vẫn còn dự trữ khoảng 2 ngày và xác suất kịp hạn khoảng 74% – chấp nhận được, kết hợp theo dõi sát hằng tuần.',
  ], { size: 19 }),
  H3('Rủi ro của phương án và cách kiểm soát'),
  ...bullets([
    'Làm việc song song dễ phải làm lại (rework): chốt SRS phần lõi FR01–FR08 trước khi bắt đầu D, E; khóa API contract trước khi FE dùng API giả lập.',
    'Kiểm thử theo module tăng số vòng kiểm thử hồi quy: QA lập test case cho từng module ngay từ hoạt động L (đang dư slack khoảng 23 ngày).',
    'Dời FR09–FR10 cần Sponsor đồng ý: trình bày trong buổi demo tháng 10; nếu Sponsor không đồng ý thì phương án dự phòng là crashing với quỹ dự phòng.',
    'Dự trữ chỉ khoảng 2 ngày: PM theo dõi slack của nhánh G → K hằng tuần; nếu G trễ quá 1 ngày thì kích hoạt phương án crashing.',
  ], { size: 19 }),
];

const part5 = [
  H1('5. Ước lượng chi phí'),
  P('Chi phí nhân công = giờ công theo WBS × đơn giá theo vai trò. Đơn giá là giả định (chi phí công ty trả cho 1 giờ công, gồm lương và bảo hiểm), không phải báo giá thật.'),
  T([1400, 3238, 1700, 1500, 1800], [
    ['Vai trò', 'Diễn giải', 'Đơn giá (đ/giờ)', 'Giờ công', 'Thành tiền'],
    ...D.rates.map(([r, d, rate]) => [{ t: r, bold: true }, d, { t: rate.toLocaleString('vi-VN'), align: R }, { t: roleHours[r].toLocaleString('vi-VN'), align: R }, { t: vnd(rate * roleHours[r]), align: R }]),
    [{ t: 'Cộng nhân công', bold: true }, '', '', { t: totalHours.toLocaleString('vi-VN'), bold: true, align: R }, { t: vnd(labor), bold: true, align: R }],
    ...D.other.map(([n, d, q, p]) => [{ t: n, bold: true }, d, { t: p.toLocaleString('vi-VN'), align: R }, { t: `× ${q}`, align: R }, { t: vnd(q * p), align: R }]),
    [{ t: 'Chi phí trực tiếp', bold: true }, '', '', '', { t: vnd(direct), bold: true, align: R }],
    [{ t: 'Dự phòng 10%', bold: true }, 'Quỹ dự phòng rủi ro (contingency reserve)', '', '', { t: vnd(cont), align: R }],
    [{ t: 'TỔNG DỰ TOÁN', bold: true, fill: 'D9E2F3' }, { t: '', fill: 'D9E2F3' }, { t: '', fill: 'D9E2F3' }, { t: '', fill: 'D9E2F3' }, { t: vnd(total), bold: true, align: R, fill: 'D9E2F3' }],
    [{ t: 'Ngân sách', bold: true }, '', '', '', { t: vnd(D.budget), align: R }],
    [{ t: 'Còn lại', bold: true }, `Sử dụng ${(total / D.budget * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% ngân sách`, '', '', { t: vnd(D.budget - total), bold: true, align: R }],
  ]),
  P([{ t: 'Nhận xét: ', bold: true }, { t: 'dự toán nằm trong ngân sách nhưng biên còn lại mỏng (khoảng 9 triệu). Phương án crashing số 4 ở mục 4.5 (khoảng 24 triệu) sẽ phải dùng tới quỹ dự phòng – cần Sponsor phê duyệt.' }], { size: 19 }),
  P('Khối lượng công việc: BE khoảng 460 giờ và FE khoảng 444 giờ trên tổng khoảng 512 giờ khả dụng mỗi người trong 64 ngày – gần đầy tải (xem rủi ro R05).', { size: 19 }),
];

const part6 = [
  H1('6. Quản lý rủi ro'),
  P('Mỗi rủi ro được mô tả theo cấu trúc Nguyên nhân – Sự kiện – Hậu quả. Xác suất (XS) và tác động (TĐ) chấm thang 1–5; Điểm = XS × TĐ (≥ 15: Cao; 8–14: Trung bình; < 8: Thấp). Bảng sắp theo điểm giảm dần.'),
  T([560, 2250, 1900, 2050, 1200, 450, 450, 600, 1000, 3000, 1110], [
    ['ID', 'Nguyên nhân', 'Sự kiện', 'Hậu quả', 'Nhóm', 'XS', 'TĐ', 'Điểm', 'Chiến lược', 'Hành động ứng phó', 'Phụ trách'],
    ...risks.map((k) => [{ t: k.id, bold: true }, k.cause, k.event, k.impact, k.group, { t: k.xs, align: C }, { t: k.td, align: C }, { t: `${k.xs * k.td}\n${level(k.xs * k.td)}`, bold: true, align: C, fill: lvFill(k.xs * k.td) }, k.strategy, k.action, k.owner]),
    ...['R11', 'R12'].map((id) => [{ t: id, bold: true }, ...Array.from({ length: 10 }, (_, i) => ({ t: i === 0 ? 'rủi ro nhóm tự bổ sung' : '…', todo: true }))]),
  ], { size: 16 }),
  P('Theo yêu cầu bài lab, R11–R12 là rủi ro nhóm tự bổ sung từ kinh nghiệm làm đồ án (AI không nêu).', { italics: true, size: 18 }),
];
const part6b = [
  H2('6.1 Ma trận xác suất – tác động'),
  img('matran.png', 560, 233),
  caption('Hình 6.1 – Ma trận 5×5 lấy từ sheet MaTran (tự cập nhật khi thêm R11, R12)'),
  H2('6.2 Kế hoạch dự phòng cho rủi ro điểm cao nhất – R01'),
  T([2400, 7238], [
    ['Hạng mục', 'Nội dung'],
    ['Rủi ro', 'R01 – Không đồng bộ được dữ liệu từ phần mềm bán hàng hiện tại (Điểm 20 – Cao)'],
    ['Dấu hiệu kích hoạt (trigger)', 'Hết tuần khảo sát (hoạt động B, khoảng 20/10/2026) mà nhà cung cấp phần mềm bán hàng không xác nhận có API; hoặc thử nghiệm xuất dữ liệu thất bại 2 lần'],
    ['Phương án B', 'Đồng bộ qua file: phần mềm bán hàng xuất Excel/CSV theo lịch (mỗi 15 phút hoặc cuối ca) vào một thư mục chia sẻ; PharmaDash tự đọc file mới và nhập dữ liệu'],
    ['Phương án C', 'Nếu không tự động được: quản lý chi nhánh tải file lên hệ thống cuối mỗi ca bằng chức năng “Nhập dữ liệu”'],
    ['Tác động tới kế hoạch', 'Hoạt động H kéo dài thêm tối đa 5 ngày (H đang có slack khoảng 11,7 ngày nên chưa ảnh hưởng đường găng); mục tiêu SMART 1 có thể phải đổi từ “15 phút” sang “cuối ca”'],
    ['Chi phí dự phòng', 'Tối đa 40 giờ BE × 160.000 đ = 6,4 triệu đồng, lấy từ quỹ dự phòng'],
    ['Người phụ trách / báo cáo', 'BE thực hiện, BA làm việc với nhà cung cấp; PM báo cáo Sponsor trong 1 ngày làm việc kể từ khi kích hoạt'],
  ]),
  TODO('Nhóm rà soát lại kế hoạch dự phòng, và viết kế hoạch dự phòng cho rủi ro nhóm tự bổ sung nếu điểm cao hơn'),
];

const part7 = [
  br(),
  H1('7. Phản biện đầu ra AI'),
  P('Trong chat “Bai5_PhanBien”, yêu cầu Claude đóng vai Chủ chuỗi nhà thuốc (Sponsor) khó tính, đọc Charter, WBS, lịch, Risk Register trong Knowledge và đặt 5 câu hỏi chất vấn khó nhất. Theo quy định bài lab, câu trả lời do nhóm TỰ VIẾT, không nhờ AI.'),
  T([600, 4200, 4838], [['#', 'Câu hỏi của Sponsor (dán từ Claude)', 'Câu trả lời của nhóm (tự viết)'], ...[1, 2, 3, 4, 5].map((i) => [String(i), { t: 'câu hỏi', todo: true }, { t: 'câu trả lời có lập luận, dẫn số liệu từ kế hoạch', todo: true }])]),
  H2('7.1 Phản tư'),
  P('AI đã giúp nhóm nhanh hơn ở bước nào? AI sai hoặc thiếu ở đâu?', { bold: true }),
  TODO('trả lời'),
  P('Theo nhóm, những quyết định nào trong quản lý dự án không nên giao cho AI? Vì sao?', { bold: true }),
  TODO('trả lời'),
  H1('8. Nhật ký sử dụng AI'),
  P('Ghi rõ phần nào do AI gợi ý, phần nào nhóm tự làm (quy định sử dụng AI có trách nhiệm).'),
  T([600, 1100, 3600, 2169, 2169], [
    ['STT', 'Bài', 'Prompt đã dùng (tóm tắt)', 'AI trả lời tốt ở điểm nào', 'Nhóm đã sửa / bổ sung gì'],
    ['0', 'Chuẩn bị', 'Claude Code (trong VS Code): tạo tài liệu yêu cầu khách hàng, bản nháp Charter, WBS, PERT, dự toán, Risk Register và file Excel có công thức cho dự án PharmaDash', { t: '…', todo: true }, { t: '…', todo: true }],
    ['0b', 'Bài 1–3', 'Claude Code: rà soát và viết lại mục tiêu SMART (1, 2, 4), đối chiếu phạm vi, chọn 3 câu hỏi ưu tiên, vẽ sơ đồ cây WBS, đề xuất phương án nén lịch và lập sheet NenLich', { t: '…', todo: true }, { t: '…', todo: true }],
    ['1', 'Bài 1', 'Soạn Project Charter theo 8 mục từ tài liệu trong Knowledge, liệt kê thông tin còn thiếu', { t: '…', todo: true }, { t: '…', todo: true }],
    ['2', 'Bài 2', 'Xây dựng WBS 3 cấp, bảng Mã | Tên | Sản phẩm | Giờ công, tuân thủ 100% và 8/80, từ điển WBS', { t: '…', todo: true }, { t: '…', todo: true }],
    ['3', 'Bài 3', 'Chọn 12–15 hoạt động, ước lượng O/M/P, TE, đường găng, độ lệch chuẩn', { t: '…', todo: true }, { t: '…', todo: true }],
    ['4', 'Bài 4', 'Lập Risk Register ≥ 8 rủi ro, cấu trúc Nguyên nhân – Sự kiện – Hậu quả, sắp theo điểm', { t: '…', todo: true }, { t: '…', todo: true }],
    ['5', 'Bài 5', 'Đóng vai Sponsor khó tính, đặt 5 câu hỏi chất vấn', { t: '…', todo: true }, { t: '…', todo: true }],
    ['6', { t: '…', todo: true }, { t: '…', todo: true }, { t: '…', todo: true }, { t: '…', todo: true }],
  ], { size: 18 }),
];

const report = new Document({
  styles, numbering,
  features: { updateFields: true },
  sections: [
    { properties: portrait, footers: { default: footer }, children: [...cover, ...part1, ...part2, ...part3] },
    { properties: landscape, footers: { default: footer }, children: part3tree },
    { properties: portrait, footers: { default: footer }, children: part3b },
    { properties: landscape, footers: { default: footer }, children: part4 },
    { properties: portrait, footers: { default: footer }, children: part5 },
    { properties: landscape, footers: { default: footer }, children: part6 },
    { properties: portrait, footers: { default: footer }, children: [...part6b, ...part7] },
  ],
});

(async () => {
  fs.writeFileSync(path.join(OUT_DIR, 'PharmaDash_YeuCauKhachHang.docx'), await Packer.toBuffer(knowledge));
  fs.writeFileSync(path.join(OUT_DIR, 'QLDA_Nhom_PharmaDash_Lab.docx'), await Packer.toBuffer(report));
  console.log('ok');
})();
