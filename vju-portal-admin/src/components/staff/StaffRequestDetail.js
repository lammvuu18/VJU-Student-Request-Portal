import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Modal from '../common/Modal';
import SupplementRequestModal from '../common/SupplementRequestModal';
import RejectRequestModal from '../common/RejectRequestModal';
import TransferRequestModal from '../common/TransferRequestModal';
import { allRequests, departments, rejectionReasons } from '../../data/mockData';
import { staffApi } from '../../services/api';
import './StaffPages.css';

function StaffRequestDetail({ defaultStatus = '', defaultToast = '' }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const shouldOpenTransfer = searchParams.get('transfer') === 'true' || searchParams.get('modal') === 'transfer' || (typeof window !== 'undefined' && window.location.hash === '#transfer');
  const isTransferredParam = defaultStatus === 'Đã chuyển PB' || searchParams.get('transferred') === 'true' || searchParams.get('status') === 'transferred';

  // Find request in mock data or fallback to Figma default VJU-2026-0840
  const foundReq = (allRequests || []).find(
    (r) => r.id === id || r.request_code === id || String(r.request_id) === String(id)
  );

  const requestCode = id || foundReq?.request_code || foundReq?.id || 'VJU-2026-0840';
  const procedure = foundReq?.procedure || foundReq?.type_name || 'Cấp bảng điểm';
  const student = foundReq?.student
    ? `${foundReq.student} — ${foundReq.mssv || '23110150'}`
    : 'Nguyễn Minh Anh — 23110150';
  const purpose = foundReq?.purpose || foundReq?.form_data?.purpose || 'Xin việc';
  const quantity = foundReq?.quantity || foundReq?.form_data?.quantity || '01';
  const language = foundReq?.language || foundReq?.form_data?.language || 'Tiếng Việt';

  const initialStatus = defaultStatus || (isTransferredParam ? 'Đã chuyển PB' : (foundReq?.status || 'Đang thẩm định'));
  const [currentStatus, setCurrentStatus] = useState(initialStatus);

  const initialToast = defaultToast || (isTransferredParam ? 'Đã chuyển yêu cầu sang Phòng KHTC' : '');
  const [toastMsg, setToastMsg] = useState(initialToast);

  // Modals
  const [showDocModal, setShowDocModal] = useState(false);
  const [showSupplementModal, setShowSupplementModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(shouldOpenTransfer);

  // Transfer state
  const [transferDeptId, setTransferDeptId] = useState(departments[0]?.department_id || 1);
  const [transferReason, setTransferReason] = useState('');

  // Rejection note
  const [rejectionNote, setRejectionNote] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4500);
  };

  // Status badge config
  const getStatusBadge = (st) => {
    if (st === 'Đã chuyển PB' || st === 'transferred') {
      return {
        label: 'Đã chuyển PB',
        bg: '#F0F0F0',
        color: '#6B7280',
      };
    }
    if (st === 'Từ chối' || st === 'Đã từ chối') {
      return {
        label: 'Từ chối',
        bg: '#FCE8E8',
        color: '#AA2327',
      };
    }
    if (st === 'Cần bổ sung' || st === 'Chờ bổ sung') {
      return {
        label: 'Cần bổ sung',
        bg: '#FEF3C7',
        color: '#92400E',
      };
    }
    if (st === 'Đã duyệt' || st === 'Hoàn thành') {
      return {
        label: 'Hoàn thành',
        bg: '#DCFCE7',
        color: '#168039',
      };
    }
    return {
      label: 'Đang thẩm định',
      bg: '#DBEAFE',
      color: '#1D4ED8',
    };
  };

  const statusBadge = getStatusBadge(currentStatus);

  // Actions
  const handleApprove = async () => {
    if (procedure === 'Phúc khảo' || requestCode === 'VJU-2026-0835') {
      navigate(`/staff/request/${requestCode}/review`);
      return;
    }
    try {
      if (staffApi && staffApi.approve) {
        await staffApi.approve(requestCode).catch(() => {});
      }
    } catch {}
    setCurrentStatus('Đã duyệt');
    showToast(`Chuyên viên đã phê duyệt hồ sơ ${requestCode} thành công!`);
  };

  const handleSupplementSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      if (staffApi && staffApi.requestSupplement) {
        await staffApi.requestSupplement(requestCode, {}).catch(() => {});
      }
    } catch {}
    setShowSupplementModal(false);
    setCurrentStatus('Cần bổ sung');
    showToast('Đã gửi yêu cầu bổ sung cho SV');
  };

  const handleRejectSubmit = async (data) => {
    const reason = data?.reason || 'Hồ sơ không đủ điều kiện xét duyệt';
    try {
      if (staffApi && staffApi.reject) {
        await staffApi.reject(requestCode, { rejection_reason: reason, notes: data?.notes }).catch(() => {});
      }
    } catch {}
    setShowRejectModal(false);
    setCurrentStatus('Từ chối');
    showToast(`Đã từ chối yêu cầu ${requestCode}`);
  };

  const handleTransferSubmit = async ({ department, notes }) => {
    try {
      if (staffApi && staffApi.transferDepartment) {
        await staffApi.transferDepartment(requestCode, {
          target_department_name: department,
          transfer_notes: notes,
        }).catch(() => {});
      }
    } catch {}
    setShowTransferModal(false);
    setCurrentStatus('Đã chuyển PB');
    let deptShort = department;
    if (deptShort.includes('Kế hoạch') || deptShort.includes('Tài chính')) {
      deptShort = 'Phòng KHTC';
    } else if (deptShort.includes('Công tác Sinh viên')) {
      deptShort = 'Phòng CTSV';
    } else if (deptShort.includes('Đào tạo')) {
      deptShort = 'Phòng Đào tạo';
    }
    showToast(`Đã chuyển yêu cầu sang ${deptShort}`);
  };

  return (
    <div className="staff-detail-container">
      {/* Toast Notification (Figma spec) */}
      {toastMsg && (
        <div className="depthead-toast-card">
          <div className="depthead-toast-icon-circle">
            <span className="depthead-toast-icon-check">✓</span>
          </div>
          <span className="depthead-toast-text">{toastMsg}</span>
        </div>
      )}

      {/* Top Header Row */}
      <div className="staff-detail-topbar">
        <h1 className="staff-detail-title">Chi tiết hồ sơ {requestCode}</h1>
        <button
          type="button"
          className="staff-detail-btn-back"
          onClick={() => navigate('/staff/requests')}
        >
          ← Danh sách yêu cầu
        </button>
      </div>

      {/* Main Info Card */}
      <div className="staff-detail-card">
        <h2 className="staff-detail-section-title">Thông tin chi tiết</h2>
        <div style={{ height: 16 }} />
        <div className="staff-detail-divider" />

        {/* Row 1: Mã yêu cầu */}
        <div className="staff-detail-row">
          <div className="staff-detail-label">Mã yêu cầu</div>
          <div className="staff-detail-value">{requestCode}</div>
        </div>
        <div className="staff-detail-divider" />

        {/* Row 2: Thủ tục */}
        <div className="staff-detail-row">
          <div className="staff-detail-label">Thủ tục</div>
          <div className="staff-detail-value">{procedure}</div>
        </div>
        <div className="staff-detail-divider" />

        {/* Row 3: Sinh viên */}
        <div className="staff-detail-row">
          <div className="staff-detail-label">Sinh viên</div>
          <div className="staff-detail-value">{student}</div>
        </div>
        <div className="staff-detail-divider" />

        {/* Row 4: Mục đích */}
        <div className="staff-detail-row">
          <div className="staff-detail-label">Mục đích</div>
          <div className="staff-detail-value">{purpose}</div>
        </div>
        <div className="staff-detail-divider" />

        {/* Row 5: Số bản */}
        <div className="staff-detail-row">
          <div className="staff-detail-label">Số bản</div>
          <div className="staff-detail-value">{quantity}</div>
        </div>
        <div className="staff-detail-divider" />

        {/* Row 6: Ngôn ngữ */}
        <div className="staff-detail-row">
          <div className="staff-detail-label">Ngôn ngữ</div>
          <div className="staff-detail-value">{language}</div>
        </div>
        <div className="staff-detail-divider" />

        {/* Row 7: Tài liệu minh chứng */}
        <div className="staff-detail-row">
          <div className="staff-detail-label">Tài liệu minh chứng</div>
          <button
            type="button"
            className="staff-detail-btn-doc"
            onClick={() => setShowDocModal(true)}
          >
            Xem tài liệu ↗
          </button>
        </div>
        <div className="staff-detail-divider" />

        {/* Row 8: Trạng thái */}
        <div className="staff-detail-row">
          <div className="staff-detail-label">Trạng thái</div>
          <div style={{ display: 'flex' }}>
            <span
              style={{
                background: statusBadge.bg,
                color: statusBadge.color,
                padding: '3px 8px',
                borderRadius: 999,
                fontSize: 12,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {statusBadge.label}
            </span>
          </div>
        </div>
        <div className="staff-detail-divider" />
      </div>

      <div style={{ height: 8 }} />

      {/* Action Buttons Row */}
      <div className="staff-detail-actions-row">
        {/* Nút: Từ chối */}
        <button
          type="button"
          disabled={currentStatus === 'Đã chuyển PB'}
          className={`staff-btn-action-outline ${currentStatus === 'Đã chuyển PB' ? 'staff-btn-action--disabled' : ''}`}
          onClick={() => currentStatus !== 'Đã chuyển PB' && setShowRejectModal(true)}
        >
          Từ chối
        </button>

        {/* Nút: Yêu cầu bổ sung */}
        <button
          type="button"
          disabled={currentStatus === 'Đã chuyển PB'}
          className={`staff-btn-action-outline ${currentStatus === 'Đã chuyển PB' ? 'staff-btn-action--disabled' : ''}`}
          onClick={() => currentStatus !== 'Đã chuyển PB' && setShowSupplementModal(true)}
        >
          Yêu cầu bổ sung
        </button>

        {/* Nút: Chuyển phòng ban */}
        <button
          type="button"
          disabled={currentStatus === 'Đã chuyển PB'}
          className={`staff-btn-action-outline ${currentStatus === 'Đã chuyển PB' ? 'staff-btn-action--disabled' : ''}`}
          onClick={() => currentStatus !== 'Đã chuyển PB' && setShowTransferModal(true)}
        >
          Chuyển phòng ban
        </button>

        {/* Nút: Phê duyệt / Cấp kết quả */}
        {currentStatus === 'Đã duyệt' ? (
          <button
            type="button"
            className="staff-btn-action-primary"
            onClick={() => navigate(`/staff/request/${requestCode}/issue`)}
          >
            Cấp kết quả →
          </button>
        ) : (
          <button
            type="button"
            disabled={currentStatus === 'Đã chuyển PB'}
            className={`staff-btn-action-primary ${currentStatus === 'Đã chuyển PB' ? 'staff-btn-action--disabled' : ''}`}
            onClick={() => currentStatus !== 'Đã chuyển PB' && handleApprove()}
          >
            Phê duyệt →
          </button>
        )}
      </div>

      {/* Modal 1: Xem tài liệu minh chứng */}
      <Modal
        isOpen={showDocModal}
        onClose={() => setShowDocModal(false)}
        title="Tài liệu minh chứng đính kèm"
      >
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
            Hồ sơ đính kèm của sinh viên {student}:
          </p>
          <div
            style={{
              padding: '16px',
              border: '1px solid #E2E5EA',
              borderRadius: 8,
              background: '#F9FAFB',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#1F2937' }}>
                📄 don_yeu_cau_cap_bang_diem.pdf
              </span>
              <a
                href="#download"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Đang tải tệp đính kèm: don_yeu_cau_cap_bang_diem.pdf');
                }}
                style={{ color: '#AA2327', fontSize: 13, fontWeight: 500 }}
              >
                Tải xuống ⤓
              </a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#1F2937' }}>
                📄 cccd_minh_chung.jpg
              </span>
              <a
                href="#download"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Đang tải tệp đính kèm: cccd_minh_chung.jpg');
                }}
                style={{ color: '#AA2327', fontSize: 13, fontWeight: 500 }}
              >
                Tải xuống ⤓
              </a>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button
              type="button"
              className="staff-btn-action-outline"
              onClick={() => setShowDocModal(false)}
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal 2: Yêu cầu sinh viên bổ sung hồ sơ (Figma Spec) */}
      <SupplementRequestModal
        isOpen={showSupplementModal}
        onClose={() => setShowSupplementModal(false)}
        requestCode={requestCode}
        studentName={student}
        supplementCount="1/2"
        onSubmit={handleSupplementSubmit}
      />

      {/* Modal 3: Từ chối yêu cầu (Figma Spec) */}
      <RejectRequestModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        requestCode={requestCode}
        studentName={student}
        onSubmit={handleRejectSubmit}
      />

      {/* Modal 4: Chuyển yêu cầu sang phòng ban khác (Figma Spec) */}
      <TransferRequestModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        requestCode={requestCode}
        studentName={student}
        procedureName={procedure}
        departmentList={departments}
        initialNotes={transferReason}
        onSubmit={handleTransferSubmit}
      />
    </div>
  );
}

export default StaffRequestDetail;
