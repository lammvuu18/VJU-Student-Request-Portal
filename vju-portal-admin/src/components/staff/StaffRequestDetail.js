import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SupplementRequestModal from '../common/SupplementRequestModal';
import RejectRequestModal from '../common/RejectRequestModal';
import TransferRequestModal from '../common/TransferRequestModal';
import RefundProgressCard from '../common/RefundProgressCard';
import api, { getSavedRole, normalizeRole } from '../../services/api';
import {
  formatDate, formatDateTime, formatFileSize, formatFieldValue, statusStyle, FIELD_LABELS, TIMELINE_ACTION_LABELS,
  isAppealProcedure, isPreservationProcedure, isInternshipProcedure, isExemptionProcedure, isRefundProcedure,
} from '../../utils/format';
import './StaffPages.css';

const WAITING_ASSIGN = 'Chờ phân công';
const REVIEWING = 'CV đang thẩm định';
const APPROVED = 'Đã duyệt — Đang chuẩn bị kết quả';
const MIN_REJECT_NOTE = 20;

/**
 * Chi tiết hồ sơ cho chuyên viên / trưởng phòng:
 * - Quy trình 1 cấp: CV Từ chối / Yêu cầu bổ sung / Phê duyệt; Thu hồi trong 30 phút; cấp bản cứng
 * - Quy trình 3 cấp: CV trình TP → TP trình Hiệu trưởng ký số
 * - Miễn giảm học phí: CV Phòng CTSV xác minh rồi chuyển Phòng KHTC thẩm định (CTSV chỉ xem sau khi chuyển)
 * - Hoàn trả học phí: sau khi HT ký, theo dõi Finance MS → lệnh chi → ngân hàng xác nhận
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
  const [showTransferModal, setShowTransferModal] = useState(false);
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
      setAssigneeId(detailRes.data?.assigned_staff?.user_id ? String(detailRes.data.assigned_staff.user_id) : '');
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
      if (isDeptHead) {
        api.staff.getDepartmentMembers()
          .then(mRes => setMembers(mRes.data || []))
          .catch(() => {});
      }
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

  const handleApprove = () => {
    if (isDeptHead || isAppealProcedure(request) || Number(request?.approval_levels) === 2) {
      return runAction(
        () => api.staff.approveHead(request.request_id),
        'Đã phê duyệt hồ sơ.'
      );
    }
    return runAction(() => api.staff.approve(request.request_id), 'Đã duyệt hồ sơ.');
  };

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

  const handleTransferSubmit = async ({ notes }) => {
    const note = (notes || '').trim();
    if (!note) {
      showToast('Vui lòng nhập ghi chú chuyển (phần đã xác minh).', true);
      return;
    }
    const ok = await runAction(
      () => api.staff.transfer(request.request_id, note, request.transfer_target?.dept_id),
      'Đã chuyển hồ sơ sang Phòng Kế hoạch Tài chính.'
    );
    if (ok) setShowTransferModal(false);
  };

  const handleRetryPayout = () => runAction(
    () => api.staff.retryRefundPayout(request.request_id),
    'Đã lập lại lệnh chi.'
  );

  const handleSimulateBank = (outcome) => runAction(
    () => api.staff.simulateBankCallback(
      request.request_id,
      outcome,
      outcome === 'failed' ? 'Tài khoản thụ hưởng không hợp lệ' : ''
    ),
    outcome === 'success' ? 'Ngân hàng đã xác nhận chuyển khoản.' : 'Ngân hàng báo chi thất bại.'
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
  const isWaitingAssign = request.internal_status === WAITING_ASSIGN
    || Boolean(request.internal_status && request.internal_status.endsWith('chờ phân công'));
  const isReviewing = request.internal_status === REVIEWING;
  // Phòng đang giữ đơn mới thao tác; đơn đã chuyển sang phòng khác thì chỉ xem
  const canAct = request.viewer_can_act !== false;
  const isExemption = isExemptionProcedure(request);
  const isRefund = isRefundProcedure(request);
  const mustTransfer = isExemption && Boolean(request.transfer_target);
  const financeCheck = request.finance_check;
  const isApproved = request.internal_status === APPROVED;
  const canAssignOrReassign = (
    isWaitingAssign ||
    isReviewing ||
    request.internal_status === 'Cần bổ sung' ||
    request.internal_status === 'Chờ TP phê duyệt' ||
    (request.internal_status && request.internal_status.endsWith('chờ phân công'))
  );
  const isAppeal = isAppealProcedure(request);
  const isPreservation = isPreservationProcedure(request);
  const isInternship = isInternshipProcedure(request);
  const preference = request.result_preference || request.form_data?.result_preference;
  const needsHardCopy = preference === 'Bản cứng' || preference === 'Cả hai' || isInternship;
  const reviewData = (request.form_data && typeof request.form_data.review_data === 'object')
    ? request.form_data.review_data
    : null;
  const formEntries = Object.entries(request.form_data || {}).filter(
    ([key, v]) =>
      key !== 'review_data' &&
      !(isAppeal && key === 'gpa') &&
      v !== '' &&
      v !== null &&
      v !== undefined &&
      typeof v !== 'object'
  );

  const infoRows = [
    ['Mã yêu cầu', request.request_code],
    ['Thủ tục', request.type_name],
    ['Sinh viên', studentLabel],
    ['Lớp / Khóa / Ngành', [student.class_name, student.cohort, student.major].filter(Boolean).join(' / ')],
    ['Email', student.email],
    ...formEntries
      .filter(([key]) => !['full_name', 'mssv', 'class_name', 'cohort', 'major', 'email', 'cancel_reason'].includes(key))
      .map(([key, value]) => [FIELD_LABELS[key] || key, formatFieldValue(key, value)]),
    ['Phòng đang xử lý', request.department_name],
    ...(request.origin_department_name && request.origin_department_name !== request.department_name
      ? [['Phòng tiếp nhận ban đầu', request.origin_department_name]]
      : []),
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

      {!canAct && (
        <div style={{
          background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 8, padding: '12px 16px',
          marginBottom: 16, color: '#374151', fontSize: 14,
        }}>
          {request.origin_department_name && request.origin_department_name !== request.department_name
            ? <>Hồ sơ đã chuyển sang <strong>{request.department_name}</strong> xử lý. Phòng bạn chỉ theo dõi, không thao tác được.</>
            : <>Bạn đang xem hồ sơ ở chế độ chỉ xem (không được phân công xử lý).</>}
        </div>
      )}

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

        {isRefund && financeCheck && (
          <>
            <div className="staff-detail-row">
              <div className="staff-detail-label">Đối chiếu học phí (Finance MS)</div>
              <div className="staff-detail-value">
                {financeCheck.error ? (
                  <span style={{ color: '#B91C1C' }}>{financeCheck.error}</span>
                ) : (
                  <span style={{ color: financeCheck.is_amount_valid ? '#047857' : '#C2410C', fontWeight: 600 }}>
                    {financeCheck.is_amount_valid ? '✓' : '⚠'} Đã đóng {financeCheck.amount_paid_text}
                    {financeCheck.semester ? ` (${financeCheck.semester})` : ''} · Đề nghị hoàn {financeCheck.requested_amount_text}
                    {financeCheck.is_amount_valid ? '' : ' — vượt số đã đóng'}
                    <div style={{ fontWeight: 400, color: '#6B7280', fontSize: 12 }}>Biên lai: {financeCheck.receipt_no}</div>
                  </span>
                )}
              </div>
            </div>
            <div className="staff-detail-divider" />
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

      {isRefund && (
        <RefundProgressCard
          refund={request.refund}
          canOperate={canAct}
          busy={busy}
          onRetry={handleRetryPayout}
          onSimulate={handleSimulateBank}
        />
      )}

      {/* Kết quả thẩm định phúc khảo (Chuyên viên đã nhập ở màn D4) */}
      {reviewData && (
        <div className="staff-detail-card" style={{ marginTop: 16 }}>
          <h2 className="staff-detail-section-title">Kết quả thẩm định phúc khảo</h2>
          <div style={{ height: 16 }} />
          <div className="staff-detail-divider" />

          <div className="staff-detail-row">
            <div className="staff-detail-label">Điểm giáo viên 1</div>
            <div className="staff-detail-value" style={{ fontWeight: 600 }}>
              {reviewData.grade_reviewer_1 !== undefined && reviewData.grade_reviewer_1 !== null
                ? String(reviewData.grade_reviewer_1)
                : '—'}
            </div>
          </div>
          <div className="staff-detail-divider" />

          <div className="staff-detail-row">
            <div className="staff-detail-label">Điểm giáo viên 2</div>
            <div className="staff-detail-value" style={{ fontWeight: 600 }}>
              {reviewData.grade_reviewer_2 !== undefined && reviewData.grade_reviewer_2 !== null
                ? String(reviewData.grade_reviewer_2)
                : '—'}
            </div>
          </div>
          <div className="staff-detail-divider" />

          <div className="staff-detail-row">
            <div className="staff-detail-label">Điểm cuối (Sau phúc khảo)</div>
            <div className="staff-detail-value" style={{ fontWeight: 700, color: '#AA2327', fontSize: 15 }}>
              {reviewData.final_grade !== undefined && reviewData.final_grade !== null
                ? String(reviewData.final_grade)
                : '—'}
            </div>
          </div>
          <div className="staff-detail-divider" />

          <div className="staff-detail-row">
            <div className="staff-detail-label">Biên bản phúc khảo</div>
            <div className="staff-detail-value">
              {reviewData.download_url ? (
                <button
                  type="button"
                  className="staff-detail-btn-doc"
                  onClick={() => handleDownload(reviewData.download_url, reviewData.file_name || 'bien_ban_phuc_khao.pdf')}
                >
                  {reviewData.file_name || 'Biên bản phúc khảo'} ⤓
                </button>
              ) : (
                <span>{reviewData.file_name || 'Không đính kèm'}</span>
              )}
            </div>
          </div>
          <div className="staff-detail-divider" />

          <div className="staff-detail-row">
            <div className="staff-detail-label">Ý kiến thẩm định</div>
            <div className="staff-detail-value" style={{ whiteSpace: 'pre-wrap' }}>
              {reviewData.note || '—'}
            </div>
          </div>
          <div className="staff-detail-divider" />

          {reviewData.reviewed_by && (
            <>
              <div className="staff-detail-row">
                <div className="staff-detail-label">Chuyên viên thẩm định</div>
                <div className="staff-detail-value">
                  {reviewData.reviewed_by}
                  {reviewData.reviewed_at ? ` (${formatDateTime(reviewData.reviewed_at)})` : ''}
                </div>
              </div>
              <div className="staff-detail-divider" />
            </>
          )}
        </div>
      )}

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

      {/* Action Buttons Row: chỉ phòng đang giữ đơn mới có thao tác */}
      {canAct && (
      <div className="staff-detail-actions-row">
        {isDeptHead && canAssignOrReassign && (
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
            <button
              type="button"
              className={isWaitingAssign ? 'staff-btn-action-primary' : 'staff-btn-action-outline'}
              disabled={busy}
              onClick={handleAssign}
            >
              {busy ? 'Đang xử lý...' : (request.assigned_staff ? 'Đổi chuyên viên' : 'Phân công →')}
            </button>
          </>
        )}
        {isDeptHead && (request.internal_status === 'Chờ TP phê duyệt' || isReviewing) && (
          <>
            <button type="button" className="staff-btn-action-outline" disabled={busy} onClick={() => setShowRejectModal(true)}>
              Từ chối
            </button>
            {request.internal_status === 'Chờ TP phê duyệt' && (
              <>
                <button type="button" className="staff-btn-action-outline" disabled={busy} onClick={handleReturnToStaff}>
                  Trả chuyên viên
                </button>
                {(isPreservation || (Number(request.approval_levels) === 3 && !isAppeal)) ? (
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
                if (isInternship && request.academic_check && !request.academic_check.course_in_curriculum && !supplementNote) {
                  setSupplementNote('HP không trong CTĐT, vui lòng bổ sung xác nhận từ Khoa.');
                }
                setShowSupplementModal(true);
              }}
            >
              Yêu cầu bổ sung
            </button>
            {isAppeal ? (
              <button
                type="button"
                className="staff-btn-action-primary"
                disabled={busy}
                onClick={() => navigate(`/staff/request/${request.request_id}/review`)}
              >
                Thẩm định →
              </button>
            ) : mustTransfer ? (
              <button type="button" className="staff-btn-action-primary" disabled={busy} onClick={() => setShowTransferModal(true)}>
                Chuyển P.KHTC →
              </button>
            ) : (isPreservation || Number(request.approval_levels) >= 2) ? (
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
      )}

      <TransferRequestModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        requestCode={request.request_code}
        studentName={studentLabel}
        procedureName={request.type_name}
        departmentList={request.transfer_target ? [request.transfer_target.name] : []}
        initialDepartment={request.transfer_target?.name || ''}
        onSubmit={handleTransferSubmit}
      />

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
