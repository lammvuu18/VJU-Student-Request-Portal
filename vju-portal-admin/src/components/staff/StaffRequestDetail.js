import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Modal from '../common/Modal';
import SupplementRequestModal from '../common/SupplementRequestModal';
import { allRequests, staffMembers, statusConfig, rejectionReasons, departments } from '../../data/mockData';
import { staffApi } from '../../services/api';
import './StaffPages.css';

function StaffRequestDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [currentReq, setCurrentReq] = useState(() => {
    return allRequests.find(r => r.id === id || String(r.request_id) === String(id) || r.request_code === id) || allRequests[1];
  });

  const request = currentReq;
  const sc = statusConfig[request.internal_status] || statusConfig[request.status] || { label: request.status, color: '#6B7280', bg: '#F3F4F6' };

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showSupplementModal, setShowSupplementModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [confirmAction, setConfirmAction] = useState('');
  const [transferDeptId, setTransferDeptId] = useState(departments[0]?.department_id || 1);
  const [transferReason, setTransferReason] = useState('');
  const [supplementNote, setSupplementNote] = useState('');
  const [selectedReasonId, setSelectedReasonId] = useState(rejectionReasons[0]?.reason_id || 1);
  const [rejectionNote, setRejectionNote] = useState('');

  const handleSupplement = async () => {
    try {
      await staffApi.requestSupplement(request.request_id || request.id, {
        supplement_notes: supplementNote,
      });
      setCurrentReq(prev => ({ ...prev, status: 'Cần bổ sung', internal_status: 'Cần bổ sung' }));
      setShowSupplementModal(false);
      setConfirmAction('supplement');
      setShowConfirmModal(true);
    } catch (err) {
      alert('Lỗi gửi yêu cầu bổ sung: ' + err.message);
    }
  };

  const handleTransfer = async () => {
    try {
      await staffApi.transferDepartment(request.request_id || request.id, {
        target_department_id: transferDeptId,
        transfer_notes: transferReason,
      });
      const targetDept = departments.find(d => d.department_id === transferDeptId)?.department_name || 'Phòng ban khác';
      setCurrentReq(prev => ({ ...prev, department_name: targetDept, department: targetDept, internal_status: 'Chờ phân công' }));
      setShowTransferModal(false);
      setConfirmAction('transfer');
      setShowConfirmModal(true);
    } catch (err) {
      alert('Lỗi chuyển tiếp phòng ban: ' + err.message);
    }
  };

  const handleReject = async () => {
    try {
      await staffApi.reject(request.request_id || request.id, {
        reason_id: selectedReasonId,
        rejection_note: rejectionNote,
      });
      setCurrentReq(prev => ({
        ...prev,
        status: 'Từ chối',
        internal_status: 'Từ chối',
        rejection_note: rejectionNote,
      }));
      setShowRejectModal(false);
      setConfirmAction('reject');
      setShowConfirmModal(true);
    } catch (err) {
      alert('Lỗi từ chối yêu cầu: ' + err.message);
    }
  };

  return (
    <div className="staff-request-detail">
      <a className="back-link" onClick={() => navigate(-1)} style={{ cursor: 'pointer' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Quay lại danh sách
      </a>

      <div className="page-header">
        <div>
          <h1 className="page-title">{request.procedure || request.type_name}</h1>
          <p className="page-subtitle">Mã hồ sơ: <strong>{request.request_code || request.id}</strong></p>
        </div>
        <Badge label={sc.label} color={sc.color} bg={sc.bg} />
      </div>

      <div className="two-col">
        <div>
          <div className="card">
            <div className="card-body">
              <h3 className="section-title">Thông tin yêu cầu</h3>
              <table className="info-table">
                <tbody>
                  <tr><th>Mã yêu cầu</th><td><strong>{request.request_code || request.id}</strong></td></tr>
                  <tr><th>Sinh viên</th><td>{request.student} — {request.mssv}</td></tr>
                  <tr><th>Thủ tục</th><td>{request.procedure || request.type_name}</td></tr>
                  <tr><th>Ngày nộp</th><td>{request.date}</td></tr>
                  <tr><th>Trạng thái nội bộ</th><td><Badge label={sc.label} color={sc.color} bg={sc.bg} /></td></tr>
                  <tr><th>Ưu tiên</th><td>{request.priority === 'urgent' ? <Badge label="Gấp (SLA cảnh báo)" color="#DC2626" bg="#FEF2F2" /> : 'Bình thường'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-body">
              <h3 className="section-title">Hồ sơ đính kèm</h3>
              <div className="file-list">
                <div className="file-item">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 2H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V6l-4-4z" stroke="#6B7280" strokeWidth="1.2"/><path d="M12 2v4h4" stroke="#6B7280" strokeWidth="1.2"/></svg>
                  <span>don_yeu_cau.pdf</span>
                  <button className="btn btn--link btn--sm">Xem</button>
                </div>
                <div className="file-item">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 2H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V6l-4-4z" stroke="#6B7280" strokeWidth="1.2"/><path d="M12 2v4h4" stroke="#6B7280" strokeWidth="1.2"/></svg>
                  <span>minh_chung_kem_theo.jpg</span>
                  <button className="btn btn--link btn--sm">Xem</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-body">
              <h3 className="section-title">Hành động của Chuyên viên</h3>
              <div className="action-btn-group" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Button variant="primary" onClick={() => navigate(`/staff/request/${request.id}/review`)}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Thẩm định hồ sơ
                </Button>
                <Button variant="secondary" onClick={() => setShowSupplementModal(true)}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  Yêu cầu bổ sung
                </Button>
                <Button variant="outline-red" onClick={() => setShowTransferModal(true)}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8h8m0 0l-3-3m3 3l-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Chuyển tiếp phòng ban
                </Button>
                <Button variant="danger" onClick={() => setShowRejectModal(true)}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  Từ chối yêu cầu
                </Button>
                <Button variant="success" onClick={() => navigate(`/staff/request/${request.id}/issue`)}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 2H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V6l-4-4z" stroke="currentColor" strokeWidth="1.2"/></svg>
                  Cấp kết quả & Hẹn nhận
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Supplement Modal (Figma Spec) */}
      <SupplementRequestModal
        isOpen={showSupplementModal}
        onClose={() => setShowSupplementModal(false)}
        requestCode={request.request_code || request.id || 'VJU-2026-0840'}
        studentName={request.student || 'Nguyễn Minh Anh'}
        supplementCount="1/2"
        value={supplementNote}
        onChange={(e) => setSupplementNote(e.target.value)}
        onSubmit={handleSupplement}
      />

      {/* Transfer Department Modal (Contract Section 9.7) */}
      <Modal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} title="Chuyển tiếp hồ sơ sang phòng ban khác">
        <div className="modal-field">
          <label>Chọn phòng ban tiếp nhận:</label>
          <select
            className="filter-select"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 6 }}
            value={transferDeptId}
            onChange={(e) => setTransferDeptId(parseInt(e.target.value))}
          >
            {departments.map(d => (
              <option key={d.department_id} value={d.department_id}>
                {d.department_name} ({d.short_name})
              </option>
            ))}
          </select>
        </div>
        <div className="modal-field" style={{ marginTop: 12 }}>
          <label>Lý do chuyển tiếp hồ sơ:</label>
          <textarea
            placeholder="Nhập lý do chuyển tiếp phòng ban..."
            rows={3}
            value={transferReason}
            onChange={(e) => setTransferReason(e.target.value)}
          />
        </div>
        <div className="modal-footer">
          <Button variant="secondary" onClick={() => setShowTransferModal(false)}>Hủy</Button>
          <Button variant="primary" onClick={handleTransfer}>Xác nhận chuyển tiếp</Button>
        </div>
      </Modal>

      {/* Reject Modal using Contract rejectionReasons */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Từ chối hồ sơ (Reject Request)">
        <div className="modal-field">
          <label>Căn cứ lý do từ chối:</label>
          <select
            value={selectedReasonId}
            onChange={(e) => setSelectedReasonId(parseInt(e.target.value))}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #D1D5DB' }}
          >
            {rejectionReasons.map(r => (
              <option key={r.reason_id} value={r.reason_id}>
                {r.reason_text}
              </option>
            ))}
          </select>
        </div>
        <div className="modal-field" style={{ marginTop: 12 }}>
          <label>Ghi chú chi tiết cho sinh viên:</label>
          <textarea
            placeholder="Giải thích cụ thể lý do không thể tiếp nhận..."
            rows={3}
            value={rejectionNote}
            onChange={(e) => setRejectionNote(e.target.value)}
          />
        </div>
        <div className="modal-footer">
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>Hủy</Button>
          <Button variant="danger" onClick={handleReject}>Xác nhận từ chối</Button>
        </div>
      </Modal>

      {/* Confirm Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Thao tác thành công"
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div className="success-icon" style={{ margin: '0 auto 16px', background: '#ECFDF5', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <path d="M8 16l6 6 10-10" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.6 }}>
            {confirmAction === 'supplement' && 'Yêu cầu bổ sung đã được gửi thành công đến sinh viên.'}
            {confirmAction === 'transfer' && 'Hồ sơ đã được chuyển tiếp sang phòng ban mới thành công.'}
            {confirmAction === 'reject' && 'Đã từ chối yêu cầu và cập nhật lý do cho sinh viên.'}
          </p>
        </div>
        <div className="modal-footer">
          <Button variant="primary" onClick={() => { setShowConfirmModal(false); navigate('/staff/requests'); }}>
            Về danh sách hồ sơ
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default StaffRequestDetail;
