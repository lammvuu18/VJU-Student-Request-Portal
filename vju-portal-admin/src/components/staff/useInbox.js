import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { formatDate } from '../../utils/format';

// Nhãn và màu badge theo internal_status của backend (quy trình 1-3 cấp)
export const INBOX_STATUS = {
  'Chờ phân công': { label: 'Chờ phân công', theme: 'yellow' },
  'CV đang thẩm định': { label: 'Đang thẩm định', theme: 'blue' },
  'Cần bổ sung': { label: 'Chờ bổ sung', theme: 'yellow' },
  'Chờ TP phê duyệt': { label: 'Chờ TP phê duyệt', theme: 'yellow' },
  'Chờ HT ký số': { label: 'Chờ HT ký số', theme: 'blue' },
  'Đã duyệt — Đang chuẩn bị kết quả': { label: 'Đã duyệt', theme: 'green' },
  'Đã duyệt — Có kết quả': { label: 'Đã ký số', theme: 'green' },
  // Miễn giảm học phí: PCTSV chuyển sang, chờ TP KHTC phân công
  'Đã chuyển PKHTC — chờ phân công': { label: 'Chờ phân công', theme: 'yellow' },
  // Hoàn trả học phí: sau khi HT ký, chi tiền qua Internet Banking
  'HT đã ký — Chờ chi hoàn trả': { label: 'Chờ chi hoàn trả', theme: 'blue' },
  'Chờ ngân hàng xác nhận': { label: 'Chờ ngân hàng xác nhận', theme: 'blue' },
  'Chi hoàn trả thất bại': { label: 'Chi hoàn trả thất bại', theme: 'red' },
};

// Đơn đã kết thúc (scope=closed), theo status của backend
export const CLOSED_STATUS = {
  'Đã xử lý': { label: 'Hoàn thành', theme: 'green' },
  'Đã duyệt': { label: 'Hoàn thành', theme: 'green' },
  'Từ chối': { label: 'Từ chối', theme: 'red' },
  'Đã hủy': { label: 'Đã hủy', theme: 'gray' },
};

// Đơn đã chuyển sang phòng khác (VD: miễn giảm học phí chuyển P.KHTC): phòng gốc chỉ theo dõi
export const TRANSFERRED_LABEL = 'Đã chuyển P.KHTC';

const unique = (list) => [...new Set(list)];
export const INBOX_STATUS_LABELS = unique([...Object.values(INBOX_STATUS).map(s => s.label), TRANSFERRED_LABEL]);
export const CLOSED_STATUS_LABELS = unique(Object.values(CLOSED_STATUS).map(s => s.label));

const shortDeptName = (name) => (name || '')
  .replace('Phòng Kế hoạch Tài chính', 'P.KHTC')
  .replace('Phòng Công tác Sinh viên', 'P.CTSV')
  .replace('Phòng Đào tạo', 'P.ĐT');

export const mapInboxItem = (item) => {
  const transferredAway = !item.is_closed && Boolean(item.transferred_to_dept_name);
  let meta;
  if (item.is_closed) {
    meta = CLOSED_STATUS[item.status] || { label: item.status, theme: 'gray' };
  } else if (transferredAway) {
    meta = { label: `Đã chuyển ${shortDeptName(item.transferred_to_dept_name)}`, theme: 'gray' };
  } else {
    meta = INBOX_STATUS[item.internal_status] || { label: item.internal_status, theme: 'blue' };
  }
  return {
    isReadOnly: Boolean(item.is_read_only),
    transferredTo: item.transferred_to_dept_name || '',
    id: item.request_id,
    code: item.request_code,
    procedure: item.type_name,
    student: item.student_name,
    mssv: item.mssv,
    assignedDate: formatDate(item.created_at),
    deadline: formatDate(item.sla_deadline),
    internalStatus: item.internal_status,
    isClosed: Boolean(item.is_closed),
    assignee: item.assigned_staff?.full_name || '',
    assigneeId: item.assigned_staff?.user_id || null,
    // Đơn đã chuyển đi không còn là việc của phòng này, không báo quá hạn
    status: item.is_overdue && !transferredAway ? 'Quá hạn' : meta.label,
    statusTheme: item.is_overdue && !transferredAway ? 'red' : meta.theme,
    isOverdueRow: Boolean(item.is_overdue) && !transferredAway,
    slaRemainingHours: item.sla_remaining_hours,
    createdAt: item.created_at,
  };
};

/**
 * Hộp thư cán bộ: CV chỉ thấy đơn được phân công, TP thấy toàn bộ đơn của phòng.
 * scope: 'open' (đang xử lý, mặc định) | 'closed' (hoàn thành / từ chối / đã hủy) | 'all'.
 * summary luôn tính trên đơn đang xử lý.
 */
export function useInbox(scope = 'open') {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total_pending: 0, overdue: 0, due_today: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.staff.getInbox({ limit: 100, scope });
      setItems((res.data || []).map(mapInboxItem));
      setSummary(res.summary || { total_pending: 0, overdue: 0, due_today: 0 });
      setError('');
    } catch (err) {
      setError(err.message || 'Không tải được hộp thư.');
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { reload(); }, [reload]);

  return { items, summary, loading, error, reload };
}
