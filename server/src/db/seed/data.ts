/**
 * Dữ liệu tham chiếu cho seed. Tên thuốc là các sản phẩm phổ biến tại
 * nhà thuốc Việt Nam; giá bán mang tính minh họa (VND), không phải giá thật.
 * Nhà thuốc, chi nhánh, nhà cung cấp, con người đều là hư cấu.
 */

export const PHARMACY_NAME = 'Nhà thuốc Hữu Duyên';

export const BRANCHES = [
  { name: 'CN Cầu Giấy', address: '112 Trần Duy Hưng, Cầu Giấy, Hà Nội', capacity: 16000 },
  { name: 'CN Đống Đa', address: '45 Tây Sơn, Đống Đa, Hà Nội', capacity: 12000 },
];

export const CATEGORIES = [
  'Giảm đau - Hạ sốt',
  'Kháng sinh',
  'Ho - Cảm cúm',
  'Tiêu hóa',
  'Vitamin - Khoáng chất',
  'Tim mạch - Huyết áp',
  'Tiểu đường',
  'Dị ứng',
  'Da liễu',
  'Mắt - Tai - Mũi',
  'Thực phẩm chức năng',
  'Dụng cụ y tế',
] as const;

export const SUPPLIERS = [
  { name: 'Công ty TNHH Phân phối Dược Minh Long', phone: '024 3856 1122', address: 'KCN Quang Minh, Mê Linh, Hà Nội' },
  { name: 'Công ty CP Dược phẩm Sông Hồng', phone: '024 3771 2045', address: '28 Nguyễn Chí Thanh, Đống Đa, Hà Nội' },
  { name: 'Công ty CP Thương mại Dược Phương Nam', phone: '028 3925 6610', address: '156 Hai Bà Trưng, Q.1, TP.HCM' },
  { name: 'Công ty TNHH Dược Hoàng Gia', phone: '024 3643 8899', address: '9 Giải Phóng, Hai Bà Trưng, Hà Nội' },
  { name: 'Công ty CP Vật tư Y tế An Phát', phone: '024 3562 7788', address: '72 Lạc Long Quân, Tây Hồ, Hà Nội' },
  { name: 'Công ty TNHH Dược liệu Xanh Việt', phone: '0238 386 4521', address: 'KCN Bắc Vinh, Nghệ An' },
  { name: 'Công ty CP Dược Thiên Phúc', phone: '024 3791 3344', address: '15 Phạm Hùng, Nam Từ Liêm, Hà Nội' },
  { name: 'Công ty TNHH Nhập khẩu Dược Đông Á', phone: '028 3822 1590', address: '201 Nguyễn Văn Trỗi, Phú Nhuận, TP.HCM' },
];

/** [tên, hoạt chất, đơn vị, giá bán, cần kê đơn, độ phổ biến 1-10] */
type Row = [string, string, string, number, boolean, number];

