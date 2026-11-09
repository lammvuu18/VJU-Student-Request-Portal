import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SupplementRequestModal from '../common/SupplementRequestModal';
import RejectRequestModal from '../common/RejectRequestModal';
import api, { getSavedRole, normalizeRole } from '../../services/api';
import {
  formatDate, formatDateTime, formatFileSize, statusStyle, FIELD_LABELS, TIMELINE_ACTION_LABELS,
} from '../../utils/format';
import './StaffPages.css';

const WAITING_ASSIGN = 'Chờ phân công';
const REVIEWING = 'CV đang thẩm định';
const APPROVED = 'Đã duyệt — Đang chuẩn bị kết quả';
const MIN_REJECT_NOTE = 20;

/**
 * Chi tiết hồ sơ cho chuyên viên (quy trình 1 cấp):
 * - CV đang thẩm định: Từ chối / Yêu cầu bổ sung / Phê duyệt (backend sinh PDF kết quả)
 * - Đã duyệt: Thu hồi trong 30 phút, hẹn lịch và bàn giao bản cứng ở trang Cấp kết quả
 */
function StaffRequestDetail({ basePath = '/staff' }) {
  const navigate = useNavigate();
  const { id } = useParams();

  const [request, setRequest] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [reasons, setReasons] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const [showSupplementModal, setShowSupplementModal] = useState(false);
  const [supplementNote, setSupplementNote] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const isDeptHead = normalizeRole(getSavedRole()) === 'deptHead';
  const [members, setMembers] = useState([]);
  const [assigneeId, setAssigneeId] = useState('');

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4500);
  };

  const load = useCallback(async () => {
    try {
      const [detailRes, timelineRes] = await Promise.all([
        api.requests.getDetail(id),
        api.requests.getTimeline(id),
      ]);
      setRequest(detailRes.data);
      setTimeline(timelineRes.data || []);
    } catch (err) {
      setLoadError(err.message || 'Không tải được hồ sơ.');
    }
  }, [id]);

  useEffect(() => {
    load();
    api.staff.getRejectionReasons()
      .then(res => setReasons(res.data || []))
      .catch(() => {});
    if (isDeptHead) {
      api.staff.getDepartmentMembers()
        .then(res => setMembers(res.data || []))
        .catch(() => {});
    }
  }, [load, isDeptHead]);

  // Chạy một thao tác, báo kết quả và tải lại hồ sơ
  const runAction = async (action, successMessage) => {
    setBusy(true);
    try {
      const res = await action();
      showToast(res?.message || successMessage);
      await load();
      return true;
    } catch (err) {
      showToast(err.message, true);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = () => {
    if (!assigneeId) {
      showToast('Vui lòng chọn chuyên viên.', true);
      return;
    }
    runAction(() => api.staff.assign(request.request_id, Number(assigneeId)), 'Đã phân công chuyên viên.');
  };

  const handleApprove = () => runAction(() => api.staff.approve(request.request_id), 'Đã duyệt hồ sơ.');

  const handleProgressToHead = () => runAction(
    () => api.staff.submitToHead(request.request_id),
    'Đã trình Trưởng phòng phê duyệt.'
  );

  const handleSubmitToPrincipal = () => runAction(
    () => api.staff.submitToPrincipal(request.request_id),
    'Đã trình Hiệu trưởng ký số SmartCA.'
  );

  const handleReturnToStaff = () => runAction(
    () => api.staff.returnToStaff(request.request_id),
    'Đã trả lại hồ sơ cho chuyên viên thẩm định.'
  );

  const handleSupplementSubmit = async () => {
    if (!supplementNote.trim()) {
      showToast('Vui lòng nhập nội dung cần bổ sung.', true);
      return;
    }
    const ok = await runAction(
      () => api.staff.requestSupplement(request.request_id, supplementNote.trim()),
      'Đã gửi yêu cầu bổ sung cho sinh viên.'
    );
    if (ok) {
      setShowSupplementModal(false);
      setSupplementNote('');
    }
  };

  const handleRejectSubmit = async ({ reason, notes }) => {
    const matched = reasons.find(r => r.reason_text === reason);
    const note = (notes || '').trim();
    if (!matched && note.length < MIN_REJECT_NOTE) {
      showToast(`Vui lòng chọn lý do có sẵn hoặc ghi rõ lý do (ít nhất ${MIN_REJECT_NOTE} ký tự).`, true);
      return;
    }
    const ok = await runAction(
      () => api.staff.reject(request.request_id, { reason_id: matched?.reason_id, note }),
      'Đã từ chối yêu cầu.'
    );
    if (ok) setShowRejectModal(false);
  };

  const handleRevoke = () => runAction(
    () => api.staff.revoke(request.request_id),
    'Đã thu hồi quyết định duyệt.'
  );

  const handleDownload = async (url, fileName) => {
    try {
      await api.attachments.download(url, fileName);
    } catch (err) {
      showToast(err.message, true);
    }
  };

  if (loadError || !request) {
    return (
      <div className="staff-detail-container">
        <div className="staff-detail-topbar">
          <h1 className="staff-detail-title">Chi tiết hồ sơ</h1>
          <button type="button" className="staff-detail-btn-back" onClick={() => navigate(`${basePath}/requests`)}>
            ← Danh sách yêu cầu
          </button>
        </div>
        <p style={{ color: loadError ? '#B91C1C' : '#6B7280' }}>{loadError || 'Đang tải hồ sơ...'}</p>
      </div>
    );
  }

  const student = request.student || {};
  const studentLabel = `${student.full_name || ''} — ${student.mssv || ''}`;
  const isWaitingAssign = request.internal_status === WAITING_ASSIGN;
  const isReviewing = request.internal_status === REVIEWING;
  const isApproved = request.internal_status === APPROVED;
  const preference = request.result_preference || request.form_data?.result_preference;
  const needsHardCopy = preference === 'Bản cứng' || preference === 'Cả hai' || request.type_id === 2;
  const formEntries = Object.entries(request.form_data || {}).filter(([, v]) => v !== '' && v !== null && v !== undefined);

  const infoRows = [
    ['Mã yêu cầu', request.request_code],
    ['Thủ tục', request.type_name],
    ['Sinh viên', studentLabel],
    ['Lớp / Khóa / Ngành', [student.class_name, student.cohort, student.major].filter(Boolean).join(' / ')],
    ['Email', student.email],
    ...formEntries
      .filter(([key]) => !['full_name', 'mssv', 'class_name', 'cohort', 'major', 'email'].includes(key))
      .map(([key, value]) => [FIELD_LABELS[key] || key, String(value)]),
    ['Ngày gửi', formatDateTime(request.created_at)],
    ['Hạn xử lý (SLA)', formatDate(request.sla_deadline)],
    ['Chuyên viên phụ trách', request.assigned_staff?.full_name || 'Chưa phân công'],
    ['Số lần yêu cầu bổ sung', String(request.supplement_count || 0)],
  ];

  return (
    <div className="staff-detail-container">
      {toast && (
        <div className="staff-toast-card depthead-toast-card" style={toast.isError ? { background: '#FEF2F2', borderColor: '#FCA5A5' } : undefined}>
          <div className="staff-toast-icon-circle depthead-toast-icon-circle" style={toast.isError ? { background: '#B91C1C' } : undefined}>
            <span className="staff-toast-icon-check depthead-toast-icon-check">{toast.isError ? '!' : '✓'}</span>
          </div>
          <span className="staff-toast-text depthead-toast-text" style={toast.isError ? { color: '#B91C1C' } : undefined}>{toast.message}</span>
        </div>
      )}

      {/* Top Header Row */}
      <div className="staff-detail-topbar">
        <h1 className="staff-detail-title">Chi tiết hồ sơ {request.request_code}</h1>
        <button type="button" className="staff-detail-btn-back" onClick={() => navigate(`${basePath}/requests`)}>
          ← Danh sách yêu cầu
        </button>
      </div>

      {/* Main Info Card */}
      <div className="staff-detail-card">
        <h2 className="staff-detail-section-title">Thông tin chi tiết</h2>
        <div style={{ height: 16 }} />
        <div className="staff-detail-divider" />

        {infoRows.map(([label, value]) => (
          <React.Fragment key={label}>
            <div className="staff-detail-row">
              <div className="staff-detail-label">{label}</div>
              <div className="staff-detail-value">{value || '—'}</div>
            </div>
            <div className="staff-detail-divider" />
          </React.Fragment>
        ))}

        <div className="staff-detail-row">
          <div className="staff-detail-label">Tài liệu minh chứng</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
            {(request.attachments || []).length === 0 && <span className="staff-detail-value">Không có</span>}
            {(request.attachments || []).map(att => (
              <button
                key={att.attachment_id}
                type="button"
                className="staff-detail-btn-doc"
                onClick={() => handleDownload(att.download_url, att.file_name)}
              >
                {att.is_supplement ? '[Bổ sung] ' : ''}{att.item_name ? `${att.item_name}: ` : ''}{att.file_name} ({formatFileSize(att.file_size)}) ⤓
              </button>
            ))}
          </div>
        </div>
        <div className="staff-detail-divider" />

        <div className="staff-detail-row">
          <div className="staff-detail-label">Trạng thái</div>
          <div style={{ display: 'flex' }}>
            <span style={statusStyle(request.internal_status)}>{request.internal_status}</span>
          </div>
        </div>
        <div className="staff-detail-divider" />

        {request.academic_check && (
          <>
            <div className="staff-detail-row">
              <div className="staff-detail-label">Tình trạng học vụ (Academic MS)</div>
              <div className="staff-detail-value">
                <span style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  background: request.academic_check.is_status_eligible ? '#ECFDF5' : '#FEF2F2',
                  color: request.academic_check.is_status_eligible ? '#047857' : '#B91C1C',
                }}>
                  {request.academic_check.student_status === 'active' && '✓ Đang theo học (active)'}
                  {request.academic_check.student_status === 'graduated' && (request.academic_check.is_status_eligible ? '✓ Đã tốt nghiệp (graduated)' : '✕ Đã tốt nghiệp — Không đủ điều kiện thực tập')}
                  {request.academic_check.student_status === 'suspended' && '✕ Đang bảo lưu (suspended) — Không đang theo học'}
                  {request.academic_check.student_status === 'dismissed' && '✕ Đã buộc thôi học (dismissed)'}
                  {!['active', 'graduated', 'suspended', 'dismissed'].includes(request.academic_check.student_status) && request.academic_check.student_status}
                </span>
              </div>
            </div>
            <div className="staff-detail-divider" />
            {request.academic_check.course_name && (
              <>
                <div className="staff-detail-row">
                  <div className="staff-detail-label">Đối chiếu CTĐT (Academic MS)</div>
                  <div className="staff-detail-value">
                    {request.academic_check.course_in_curriculum ? (
                      <span style={{ color: '#047857', fontWeight: 600 }}>
                        ✓ Học phần &ldquo;{request.academic_check.course_name}&rdquo; ({request.academic_check.matched_course?.course_id}) có trong CTĐT
                      </span>
                    ) : (
                      <span style={{ color: '#C2410C', fontWeight: 600 }}>
                        ⚠ Học phần &ldquo;{request.academic_check.course_name}&rdquo; không có trong CTĐT — Cần bổ sung xác nhận từ Khoa
                      </span>
                    )}
                  </div>
                </div>
                <div className="staff-detail-divider" />
              </>
            )}
          </>
        )}

        {request.result && (
          <>
            <div className="staff-detail-row">
              <div className="staff-detail-label">Kết quả</div>
              <button
                type="button"
                className="staff-detail-btn-doc"
                onClick={() => handleDownload(request.result.pdf_download_url, `${request.result.verification_code}.pdf`)}
              >
                {request.result.verification_code}.pdf ⤓
              </button>
            </div>
            <div className="staff-detail-divider" />
          </>
        )}
      </div>

      {/* Lịch sử xử lý */}
      <div className="staff-detail-card" style={{ marginTop: 16 }}>
        <h2 className="staff-detail-section-title">Lịch sử xử lý</h2>
        <div style={{ height: 16 }} />
        <div className="staff-detail-divider" />
        {timeline.map((log, idx) => (
          <React.Fragment key={`${log.created_at}-${idx}`}>
            <div className="staff-detail-row">
              <div className="staff-detail-label">{formatDateTime(log.created_at)}</div>
              <div className="staff-detail-value">
                <strong>{TIMELINE_ACTION_LABELS[log.action] || log.action}</strong> · {log.performed_by}
                {log.note ? <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{log.note}</div> : null}
              </div>
            </div>
            <div className="staff-detail-divider" />
          </React.Fragment>
        ))}
      </div>

      <div style={{ height: 8 }} />

      {/* Action Buttons Row */}
      <div className="staff-detail-actions-row">
        {isDeptHead && isWaitingAssign && (
          <>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              style={{ padding: '10px 12px', border: '1px solid #E2E5EA', borderRadius: 8, fontSize: 14, minWidth: 240 }}
            >
              <option value="">Chọn chuyên viên phụ trách...</option>
              {members.map(m => (
                <option key={m.user_id} value={m.user_id}>{m.full_name} ({m.current_workload} hồ sơ)</option>
              ))}
            </select>
            <button type="button" className="staff-btn-action-primary" disabled={busy} onClick={handleAssign}>
              {busy ? 'Đang xử lý...' : 'Phân công →'}
            </button>
          </>
        )}
        {isDeptHead && (request.internal_status === 'Chờ TP phê duyệt' || isReviewing) && (
          <>
            <button type="button" className="staff-btn-action-outline" disabled={busy} onClick={() => setShowRejectModal(true)}>
              Từ chối
            </button>
            {request.internal_status === 'Chờ TP phê duyệt' && (
              <button type="button" className="staff-btn-action-outline" disabled={busy} onClick={handleReturnToStaff}>
                Trả chuyên viên
              </button>
            )}
            {request.type_id === 4 ? (
              <button type="button" className="staff-btn-action-primary" disabled={busy} onClick={handleSubmitToPrincipal}>
                {busy ? 'Đang xử lý...' : 'Trình Hiệu trưởng ký số →'}
              </button>
            ) : (
              <button type="button" className="staff-btn-action-primary" disabled={busy} onClick={handleApprove}>
                {busy ? 'Đang xử lý...' : 'Phê duyệt →'}
              </button>
            )}
          </>
        )}
        {!isDeptHead && isReviewing && (
          <>
            <button type="button" className="staff-btn-action-outline" disabled={busy} onClick={() => setShowRejectModal(true)}>
              Từ chối
            </button>
            <button
              type="button"
              className="staff-btn-action-outline"
              disabled={busy}
              onClick={() => {
                if (request.type_id === 2 && request.academic_check && !request.academic_check.course_in_curriculum && !supplementNote) {
                  setSupplementNote('HP không trong CTĐT, vui lòng bổ sung xác nhận từ Khoa.');
                }
                setShowSupplementModal(true);
              }}
            >
              Yêu cầu bổ sung
            </button>
            {request.type_id === 4 ? (
              <button type="button" className="staff-btn-action-primary" disabled={busy} onClick={handleProgressToHead}>
                {busy ? 'Đang xử lý...' : 'Trình Trưởng phòng →'}
              </button>
            ) : (
              <button type="button" className="staff-btn-action-primary" disabled={busy} onClick={handleApprove}>
                {busy ? 'Đang xử lý...' : 'Phê duyệt →'}
              </button>
            )}
          </>
        )}
        {isApproved && (
          <>
            <button type="button" className="staff-btn-action-outline" disabled={busy} onClick={handleRevoke}>
              Thu hồi duyệt
            </button>
            {needsHardCopy && (
              <button
                type="button"
                className="staff-btn-action-primary"
                onClick={() => navigate(`${basePath}/request/${request.request_id}/issue`)}
              >
                Cấp kết quả bản cứng →
              </button>
            )}
          </>
        )}
      </div>

      <SupplementRequestModal
        isOpen={showSupplementModal}
        onClose={() => setShowSupplementModal(false)}
        requestCode={request.request_code}
        studentName={studentLabel}
        supplementCount={`${(request.supplement_count || 0) + 1}`}
        value={supplementNote}
        onChange={(e) => setSupplementNote(e.target.value)}
        onSubmit={handleSupplementSubmit}
      />

      <RejectRequestModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        requestCode={request.request_code}
        studentName={studentLabel}
        reasons={reasons.map(r => r.reason_text)}
        onSubmit={handleRejectSubmit}
      />
    </div>
  );
}

export default StaffRequestDetail;
