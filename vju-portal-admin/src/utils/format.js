// Định dạng dữ liệu backend trả về để hiển thị trên giao diện

export const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

export const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Trạng thái hiển thị cho sinh viên (status) và trạng thái nội bộ (internal_status)
export const STATUS_COLORS = {
  'Đã gửi': { bg: '#EFF6FF', color: '#1D4ED8' },
  'Chờ phân công': { bg: '#EFF6FF', color: '#1D4ED8' },
  'Chờ thanh toán': { bg: '#FFF7ED', color: '#C2410C' },
  'Đang xử lý': { bg: '#FEF9C3', color: '#A16207' },
  'CV đang thẩm định': { bg: '#FEF9C3', color: '#A16207' },
  'Chờ TP phê duyệt': { bg: '#FEF9C3', color: '#A16207' },
  'Chờ HT ký số': { bg: '#EFF6FF', color: '#1D4ED8' },
  'Cần bổ sung': { bg: '#FFF7ED', color: '#C2410C' },
  'Đã duyệt': { bg: '#ECFDF5', color: '#047857' },
  'Đã duyệt — Đang chuẩn bị kết quả': { bg: '#ECFDF5', color: '#047857' },
  'Đã duyệt — Có kết quả': { bg: '#ECFDF5', color: '#047857' },
  'Đã xử lý': { bg: '#ECFDF5', color: '#047857' },
  'Từ chối': { bg: '#FEF2F2', color: '#B91C1C' },
  'Đã hủy': { bg: '#F3F4F6', color: '#4B5563' },
};

export const statusStyle = (status) => {
  const c = STATUS_COLORS[status] || { bg: '#F3F4F6', color: '#374151' };
  return {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    background: c.bg,
    color: c.color,
    whiteSpace: 'nowrap',
  };
};

// Tên hành động trong nhật ký xử lý (StateAuditLog.action)
export const TIMELINE_ACTION_LABELS = {
  submit: 'Nộp yêu cầu',
  cancel: 'Hủy yêu cầu',
  assign: 'Phân công chuyên viên',
  approve: 'Duyệt yêu cầu',
  submit_to_head: 'Trình Trưởng phòng phê duyệt',
  submit_for_signature: 'Trình Hiệu trưởng ký số',
  return_to_staff: 'Trả lại chuyên viên thẩm định',
  return_to_head: 'Hiệu trưởng trả lại Trưởng phòng',
  sign_smartca: 'Hiệu trưởng ký số SmartCA',
  payment_completed: 'Thanh toán lệ phí thành công',
  reject: 'Từ chối yêu cầu',
  request_supplement: 'Yêu cầu bổ sung hồ sơ',
  submit_supplement: 'Nộp bổ sung hồ sơ',
  assign_pickup: 'Hẹn lịch nhận bản cứng',
  confirm_handover: 'Bàn giao bản cứng',
  download_result: 'Tải kết quả',
  revoke: 'Thu hồi quyết định duyệt',
  supplement_expired: 'Quá hạn bổ sung',
};

// Nhãn các trường form_data theo cấu hình seed (dùng khi không gọi được API chi tiết thủ tục)
export const FIELD_LABELS = {
  full_name: 'Họ tên',
  mssv: 'MSSV',
  class_name: 'Lớp',
  cohort: 'Khóa',
  major: 'Ngành',
  email: 'Email',
  purpose: 'Mục đích xin cấp',
  result_preference: 'Hình thức nhận kết quả',
  ho_khau: 'Hộ khẩu thường trú',
  noi_dk_nvqs: 'Nơi đăng ký NVQS',
  thoi_gian_dao_tao: 'Thời gian đào tạo dự kiến',
  company_name: 'Tên doanh nghiệp',
  company_address: 'Địa chỉ doanh nghiệp',
  internship_from: 'Thực tập từ ngày',
  internship_to: 'Thực tập đến ngày',
  course_name: 'Học phần thực tập',
  reason: 'Lý do bảo lưu',
  semester: 'Học kỳ bảo lưu',
  semester_count: 'Số kỳ bảo lưu',
  gpa: 'Điểm GPA tích lũy',
  suspend_from: 'Bảo lưu từ ngày',
  suspend_to: 'Bảo lưu đến ngày',
  return_semester: 'Học kỳ quay lại dự kiến',
  commitment: 'Cam kết của sinh viên',
  subject: 'Môn học',
  current_grade: 'Điểm hiện tại',
};