export const MEDICINES: Record<(typeof CATEGORIES)[number], Row[]> = {
  'Giảm đau - Hạ sốt': [
    ['Panadol Extra', 'Paracetamol 500mg + Caffeine 65mg', 'Hộp', 195000, false, 10],
    ['Panadol viên sủi', 'Paracetamol 500mg', 'Hộp', 48000, false, 6],
    ['Efferalgan 500mg', 'Paracetamol 500mg', 'Hộp', 55000, false, 8],
    ['Hapacol 250', 'Paracetamol 250mg', 'Hộp', 38000, false, 7],
    ['Hapacol 650 Extra', 'Paracetamol 650mg + Caffeine', 'Hộp', 95000, false, 6],
    ['Tylenol 500mg', 'Paracetamol 500mg', 'Chai', 120000, false, 4],
    ['Ibuprofen 400mg Stada', 'Ibuprofen 400mg', 'Hộp', 45000, false, 5],
    ['Alaxan', 'Paracetamol + Ibuprofen', 'Hộp', 110000, false, 5],
    ['Salonpas Gel', 'Methyl salicylate + Menthol', 'Tuýp', 52000, false, 5],
    ['Mobic 7.5mg', 'Meloxicam 7.5mg', 'Hộp', 165000, true, 3],
    ['Voltaren 50mg', 'Diclofenac natri 50mg', 'Hộp', 98000, true, 3],
  ],
  'Kháng sinh': [
    ['Augmentin 625mg', 'Amoxicillin + Acid clavulanic', 'Hộp', 235000, true, 6],
    ['Amoxicillin 500mg Domesco', 'Amoxicillin 500mg', 'Hộp', 65000, true, 7],
    ['Cefuroxim 500mg', 'Cefuroxim 500mg', 'Hộp', 150000, true, 5],
    ['Zinnat 500mg', 'Cefuroxim axetil 500mg', 'Hộp', 290000, true, 3],
    ['Klacid 500mg', 'Clarithromycin 500mg', 'Hộp', 320000, true, 2],
    ['Azithromycin 250mg', 'Azithromycin 250mg', 'Hộp', 78000, true, 4],
    ['Ciprofloxacin 500mg', 'Ciprofloxacin 500mg', 'Hộp', 55000, true, 4],
    ['Cephalexin 500mg', 'Cephalexin 500mg', 'Hộp', 70000, true, 4],
    ['Metronidazol 250mg', 'Metronidazol 250mg', 'Hộp', 25000, true, 3],
    ['Doxycyclin 100mg', 'Doxycyclin 100mg', 'Hộp', 40000, true, 2],
  ],
  'Ho - Cảm cúm': [
    ['Decolgen Forte', 'Paracetamol + Phenylephrin + Clorpheniramin', 'Hộp', 72000, false, 8],
    ['Tiffy', 'Paracetamol + Phenylephrin + Clorpheniramin', 'Hộp', 40000, false, 8],
    ['Coldacmin Flu', 'Paracetamol + Clorpheniramin', 'Hộp', 45000, false, 5],
    ['Terpin Codein', 'Terpin hydrat + Codein', 'Hộp', 35000, true, 3],
    ['Prospan siro', 'Cao khô lá thường xuân', 'Chai', 98000, false, 7],
    ['Bổ phế Nam Hà', 'Dược liệu', 'Chai', 45000, false, 6],
    ['Eugica', 'Tinh dầu tràm + Gừng + Húng chanh', 'Hộp', 55000, false, 6],
    ['Acemuc 200mg', 'Acetylcystein 200mg', 'Hộp', 68000, false, 5],
    ['Bromhexin 8mg', 'Bromhexin HCl 8mg', 'Hộp', 22000, false, 4],
    ['Atussin siro', 'Dextromethorphan + Clorpheniramin', 'Chai', 38000, false, 4],
  ],
  'Tiêu hóa': [
    ['Smecta', 'Diosmectit 3g', 'Hộp', 115000, false, 7],
    ['Berberin 100mg', 'Berberin clorid 100mg', 'Lọ', 15000, false, 6],
    ['Enterogermina', 'Bacillus clausii', 'Hộp', 165000, false, 6],
    ['Omeprazol 20mg', 'Omeprazol 20mg', 'Hộp', 45000, true, 5],
    ['Nexium 40mg', 'Esomeprazol 40mg', 'Hộp', 520000, true, 2],
    ['Gaviscon', 'Natri alginat + Natri bicarbonat', 'Hộp', 145000, false, 5],
    ['Motilium-M', 'Domperidon 10mg', 'Hộp', 98000, false, 4],
    ['Oresol 245', 'Natri clorid + Glucose + Kali clorid', 'Hộp', 30000, false, 6],
    ['Buscopan 10mg', 'Hyoscin butylbromid 10mg', 'Hộp', 72000, false, 3],
    ['Phosphalugel', 'Nhôm phosphat', 'Hộp', 118000, false, 4],
    ['Men vi sinh Biolac', 'Lactobacillus acidophilus', 'Hộp', 75000, false, 5],
    ['Duphalac', 'Lactulose 10g/15ml', 'Hộp', 135000, false, 3],
  ],
  'Vitamin - Khoáng chất': [
    ['Vitamin C 500mg DHG', 'Acid ascorbic 500mg', 'Lọ', 35000, false, 8],
    ['Berocca', 'Vitamin nhóm B + C + Kẽm + Magie', 'Tuýp', 110000, false, 6],
    ['Centrum Adults', 'Đa vitamin và khoáng chất', 'Chai', 420000, false, 3],
    ['Pharmaton', 'Nhân sâm + Vitamin + Khoáng chất', 'Hộp', 265000, false, 4],
    ['Calcium Corbiere', 'Calci glucoheptonat + Vitamin C, PP', 'Hộp', 145000, false, 5],
    ['Vitamin E 400IU', 'Vitamin E thiên nhiên', 'Lọ', 95000, false, 5],
    ['Obimin', 'Vitamin tổng hợp cho bà bầu', 'Hộp', 180000, false, 3],
    ['Magne B6 Corbiere', 'Magnesi lactat + Vitamin B6', 'Hộp', 88000, false, 4],
    ['Vitamin 3B', 'Vitamin B1 + B6 + B12', 'Lọ', 75000, false, 5],
    ['Kẽm Zinc 15mg', 'Kẽm gluconat', 'Hộp', 90000, false, 3],
  ],
  'Tim mạch - Huyết áp': [
    ['Amlodipin 5mg', 'Amlodipin 5mg', 'Hộp', 38000, true, 6],
    ['Concor 5mg', 'Bisoprolol fumarat 5mg', 'Hộp', 215000, true, 4],
    ['Coversyl 5mg', 'Perindopril arginin 5mg', 'Hộp', 195000, true, 4],
    ['Losartan 50mg', 'Losartan kali 50mg', 'Hộp', 60000, true, 5],
    ['Lipitor 10mg', 'Atorvastatin 10mg', 'Hộp', 380000, true, 3],
    ['Crestor 10mg', 'Rosuvastatin 10mg', 'Hộp', 450000, true, 3],
    ['Aspirin 81mg', 'Acid acetylsalicylic 81mg', 'Hộp', 25000, false, 4],
    ['Plavix 75mg', 'Clopidogrel 75mg', 'Hộp', 520000, true, 2],
  ],
  'Tiểu đường': [
    ['Glucophage 850mg', 'Metformin HCl 850mg', 'Hộp', 90000, true, 5],
    ['Diamicron MR 60mg', 'Gliclazid 60mg', 'Hộp', 165000, true, 4],
    ['Januvia 100mg', 'Sitagliptin 100mg', 'Hộp', 780000, true, 2],
    ['Metformin 500mg Stada', 'Metformin HCl 500mg', 'Hộp', 42000, true, 4],
  ],
  'Dị ứng': [
    ['Clarityne 10mg', 'Loratadin 10mg', 'Hộp', 85000, false, 5],
    ['Telfast 180mg', 'Fexofenadin HCl 180mg', 'Hộp', 145000, false, 5],
    ['Cetirizin 10mg', 'Cetirizin 10mg', 'Hộp', 18000, false, 6],
    ['Zyrtec 10mg', 'Cetirizin 10mg', 'Hộp', 110000, false, 3],
    ['Aerius 5mg', 'Desloratadin 5mg', 'Hộp', 125000, false, 3],
    ['Clorpheniramin 4mg', 'Clorpheniramin maleat 4mg', 'Lọ', 12000, false, 4],
  ],
  'Da liễu': [
    ['Gentrisone', 'Betamethason + Clotrimazol + Gentamicin', 'Tuýp', 22000, false, 5],
    ['Fucidin 2%', 'Acid fusidic 2%', 'Tuýp', 98000, true, 3],
    ['Silkeron', 'Clotrimazol + Betamethason + Gentamicin', 'Tuýp', 15000, false, 4],
    ['Nizoral Cream', 'Ketoconazol 2%', 'Tuýp', 55000, false, 3],
    ['Bepanthen', 'Dexpanthenol 5%', 'Tuýp', 95000, false, 4],
    ['Acyclovir 5% kem', 'Acyclovir 5%', 'Tuýp', 18000, false, 3],
    ['Klenzit C', 'Adapalen + Clindamycin', 'Tuýp', 120000, true, 3],
  ],
  'Mắt - Tai - Mũi': [
    ['V.Rohto', 'Tetrahydrozolin + Vitamin', 'Lọ', 52000, false, 6],
    ['Natri clorid 0.9%', 'Natri clorid 0.9%', 'Lọ', 5000, false, 9],
    ['Otrivin 0.1%', 'Xylometazolin HCl 0.1%', 'Lọ', 65000, false, 4],
    ['Tobrex', 'Tobramycin 0.3%', 'Lọ', 55000, true, 3],
    ['Sterimar', 'Nước biển sâu', 'Chai', 125000, false, 4],
    ['Efticol 0.9%', 'Natri clorid 0.9%', 'Lọ', 5000, false, 6],
    ['Refresh Tears', 'Carboxymethylcellulose 0.5%', 'Lọ', 120000, false, 3],
  ],
  'Thực phẩm chức năng': [
    ['Hoạt huyết dưỡng não Traphaco', 'Đinh lăng + Bạch quả', 'Hộp', 65000, false, 5],
    ['Boganic', 'Actiso + Rau đắng đất + Bìm bìm', 'Hộp', 85000, false, 5],
    ['Ginkgo Biloba 120mg', 'Cao bạch quả', 'Hộp', 250000, false, 3],
    ['Omega-3 Fish Oil', 'Dầu cá EPA + DHA', 'Chai', 320000, false, 3],
    ['Glucosamine 1500mg', 'Glucosamine sulfat', 'Chai', 450000, false, 3],
    ['Siro Brauer Baby & Kids', 'Kẽm + Vitamin', 'Chai', 290000, false, 3],
    ['Kids Smart Omega-3', 'Dầu cá cho trẻ', 'Chai', 350000, false, 2],
  ],
  'Dụng cụ y tế': [
    ['Khẩu trang y tế 4 lớp', 'Vải không dệt', 'Hộp', 35000, false, 8],
    ['Nhiệt kế điện tử Omron MC-246', '—', 'Cái', 145000, false, 2],
    ['Máy đo huyết áp Omron HEM-7121', '—', 'Cái', 890000, false, 1],
    ['Que thử đường huyết Accu-Chek', '—', 'Hộp', 320000, false, 2],
    ['Bông y tế Bạch Tuyết', 'Bông gòn', 'Gói', 15000, false, 5],
    ['Băng cá nhân Urgo', '—', 'Hộp', 25000, false, 6],
    ['Que thử thai Quickstick', '—', 'Hộp', 20000, false, 4],
    ['Dầu gió xanh Thiên Thảo', 'Menthol + Tinh dầu', 'Chai', 30000, false, 5],
    ['Cồn 70 độ', 'Ethanol 70%', 'Chai', 15000, false, 5],
  ],
};

