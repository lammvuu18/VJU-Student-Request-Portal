// ===== Mock Data for VJU Portal Admin =====

export const procedures = [
  { id: 1, name: 'Cấp bảng điểm', department: 'Phòng Đào tạo', approvalLevels: '3 cấp', sla: '5 ngày', fee: '30.000 VND', status: 'active' },
  { id: 2, name: 'Xác nhận sinh viên', department: 'Phòng CTSV', approvalLevels: '2 cấp', sla: '3 ngày', fee: 'Miễn phí', status: 'active' },
  { id: 3, name: 'Phúc khảo điểm', department: 'Phòng Đào tạo', approvalLevels: '3 cấp', sla: '10 ngày', fee: '20.000 VND', status: 'active' },
  { id: 4, name: 'Miễn giảm học phí', department: 'Phòng KHTC', approvalLevels: '2 cấp', sla: '7 ngày', fee: 'Miễn phí', status: 'active' },
  { id: 5, name: 'Bảo lưu kết quả', department: 'Phòng Đào tạo', approvalLevels: '2 cấp', sla: '5 ngày', fee: 'Miễn phí', status: 'active' },
  { id: 6, name: 'Hoàn trả học phí', department: 'Phòng KHTC', approvalLevels: '3 cấp', sla: '10 ngày', fee: 'Miễn phí', status: 'paused' },
  { id: 7, name: 'Cấp giấy giới thiệu', department: 'Phòng CTSV', approvalLevels: '2 cấp', sla: '3 ngày', fee: 'Miễn phí', status: 'active' },
];

export const formFields = [
  { id: 1, name: 'Họ và tên', key: 'ho_ten', type: 'Text', required: true },
  { id: 2, name: 'Mã số sinh viên', key: 'mssv', type: 'Text', required: true },
  { id: 3, name: 'Mục đích sử dụng', key: 'muc_dich', type: 'Dropdown', required: true, values: ['Xin việc', 'Du học', 'Lưu trữ cá nhân'] },
  { id: 4, name: 'Số bản', key: 'so_ban', type: 'Number', required: true },
  { id: 5, name: 'Ngôn ngữ', key: 'ngon_ngu', type: 'Radio', required: true },
  { id: 6, name: 'Ghi chú', key: 'ghi_chu', type: 'Textarea', required: false },
  { id: 7, name: 'Hồ sơ đính kèm', key: 'ho_so', type: 'File upload', required: false },
];

export const procedureConfig = {
  name: 'Cấp bảng điểm',
  description: 'Cấp bảng điểm chính quy cho sinh viên theo yêu cầu...',
  department: 'Phòng Đào tạo',
  approvalLevel: '3 cấp (CV → TP → HT)',
  slaTotal: 5,
  subSla: 'CV: 2 ngày → TP: 2 ngày → HT: 1 ngày',
  resultFormat: 'PDF ký số + Bản cứng',
  template: 'bang_diem_v2.1.docx',
  hasFee: true,
  feeAmount: '30.000',
  isActive: true,
};

export const students = [
  { id: 1, name: 'Nguyễn Minh Anh', mssv: '23110150', email: '23110150@vnu.edu.vn', classGroup: 'QH-2023-I/CQ-M', status: 'studying' },
  { id: 2, name: 'Trần Văn Bình', mssv: '23110151', email: '23110151@vnu.edu.vn', classGroup: 'QH-2023-I/CQ-M', status: 'studying' },
  { id: 3, name: 'Lê Thị Cúc', mssv: '22110045', email: '22110045@vnu.edu.vn', classGroup: 'QH-2022-I/CQ-M', status: 'reserved' },
  { id: 4, name: 'Phạm Đức Dũng', mssv: '23110152', email: '23110152@vnu.edu.vn', classGroup: 'QH-2023-I/CQ-M', status: 'studying' },
  { id: 5, name: 'Ngô Thị Em', mssv: '21110032', email: '21110032@vnu.edu.vn', classGroup: 'QH-2021-I/CQ-M', status: 'quit' },
  { id: 6, name: 'Hoàng Văn Phúc', mssv: '23110153', email: '23110153@vnu.edu.vn', classGroup: 'QH-2023-I/CQ-M', status: 'studying' },
  { id: 7, name: 'Đỗ Thị Giang', mssv: '22110046', email: '22110046@vnu.edu.vn', classGroup: 'QH-2022-I/CQ-M', status: 'studying' },
  { id: 8, name: 'Vũ Văn Hải', mssv: '23110154', email: '23110154@vnu.edu.vn', classGroup: 'QH-2023-I/CQ-M', status: 'studying' },
];

export const staff = [
  { id: 1, name: 'Lê Hoàng Nam', email: 'nam.lh@vju.ac.vn', department: 'PĐT', level: 'Chuyên viên', status: 'active' },
  { id: 2, name: 'Trần Thu Hà', email: 'ha.tt@vju.ac.vn', department: 'PĐT', level: 'Trưởng phòng', status: 'active' },
  { id: 3, name: 'Nguyễn Văn A', email: 'a.nv@vju.ac.vn', department: 'PĐT', level: 'Chuyên viên', status: 'active' },
  { id: 4, name: 'Phạm Thị Lan', email: 'lan.pt@vju.ac.vn', department: 'PCTSV', level: 'Chuyên viên', status: 'active' },
  { id: 5, name: 'Đặng Văn Minh', email: 'minh.dv@vju.ac.vn', department: 'PCTSV', level: 'Trưởng phòng', status: 'active' },
  { id: 6, name: 'Lý Thị Ngọc', email: 'ngoc.lt@vju.ac.vn', department: 'PKHTC', level: 'Chuyên viên', status: 'locked' },
];

export const principal = {
  name: 'PGS.TS Nguyễn Văn Bình',
  email: 'binh.nv@vju.ac.vn',
  initials: 'NVB',
  status: 'active',
};

export const departmentOptions = [
  'Phòng Đào tạo',
  'Phòng CTSV',
  'Phòng KHTC',
];

export const approvalLevelOptions = [
  '2 cấp (CV → TP)',
  '3 cấp (CV → TP → HT)',
];

export const resultFormatOptions = [
  'PDF ký số + Bản cứng',
  'PDF ký số',
  'Bản cứng',
];

export const studentStatusMap = {
  studying: { label: 'Đang học', color: '#2563EB', bg: '#EFF6FF' },
  reserved: { label: 'Bảo lưu', color: '#7C3AED', bg: '#F5F3FF' },
  quit: { label: 'Đỗ TN', color: '#DC2626', bg: '#FEF2F2' },
};

export const staffStatusMap = {
  active: { label: 'Hoạt động', color: '#059669', bg: '#ECFDF5' },
  locked: { label: 'Vô hiệu', color: '#6B7280', bg: '#F3F4F6' },
};

export const procedureStatusMap = {
  active: { label: 'Hoạt động', color: '#059669', bg: '#ECFDF5' },
  paused: { label: 'Tạm dừng', color: '#D97706', bg: '#FFFBEB' },
};

export const departmentBadgeColors = {
  'PĐT': { color: '#7C3AED', bg: '#F5F3FF' },
  'PCTSV': { color: '#2563EB', bg: '#EFF6FF' },
  'PKHTC': { color: '#D97706', bg: '#FFFBEB' },
};

export const fieldTypeOptions = [
  'Nhập văn bản (Text)',
  'Danh sách chọn (Dropdown)',
  'Số (Number)',
  'Chọn một (Radio)',
  'Văn bản dài (Textarea)',
  'Tải tệp (File upload)',
];
