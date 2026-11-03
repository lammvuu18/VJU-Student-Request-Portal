import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { formatDate } from '../../utils/format';

// Nhãn và màu badge theo internal_status của backend (quy trình 1 cấp)
export const INBOX_STATUS = {
  'Chờ phân công': { label: 'Chờ phân công', theme: 'yellow' },
  'CV đang thẩm định': { label: 'Đang thẩm định', theme: 'blue' },
  'Cần bổ sung': { label: 'Chờ bổ sung', theme: 'yellow' },
  'Đã duyệt — Đang chuẩn bị kết quả': { label: 'Đã duyệt', theme: 'green' },
};

// Đơn đã kết thúc (scope=closed), theo status của backend
export const CLOSED_STATUS = {
  'Đã xử lý': { label: 'Hoàn thành', theme: 'green' },
  'Từ chối': { label: 'Từ chối', theme: 'red' },
  'Đã hủy': { label: 'Đã hủy', theme: 'gray' },
};

export const INBOX_STATUS_LABELS = Object.values(INBOX_STATUS).map(s => s.label);
export const CLOSED_STATUS_LABELS = Object.values(CLOSED_STATUS).map(s => s.label);

// Tab trên màn danh sách: đơn đang xử lý / đơn đã kết thúc
export const INBOX_SCOPE_TABS = [
  { key: 'open', label: 'Đang xử lý' },
  { key: 'closed', label: 'Đã kết thúc' },
];

export const mapInboxItem = (item) => {
  const meta = item.is_closed
    ? (CLOSED_STATUS[item.status] || { label: item.status, theme: 'gray' })
    : (INBOX_STATUS[item.internal_status] || { label: item.internal_status, theme: 'blue' });
  return {
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
    status: item.is_overdue ? 'Quá hạn' : meta.label,
    statusTheme: item.is_overdue ? 'red' : meta.theme,
    isOverdueRow: Boolean(item.is_overdue),
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