// ---- Tên người Việt để sinh khách hàng / nhân viên ----
export const LAST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
export const MIDDLE_MALE = ['Văn', 'Đức', 'Minh', 'Quang', 'Hữu', 'Thanh', 'Công', 'Tuấn'];
export const MIDDLE_FEMALE = ['Thị', 'Thu', 'Ngọc', 'Thanh', 'Minh', 'Phương', 'Hồng', 'Kim'];
export const FIRST_MALE = ['Anh', 'Bình', 'Cường', 'Dũng', 'Hải', 'Hiếu', 'Hoàng', 'Hùng', 'Khánh', 'Long', 'Nam', 'Phong', 'Quân', 'Sơn', 'Thắng', 'Trung', 'Tùng', 'Việt', 'Vinh', 'Đạt'];
export const FIRST_FEMALE = ['An', 'Chi', 'Dung', 'Giang', 'Hà', 'Hằng', 'Hạnh', 'Hoa', 'Hương', 'Lan', 'Linh', 'Mai', 'My', 'Nga', 'Ngân', 'Nhung', 'Oanh', 'Phương', 'Thảo', 'Trang', 'Vân', 'Yến'];

/** Tài khoản demo cố định (mật khẩu chung: 123456). */
export const DEMO_USERS = [
  { full_name: 'Trần Minh Tâm', email: 'chu@huuduyen.vn', role: 'owner', branch: null },
  { full_name: 'Lê Thu Hà', email: 'quanly@huuduyen.vn', role: 'manager', branch: 0 },
  { full_name: 'Phạm Quốc Việt', email: 'quanly.dd@huuduyen.vn', role: 'manager', branch: 1 },
  { full_name: 'Nguyễn Ngọc Mai', email: 'nhanvien@huuduyen.vn', role: 'staff', branch: 0 },
  { full_name: 'Đỗ Hoàng Long', email: 'long.dh@huuduyen.vn', role: 'staff', branch: 0 },
  { full_name: 'Vũ Phương Linh', email: 'linh.vp@huuduyen.vn', role: 'staff', branch: 0 },
  { full_name: 'Bùi Đức Anh', email: 'anh.bd@huuduyen.vn', role: 'staff', branch: 1 },
  { full_name: 'Hoàng Kim Oanh', email: 'oanh.hk@huuduyen.vn', role: 'staff', branch: 1 },
] as const;

export const DEMO_PASSWORD = '123456';
