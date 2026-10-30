import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Modal from '../common/Modal';
import { allRequests, statusConfig, rejectionReasons } from '../../data/mockData';
import { staffApi } from '../../services/api';
import './DeptHeadPages.css';

function DeptHeadRequestDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [currentReq, setCurrentReq] = useState(() => {
    return allRequests.find(r => r.id === id || String(r.request_id) === String(id) || r.request_code === id) || allRequests[0];
  });

  const request = currentReq;
  const sc = statusConfig[request.internal_status] || statusConfig[request.status] || { label: request.status, color: '#6B7280', bg: '#F3F4F6' };

  const [showSupplementModal, setShowSupplementModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [supplementNote, setSupplementNote] = useState('');
  const [selectedReasonId, setSelectedReasonId] = useState(rejectionReasons[0]?.reason_id || 1);
  const [rejectionNote, setRejectionNote] = useState('');
  const [returnNote, setReturnNote] = useState('');
  const [confirmAction, setConfirmAction] = useState('');

  const handleApprove = async () => {
    try {
      const is3Levels = request.type_id === 4 || request.type_id === 5 || request.type_id === 9;
      if (is3Levels) {
        await staffApi.submitToPrincipal(request.request_id || request.id);
        setCurrentReq(prev => ({ ...prev, internal_status: 'Chờ HT ký số', status: 'Đang xử lý' }));
        setConfirmAction('approve_to_principal');
      } else {
        await staffApi.deptHeadApprove(request.request_id || request.id);
        setCurrentReq(prev => ({ ...prev, internal_status: 'Đã duyệt — Đang chuẩn bị kết quả', status: 'Đã duyệt' }));
        setConfirmAction('approve');
      }
      setShowConfirmModal(true);
    } catch (err) {
      alert('Lỗi phê duyệt: ' + err.message);
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

  const handleSupplement = async () => {
    try {
      await staffApi.requestSupplement(request.request_id || request.id, {
        supplement_notes: supplementNote,
      });
      setCurrentReq(prev => ({
        ...prev,
        status: 'Cần bổ sung',
        internal_status: 'Cần bổ sung',
      }));
      setShowSupplementModal(false);
      setConfirmAction('supplement');
      setShowConfirmModal(true);
    } catch (err) {
      alert('Lỗi gửi yêu cầu bổ sung: ' + err.message);
    }
  };

  const handleReturnToStaff = async () => {
    try {
      await staffApi.returnToStaff(request.request_id || request.id, {
        return_note: returnNote,
      });
      setCurrentReq(prev => ({
        ...prev,
        internal_status: 'CV đang thẩm định',
      }));
      setShowReturnModal(false);
      setConfirmAction('return');
      setShowConfirmModal(true);
    } catch (err) {
      alert('Lỗi trả hồ sơ: ' + err.message);
    }
  };

  return (
    <div className="depthead-request-detail">
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
              <h3 className="section-title">Thông tin hồ sơ yêu cầu</h3>
              <table className="info-table">
                <tbody>
                  <tr><th>Mã hồ sơ</th><td><strong>{request.request_code || request.id}</strong></td></tr>
                  <tr><th>Sinh viên</th><td>{request.student} — {request.mssv}</td></tr>
                  <tr><th>Thủ tục</th><td>{request.procedure || request.type_name}</td></tr>
                  <tr><th>Ngày nộp</th><td>{request.date}</td></tr>
                  <tr><th>Chuyên viên phụ trách</th><td>{request.assignee || 'Chưa phân công'}</td></tr>
                  <tr><th>Hạn cam kết (SLA)</th><td>{request.sla_deadline ? new Date(request.sla_deadline).toLocaleDateString('vi-VN') : 'Theo quy chế'}</td></tr>
                  <tr><th>Trạng thái nội bộ</th><td><Badge label={sc.label} color={sc.color} bg={sc.bg} /></td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-body">
              <h3 className="section-title">Hồ sơ và tài liệu đính kèm</h3>
              <div className="file-list">
                <div className="file-item">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 2H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V6l-4-4z" stroke="#6B7280" strokeWidth="1.2"/><path d="M12 2v4h4" stroke="#6B7280" strokeWidth="1.2"/></svg>
                  <span>don_de_nghi_{request.mssv || '21CS001'}.pdf</span>
                  <button className="btn btn--link btn--sm">Xem</button>
                </div>
                <div className="file-item">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 2H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V6l-4-4z" stroke="#6B7280" strokeWidth="1.2"/><path d="M12 2v4h4" stroke="#6B7280" strokeWidth="1.2"/></svg>
                  <span>giay_to_minh_chung.jpg</span>
                  <button className="btn btn--link btn--sm">Xem</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-body">
              <h3 className="section-title">Hành động của Trưởng phòng</h3>
              <div className="action-btn-group" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Button variant="success" onClick={handleApprove}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Phê duyệt hồ sơ
                </Button>
                <Button variant="secondary" onClick={() => setShowSupplementModal(true)}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  Yêu cầu bổ sung
                </Button>
                <button className="btn btn--secondary" onClick={() => setShowReturnModal(true)} style={{ width: '100%' }}>
                  ↩ Trả lại chuyên viên thẩm định lại
                </button>
                <Button variant="danger" onClick={() => setShowRejectModal(true)}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  Từ chối hồ sơ
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Supplement Modal */}
      <Modal isOpen={showSupplementModal} onClose={() => setShowSupplementModal(false)} title="Yêu cầu bổ sung hồ sơ">
        <div className="modal-field">
          <label>Nội dung yêu cầu sinh viên bổ sung:</label>
          <textarea
            placeholder="Ghi rõ tài liệu, thông tin sinh viên cần bổ sung..."
            rows={4}
            value={supplementNote}
            onChange={(e) => setSupplementNote(e.target.value)}
          />
        </div>
        <div className="modal-footer">
          <Button variant="secondary" onClick={() => setShowSupplementModal(false)}>Hủy</Button>
          <Button variant="primary" onClick={handleSupplement}>Gửi yêu cầu bổ sung</Button>
        </div>
      </Modal>

      {/* Return to Staff Modal */}
      <Modal isOpen={showReturnModal} onClose={() => setShowReturnModal(false)} title="Trả hồ sơ cho chuyên viên">
        <div className="modal-field">
          <label>Ý kiến chỉ đạo / Yêu cầu chỉnh sửa:</label>
          <textarea
            placeholder="Nêu rõ điểm chuyên viên cần kiểm tra hoặc hoàn thiện lại..."
            rows={3}
            value={returnNote}
            onChange={(e) => setReturnNote(e.target.value)}
          />
        </div>
        <div className="modal-footer">
          <Button variant="secondary" onClick={() => setShowReturnModal(false)}>Hủy</Button>
          <Button variant="primary" onClick={handleReturnToStaff}>Xác nhận trả lại</Button>
        </div>
      </Modal>

      {/* Reject Modal using Contract rejectionReasons */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Từ chối yêu cầu (Reject Request)">
        <div className="modal-field">
          <label>Căn cứ lý do từ chối (Danh mục quy định):</label>
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
          <label>Giải thích chi tiết (Ghi chú gửi sinh viên):</label>
          <textarea
            placeholder="Nhập chi tiết lý do từ chối..."
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

      {/* Confirm Result Modal */}
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
            {confirmAction === 'approve_to_principal' && 'Hồ sơ đã được phê duyệt và trình lên Hiệu trưởng ký số qua VNPT/Viettel SmartCA.'}
            {confirmAction === 'approve' && 'Trưởng phòng đã phê duyệt hồ sơ thành công. Hồ sơ đã chuyển sang bước chuẩn bị trao trả kết quả.'}
            {confirmAction === 'supplement' && 'Thông báo yêu cầu bổ sung hồ sơ đã được gửi trực tiếp đến tài khoản sinh viên.'}
            {confirmAction === 'return' && 'Hồ sơ đã được hoàn trả về danh sách xử lý của chuyên viên.'}
            {confirmAction === 'reject' && 'Đã từ chối yêu cầu và gửi lý do thông báo cho sinh viên.'}
          </p>
        </div>
        <div className="modal-footer">
          <Button variant="primary" onClick={() => { setShowConfirmModal(false); navigate('/dept-head/requests'); }}>
            Về danh sách hồ sơ
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default DeptHeadRequestDetail;
