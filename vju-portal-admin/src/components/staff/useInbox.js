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

export const INBOX_STATUS_LABELS = Object.values(INBOX_STATUS).map(s => s.label);

export const mapInboxItem = (item) => {
  const meta = INBOX_STATUS[item.internal_status] || { label: item.internal_status, theme: 'blue' };
  return {
    id: item.request_id,
    code: item.request_code,
    procedure: item.type_name,
    student: item.student_name,
    mssv: item.mssv,
    assignedDate: formatDate(item.created_at),
    deadline: formatDate(item.sla_deadline),
    internalStatus: item.internal_status,
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
 * Backend loại các đơn đã xử lý / từ chối / hủy khỏi hộp thư.
 */
export function useInbox() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total_pending: 0, overdue: 0, due_today: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.staff.getInbox({ limit: 100 });
      setItems((res.data || []).map(mapInboxItem));
      setSummary(res.summary || { total_pending: 0, overdue: 0, due_today: 0 });
      setError('');
    } catch (err) {
      setError(err.message || 'Không tải được hộp thư.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { items, summary, loading, error, reload };
}
