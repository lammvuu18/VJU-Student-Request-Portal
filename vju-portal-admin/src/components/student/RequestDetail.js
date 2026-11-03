import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Modal from '../common/Modal';
import Button from '../common/Button';
import api from '../../services/api';
import {
  formatDate, formatDateTime, formatFileSize, statusStyle, TIMELINE_ACTION_LABELS,
} from '../../utils/format';
import './StudentPages.css';

const DONE_STATUS = 'Đã xử lý';

function RequestDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [request, setRequest] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [fieldLabels, setFieldLabels] = useState({});
  const [loadError, setLoadError] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    try {
      const [detailRes, timelineRes] = await Promise.all([
        api.requests.getDetail(id),
        api.requests.getTimeline(id),
      ]);
      setRequest(detailRes.data);
      setTimeline(timelineRes.data || []);

      // Lấy tên hiển thị của các trường form theo cấu hình thủ tục
      api.procedures.getDetail(detailRes.data.type_id)
        .then((res) => {
          const labels = {};
          (res.data.form_fields || []).forEach(f => { labels[f.field_key] = f.field_name; });
          setFieldLabels(labels);
        })
        .catch(() => {});
    } catch (err) {
      setLoadError(err.message || 'Không tải được yêu cầu.');
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async () => {
    setBusy(true);
    try {
      const res = await api.requests.cancel(request.request_id);
      setShowCancelModal(false);
      showToast(res.message || 'Đã hủy yêu cầu.');
      await load();
    } catch (err) {
      setShowCancelModal(false);
      showToast(err.message, true);
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async (url, fileName) => {
    try {
      await api.attachments.download(url, fileName);
    } catch (err) {
      showToast(err.message, true);
    }
  };

  if (loadError) {
    return (
      <div className="req-detail-container">
        <div className="req-detail-top-bar">
          <h1 className="req-detail-title">Không tải được yêu cầu</h1>
          <button type="button" className="btn-back-to-requests" onClick={() => navigate('/student/dashboard')}>
            <span>← Yêu cầu của tôi</span>
          </button>
        </div>
        <div className="req-detail-card"><p style={{ color: '#B91C1C' }}>{loadError}</p></div>
      </div>
    );
  }

  if (!request) {
    return <div className="req-detail-container"><p style={{ color: '#68717D' }}>Đang tải yêu cầu...</p></div>;
  }

  const student = request.student || {};
  const result = request.result;
  const statusLabel = request.status === DONE_STATUS ? 'Hoàn thành' : request.status;
  const canCancel = request.internal_status === 'Chờ phân công';
  const needsSupplement = request.internal_status === 'Cần bổ sung';
  const canFeedback = request.status === DONE_STATUS;
  const formEntries = Object.entries(request.form_data || {}).filter(([, v]) => v !== '' && v !== null && v !== undefined);

  const infoRows = [
    ['Tên sinh viên', student.full_name],
    ['Mã sinh viên', student.mssv],
    ['Mã yêu cầu', request.request_code],
    ['Tên thủ tục', request.type_name],
    ['Phòng ban xử lý', request.department_name],
    ...formEntries.map(([key, value]) => [fieldLabels[key] || key, String(value)]),
    ['Ngày gửi', formatDateTime(request.created_at)],
    ['Hạn xử lý dự kiến', formatDate(request.sla_deadline)],
  ];

  return (
    <div className="req-detail-container">
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: toast.isError ? '#B91C1C' : '#059669', color: '#FFFFFF',
          padding: '12px 20px', borderRadius: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
          fontSize: 14, fontWeight: 600, fontFamily: 'Inter, sans-serif', maxWidth: 420,
        }}>
          {toast.message}
        </div>
      )}

      {/* Top Header Row */}
      <div className="req-detail-top-bar">
        <h1 className="req-detail-title">Yêu cầu {request.request_code}</h1>
        <button
          type="button"
          className="btn-back-to-requests"
          onClick={() => navigate('/student/dashboard')}
        >
          <span>← Yêu cầu của tôi</span>
        </button>
      </div>

      {/* Main Card: Thông tin yêu cầu */}
      <div className="req-detail-card">
        <div className="req-detail-card-title">Thông tin yêu cầu</div>
        <div className="req-detail-divider" />

        {infoRows.map(([label, value]) => (
          <React.Fragment key={label}>
            <div className="req-detail-row">
              <div className="req-detail-label">{label}</div>
              <div className="req-detail-value">{value || '—'}</div>
            </div>
            <div className="req-detail-divider" />
          </React.Fragment>
        ))}

        <div className="req-detail-row">
          <div className="req-detail-label">Trạng thái</div>
          <div className="req-detail-value">
            <span style={statusStyle(request.status)}>{statusLabel}</span>
          </div>
        </div>
        <div className="req-detail-divider" />

        <div className="req-detail-row">
          <div className="req-detail-label">Người phụ trách</div>
          <div className="req-detail-value">{request.assigned_staff?.full_name || 'Chưa phân công'}</div>
        </div>
        <div className="req-detail-divider" />

        <div className="req-detail-row">
          <div className="req-detail-label">Tài liệu đã gửi</div>
          <div className="req-detail-value" style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
            {(request.attachments || []).length === 0 && <span>Không có tài liệu đính kèm</span>}
            {(request.attachments || []).map(att => (
              <button
                key={att.attachment_id}
                type="button"
                className="btn-view-document"
                onClick={() => handleDownload(att.download_url, att.file_name)}
                title={att.item_name || ''}
              >
                <span>
                  {att.is_supplement ? '[Bổ sung] ' : ''}{att.file_name} ({formatFileSize(att.file_size)}) ↓
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="req-detail-divider" />
      </div>

      {/* Kết quả */}
      {result && (
        <div className="req-detail-card" style={{ marginTop: 16 }}>
          <div className="req-detail-card-title">Kết quả</div>
          <div className="req-detail-divider" />
          <div className="req-detail-row">
            <div className="req-detail-label">Mã xác minh</div>
            <div className="req-detail-value">{result.verification_code}</div>
          </div>
          <div className="req-detail-divider" />
          <div className="req-detail-row">
            <div className="req-detail-label">Người duyệt</div>
            <div className="req-detail-value">{result.signed_by || '—'} · {formatDateTime(result.signed_at)}</div>
          </div>
          <div className="req-detail-divider" />
          {result.pickup_date && (
            <>
              <div className="req-detail-row">
                <div className="req-detail-label">Lịch nhận bản cứng</div>
                <div className="req-detail-value">
                  {formatDateTime(result.pickup_date)} tại {result.pickup_location}
                  {result.pickup_note ? ` (${result.pickup_note})` : ''}
                </div>
              </div>
              <div className="req-detail-divider" />
            </>
          )}
          {result.handover_confirmed_at && (
            <>
              <div className="req-detail-row">
                <div className="req-detail-label">Đã nhận bản cứng</div>
                <div className="req-detail-value">{formatDateTime(result.handover_confirmed_at)}</div>
              </div>
              <div className="req-detail-divider" />
            </>
          )}
        </div>
      )}

      {/* Lịch sử xử lý */}
      <div className="req-detail-card" style={{ marginTop: 16 }}>
        <div className="req-detail-card-title">Lịch sử xử lý</div>
        <div className="req-detail-divider" />
        {timeline.map((log, idx) => (
          <React.Fragment key={`${log.created_at}-${idx}`}>
            <div className="req-detail-row">
              <div className="req-detail-label">{formatDateTime(log.created_at)}</div>
              <div className="req-detail-value">
                <strong>{TIMELINE_ACTION_LABELS[log.action] || log.action}</strong> · {log.performed_by}
                {log.note ? <div style={{ fontSize: 13, color: '#68717D', marginTop: 2 }}>{log.note}</div> : null}
              </div>
            </div>
            <div className="req-detail-divider" />
          </React.Fragment>
        ))}
      </div>

      {/* Action Buttons Row: chỉ hiện thao tác hợp lệ với trạng thái hiện tại */}
      <div className="req-detail-actions">
        {canCancel && (
          <button type="button" className="btn-req-action-outline" onClick={() => setShowCancelModal(true)}>
            Hủy yêu cầu
          </button>
        )}
        {needsSupplement && (
          <button
            type="button"
            className="btn-req-action-outline"
            onClick={() => navigate(`/student/request/${request.request_id}/supplement`)}
          >
            Bổ sung hồ sơ
          </button>
        )}
        {canFeedback && (
          <button
            type="button"
            className="btn-req-action-outline"
            onClick={() => navigate(`/student/request/${request.request_id}/feedback`, {
              state: { requestCode: request.request_code, procedureName: request.type_name, department: request.department_name },
            })}
          >
            Đánh giá
          </button>
        )}
        {result && (
          <button
            type="button"
            className="btn-req-action-primary"
            onClick={() => navigate(`/student/request/${request.request_id}/receive`)}
          >
            <span>Nhận kết quả →</span>
          </button>
        )}
      </div>

      {/* Xác nhận hủy */}
      <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title="Hủy yêu cầu">
        <p style={{ fontSize: 14, color: '#202630', fontFamily: 'Inter, sans-serif' }}>
          Bạn chắc chắn muốn hủy yêu cầu <strong>{request.request_code}</strong>? Thao tác này không hoàn tác được.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <Button variant="secondary" onClick={() => setShowCancelModal(false)}>Đóng</Button>
          <Button variant="primary" onClick={handleCancel} disabled={busy}>
            {busy ? 'Đang hủy...' : 'Hủy yêu cầu'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default RequestDetail;
