import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Modal from '../common/Modal';
import SupplementRequestModal from '../common/SupplementRequestModal';
import RejectRequestModal from '../common/RejectRequestModal';
import { allRequests } from '../../data/mockData';
import { staffApi } from '../../services/api';
import './DeptHeadPages.css';

function DeptHeadRequestDetail({ defaultOpenSupplement = false, defaultOpenReject = false, defaultStatus = '', defaultToast = '' }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const shouldOpenSupplement = defaultOpenSupplement || searchParams.get('supplement') === 'true' || searchParams.get('modal') === 'supplement' || (typeof window !== 'undefined' && window.location.hash === '#supplement');
  const shouldOpenReject = defaultOpenReject || searchParams.get('reject') === 'true' || searchParams.get('modal') === 'reject' || (typeof window !== 'undefined' && window.location.hash === '#reject');

  // Find request in mock data or fallback to Figma default VJU-2026-0840
  const foundReq = (allRequests || []).find(
    (r) => r.id === id || r.request_code === id || String(r.request_id) === String(id)
  );

  const requestCode = id || foundReq?.request_code || foundReq?.id || 'VJU-2026-0840';
  const procedure = foundReq?.procedure || foundReq?.type_name || 'Cấp bảng điểm';
  const student = foundReq?.student ? `${foundReq.student} — ${foundReq.mssv || '23110150'}` : 'Nguyễn Minh Anh — 23110150';
  const purpose = foundReq?.purpose || foundReq?.form_data?.purpose || 'Xin việc';
  const quantity = foundReq?.quantity || foundReq?.form_data?.quantity || '01';
  const language = foundReq?.language || foundReq?.form_data?.language || 'Tiếng Việt';
  const assignee = foundReq?.assignee || foundReq?.staff_name || 'Nguyễn Văn A';

  const isRejected = defaultStatus === 'Từ chối' || searchParams.get('rejected') === 'true' || searchParams.get('status') === 'rejected' || searchParams.get('action') === 'reject';
  const isSent = searchParams.get('sent') === 'true' || searchParams.get('status') === 'supplement_sent';
  const initialStatus = defaultStatus || (isRejected ? 'Từ chối' : isSent ? 'Cần bổ sung' : (foundReq?.status || 'Đang xử lý'));
  const [currentStatus, setCurrentStatus] = useState(initialStatus);

  const initialToast = defaultToast || (isRejected ? `Đã từ chối yêu cầu ${requestCode}` : isSent ? 'Đã gửi yêu cầu bổ sung cho SV' : '');
  const [toastMsg, setToastMsg] = useState(initialToast);

  // Modals
  const [showDocModal, setShowDocModal] = useState(false);
  const [showSupplementModal, setShowSupplementModal] = useState(shouldOpenSupplement);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(shouldOpenReject);

  // Form notes
  const [supplementNote, setSupplementNote] = useState('');
  const [returnNote, setReturnNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('Hồ sơ không đủ điều kiện xét duyệt');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4500);
  };

  const handleApprove = async () => {
    try {
      if (staffApi && staffApi.deptHeadApprove) {
        await staffApi.deptHeadApprove(requestCode).catch(() => {});
      }
    } catch {}
    setCurrentStatus('Đã duyệt');
    showToast(`Trưởng phòng đã phê duyệt hồ sơ ${requestCode} thành công!`);
  };

  const handleReject = async (data) => {
    const reason = (data && data.reason) ? data.reason : rejectionReason;
    try {
      if (staffApi && staffApi.reject) {
        await staffApi.reject(requestCode, { rejection_reason: reason, notes: data?.notes }).catch(() => {});
      }
    } catch {}
    if (reason) setRejectionReason(reason);
    setShowRejectModal(false);
    setCurrentStatus('Từ chối');
    showToast(`Đã từ chối yêu cầu ${requestCode}`);
  };

  const handleSupplementSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      if (staffApi && staffApi.requestSupplement) {
        await staffApi.requestSupplement(requestCode, { supplement_notes: supplementNote }).catch(() => {});
      }
    } catch {}
    setShowSupplementModal(false);
    setCurrentStatus('Cần bổ sung');
    showToast('Đã gửi yêu cầu bổ sung cho SV');
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    try {
      if (staffApi && staffApi.returnToStaff) {
        await staffApi.returnToStaff(requestCode, { return_note: returnNote }).catch(() => {});
      }
    } catch {}
    setShowReturnModal(false);
    showToast(`Đã chuyển hoàn hồ sơ ${requestCode} về cho chuyên viên ${assignee}!`);
  };

  const getStatusBadge = (st) => {
    if (st === 'Đang xử lý') {
      return (
        <div style={{
          paddingLeft: 8,
          paddingRight: 8,
          paddingTop: 3,
          paddingBottom: 3,
          background: '#DBEAFE',
          borderRadius: 999,
          display: 'inline-flex',
        }}>
          <span style={{ color: '#1D4ED8', fontSize: 12, fontFamily: 'Inter', fontWeight: 500 }}>
            Đang xử lý
          </span>
        </div>
      );
    }
    if (st === 'Chờ phân công') {
      return (
        <div style={{
          paddingLeft: 8,
          paddingRight: 8,
          paddingTop: 3,
          paddingBottom: 3,
          background: '#FEF3C7',
          borderRadius: 999,
          display: 'inline-flex',
        }}>
          <span style={{ color: '#92400E', fontSize: 12, fontFamily: 'Inter', fontWeight: 500 }}>
            Chờ phân công
          </span>
        </div>
      );
    }
    if (st === 'Cần bổ sung') {
      return (
        <div style={{
          paddingLeft: 8,
          paddingRight: 8,
          paddingTop: 3,
          paddingBottom: 3,
          background: '#FEF3C7',
          borderRadius: 999,
          display: 'inline-flex',
        }}>
          <span style={{ color: '#92400E', fontSize: 12, fontFamily: 'Inter', fontWeight: 500 }}>
            Cần bổ sung
          </span>
        </div>
      );
    }
    if (st === 'Từ chối' || st === 'Đã từ chối' || st === 'Đã hủy') {
      return (
        <div style={{
          paddingLeft: 8,
          paddingRight: 8,
          paddingTop: 3,
          paddingBottom: 3,
          background: '#FCE8E8',
          borderRadius: 999,
          display: 'inline-flex',
        }}>
          <span style={{ color: '#AA2327', fontSize: 12, fontFamily: 'Inter', fontWeight: 500 }}>
            Từ chối
          </span>
        </div>
      );
    }
    if (st === 'Đã duyệt' || st === 'Hoàn thành') {
      return (
        <div style={{
          paddingLeft: 8,
          paddingRight: 8,
          paddingTop: 3,
          paddingBottom: 3,
          background: '#DCFCE7',
          borderRadius: 999,
          display: 'inline-flex',
        }}>
          <span style={{ color: '#168039', fontSize: 12, fontFamily: 'Inter', fontWeight: 500 }}>
            {st}
          </span>
        </div>
      );
    }
    return (
      <div style={{
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 3,
        paddingBottom: 3,
        background: '#F3F4F6',
        borderRadius: 999,
        display: 'inline-flex',
      }}>
        <span style={{ color: '#4B5563', fontSize: 12, fontFamily: 'Inter', fontWeight: 500 }}>
          {st}
        </span>
      </div>
    );
  };

  return (
    <div className="depthead-detail-container">
      {/* Toast Notification (Figma Spec) */}
      {toastMsg && (
        <div className="depthead-toast-card">
          <div className="depthead-toast-icon-circle">
            <span className="depthead-toast-icon-check">✓</span>
          </div>
          <span className="depthead-toast-text">{toastMsg}</span>
        </div>
      )}

      {/* Top Header Row */}
      <div className="depthead-detail-topbar">
        <h1 className="depthead-detail-title">Chi tiết hồ sơ</h1>
        <button
          type="button"
          className="btn-depthead-back-list"
          onClick={() => navigate('/dept-head/requests')}
        >
          ← Danh sách yêu cầu
        </button>
      </div>

      {/* Main Details Card (Figma Match) */}
      <div className="depthead-detail-card">
        <h2 className="depthead-detail-card-title">Thông tin chi tiết</h2>
        <div style={{ alignSelf: 'stretch', height: 14 }} />
        <div className="req-detail-divider" />

        {/* Row 1: Mã yêu cầu */}
        <div className="depthead-detail-row">
          <div className="depthead-detail-label">Mã yêu cầu</div>
          <div className="depthead-detail-value">{requestCode}</div>
        </div>
        <div className="req-detail-divider" />

        {/* Row 2: Thủ tục */}
        <div className="depthead-detail-row">
          <div className="depthead-detail-label">Thủ tục</div>
          <div className="depthead-detail-value">{procedure}</div>
        </div>
        <div className="req-detail-divider" />

        {/* Row 3: Sinh viên */}
        <div className="depthead-detail-row">
          <div className="depthead-detail-label">Sinh viên</div>
          <div className="depthead-detail-value">{student}</div>
        </div>
        <div className="req-detail-divider" />

        {/* Row 4: Mục đích */}
        <div className="depthead-detail-row">
          <div className="depthead-detail-label">Mục đích</div>
          <div className="depthead-detail-value">{purpose}</div>
        </div>
        <div className="req-detail-divider" />

        {/* Row 5: Số bản */}
        <div className="depthead-detail-row">
          <div className="depthead-detail-label">Số bản</div>
          <div className="depthead-detail-value">{quantity}</div>
        </div>
        <div className="req-detail-divider" />

        {/* Row 6: Ngôn ngữ */}
        <div className="depthead-detail-row">
          <div className="depthead-detail-label">Ngôn ngữ</div>
          <div className="depthead-detail-value">{language}</div>
        </div>
        <div className="req-detail-divider" />

        {/* Row 7: Tài liệu đính kèm */}
        <div className="depthead-detail-row">
          <div className="depthead-detail-label">Tài liệu đính kèm</div>
          <button
            type="button"
            className="btn-depthead-view-docs"
            onClick={() => setShowDocModal(true)}
          >
            Xem tài liệu ↗
          </button>
        </div>
        <div className="req-detail-divider" />

        {/* Row 8: Trạng thái */}
        <div className="depthead-detail-row">
          <div className="depthead-detail-label">Trạng thái</div>
          {getStatusBadge(currentStatus)}
        </div>
        <div className="req-detail-divider" />

        {/* Row 9: Chuyên viên kiểm tra */}
        <div className="depthead-detail-row">
          <div className="depthead-detail-label">Chuyên viên kiểm tra</div>
          <div className="depthead-detail-value">{assignee}</div>
        </div>
        <div className="req-detail-divider" />
      </div>

      {/* Bottom Action Buttons Row */}
      <div style={{ alignSelf: 'stretch', height: 8 }} />
      <div className="depthead-detail-actions">
        {/* Button: Từ chối (khi chưa từ chối) */}
        {currentStatus !== 'Từ chối' && (
          <button
            type="button"
            className="btn-depthead-action-white"
            style={{ color: '#AA2327', borderColor: '#FCA5A5' }}
            onClick={() => setShowRejectModal(true)}
          >
            Từ chối
          </button>
        )}

        {/* Button 1: Yêu cầu SV bổ sung */}
        <button
          type="button"
          className="btn-depthead-action-white"
          onClick={() => setShowSupplementModal(true)}
        >
          Yêu cầu SV bổ sung
        </button>

        {/* Button 2: Trả chuyên viên */}
        <button
          type="button"
          className="btn-depthead-action-white"
          onClick={() => setShowReturnModal(true)}
        >
          Trả chuyên viên
        </button>

        {/* Button 3: Phê duyệt → */}
        <button
          type="button"
          className="btn-depthead-action-primary"
          onClick={handleApprove}
        >
          Phê duyệt →
        </button>
      </div>

      {/* Modal 1: Xem tài liệu đính kèm */}
      <Modal
        isOpen={showDocModal}
        onClose={() => setShowDocModal(false)}
        title="Tài liệu đính kèm yêu cầu"
      >
        <div style={{ padding: '8px 0', fontFamily: 'Inter, sans-serif' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 14,
            background: '#F9FAFB',
            borderRadius: 8,
            border: '1px solid #E2E5EA',
            marginBottom: 12,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#AA2327" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 2v6h6" stroke="#AA2327" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#1F2937' }}>
                don_de_nghi_cap_bang_diem_{requestCode}.pdf
              </div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                PDF Document • 420 KB • Tải lên ngày 21/10/2026
              </div>
            </div>
            <button
              type="button"
              className="btn-depthead-view-docs"
              onClick={() => showToast('Đang mở xem tài liệu PDF...')}
            >
              Mở tệp
            </button>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 14,
            background: '#F9FAFB',
            borderRadius: 8,
            border: '1px solid #E2E5EA',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="#2563EB" strokeWidth="2" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="#2563EB" />
              <polyline points="21 15 16 10 5 21" stroke="#2563EB" strokeWidth="2" />
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#1F2937' }}>
                giay_to_minh_chung_kem_theo.jpg
              </div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                Image JPG • 1.2 MB • Tải lên ngày 21/10/2026
              </div>
            </div>
            <button
              type="button"
              className="btn-depthead-view-docs"
              onClick={() => showToast('Đang mở xem hình ảnh minh chứng...')}
            >
              Mở tệp
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal 2: Yêu cầu SV bổ sung (Figma Spec) */}
      <SupplementRequestModal
        isOpen={showSupplementModal}
        onClose={() => setShowSupplementModal(false)}
        requestCode={requestCode}
        studentName={student.split(' — ')[0] || student || 'Nguyễn Minh Anh'}
        supplementCount="1/2"
        value={supplementNote}
        onChange={(e) => setSupplementNote(e.target.value)}
        onSubmit={handleSupplementSubmit}
      />

      {/* Modal 3: Trả chuyên viên */}
      <Modal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        title="Trả hồ sơ cho chuyên viên kiểm tra lại"
      >
        <form onSubmit={handleReturnSubmit} style={{ fontFamily: 'Inter, sans-serif' }}>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>
            Nhập ý kiến chỉ đạo hoặc yêu cầu điều chỉnh gửi chuyên viên <strong>{assignee}</strong>:
          </p>
          <textarea
            required
            rows={4}
            value={returnNote}
            onChange={(e) => setReturnNote(e.target.value)}
            placeholder="Ví dụ: Đề nghị kiểm tra lại số tín chỉ tích lũy của học kỳ 2..."
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 8,
              border: '1px solid #E2E5EA',
              fontSize: 13,
              fontFamily: 'Inter, sans-serif',
              boxSizing: 'border-box',
              outline: 'none',
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button
              type="button"
              className="btn-depthead-action-white"
              onClick={() => setShowReturnModal(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn-depthead-action-primary"
            >
              Xác nhận trả hồ sơ
            </button>
          </div>
        </form>
      </Modal>
      {/* Modal 4: Từ chối yêu cầu (Figma Spec) */}
      <RejectRequestModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        requestCode={requestCode}
        studentName={student}
        initialReason={rejectionReason}
        onSubmit={handleReject}
      />
    </div>
  );
}

export default DeptHeadRequestDetail;
