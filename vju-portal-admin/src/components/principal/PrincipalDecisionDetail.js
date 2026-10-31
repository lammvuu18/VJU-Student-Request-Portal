import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Modal from '../common/Modal';
import { decisions, statusConfig } from '../../data/mockData';
import { principalApi } from '../../services/api';
import './PrincipalPages.css';

function PrincipalDecisionDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [currentDec, setCurrentDec] = useState(() => {
    return decisions.find(d => d.id === id || String(d.request_id) === String(id) || d.request_code === id) || decisions[0];
  });

  const decision = currentDec;
  const sc = statusConfig[decision.status] || statusConfig.pending;

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState('');
  const [signProvider, setSignProvider] = useState('vnpt_smartca');
  const [rejectReason, setRejectReason] = useState('');
  const [smartCaPrompt, setSmartCaPrompt] = useState(null);

  const handleSign = async () => {
    try {
      const res = await principalApi.signSmartCA({
        request_ids: [decision.request_id || 5],
        provider: signProvider,
        auth_type: 'app_confirmation',
      });
      setSmartCaPrompt(res.data);
      setCurrentDec(prev => ({ ...prev, status: 'signed' }));
      setConfirmAction('sign');
      setShowConfirmModal(true);
    } catch (err) {
      alert('Lỗi ký số: ' + err.message);
    }
  };

  const handleReturnToHead = async () => {
    try {
      await principalApi.returnToHead(decision.request_id || decision.id, {
        reason: rejectReason,
      });
      setShowRejectModal(false);
      setCurrentDec(prev => ({ ...prev, status: 'returned' }));
      setConfirmAction('return');
      setShowConfirmModal(true);
    } catch (err) {
      alert('Lỗi trả hồ sơ: ' + err.message);
    }
  };

  return (
    <div className="principal-decision-detail">
      <a className="back-link" onClick={() => navigate(-1)} style={{ cursor: 'pointer' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Quay lại danh sách
      </a>

      <div className="page-header">
        <div>
          <h1 className="page-title">{decision.title}</h1>
          <p className="page-subtitle">Mã hồ sơ: <strong>{decision.request_code || decision.id}</strong></p>
        </div>
        <Badge label={decision.status === 'signed' ? 'Đã ký số' : sc.label} color={sc.color} bg={sc.bg} />
      </div>

      <div className="two-col" style={{ marginTop: 20 }}>
        <div>
          <div className="card">
            <div className="card-body">
              <h3 className="section-title">Xem trước văn bản trình ký</h3>
              <div className="pdf-preview pdf-preview--large">
                <div className="pdf-header-bar" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#F3F4F6', borderRadius: '6px 6px 0 0' }}>
                  <span style={{ fontWeight: 500, fontSize: 13 }}> {decision.request_code || decision.id}_quyet_dinh.pdf</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn--ghost btn--sm"> Phóng to</button>
                    <button className="btn btn--ghost btn--sm">⬇ Tải bản thảo</button>
                  </div>
                </div>
                <div className="pdf-body" style={{ padding: 24, background: '#fff', border: '1px solid #E5E7EB', borderTop: 'none' }}>
                  <div className="pdf-doc-mock">
                    <div className="pdf-doc-header" style={{ textAlign: 'center', marginBottom: 20 }}>
                      <strong style={{ fontSize: 15, display: 'block' }}>TRƯỜNG ĐẠI HỌC VIỆT NHẬT — ĐHQGHN</strong>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>Hà Nội, ngày 30 tháng 10 năm 2026</span>
                    </div>
                    <h3 style={{ textAlign: 'center', margin: '20px 0', fontSize: 18, color: '#1E3A8A' }}>QUYẾT ĐỊNH</h3>
                    <p style={{ textAlign: 'center', fontStyle: 'italic', color: '#4B5563', marginBottom: 24 }}>
                      V/v: {decision.title}
                    </p>
                    <p style={{ lineHeight: 1.8 }}>Sinh viên: <strong>{decision.student || decision.student_name}</strong></p>
                    <p style={{ lineHeight: 1.8 }}>Loại thủ tục: {decision.type_name || decision.type}</p>
                    <p style={{ lineHeight: 1.8 }}>Đơn vị trình ký: <strong>{decision.submitted_by || 'Phòng Đào tạo'}</strong></p>
                    <p style={{ lineHeight: 1.8 }}>Thời hạn SLA: {decision.sub_sla_deadline ? new Date(decision.sub_sla_deadline).toLocaleString('vi-VN') : '24 giờ'}</p>
                    <div style={{ marginTop: 40, textAlign: 'right' }}>
                      <p><strong>HIỆU TRƯỞNG</strong></p>
                      <p style={{ color: decision.status === 'signed' ? '#059669' : '#9CA3AF', fontWeight: decision.status === 'signed' ? 700 : 400, marginTop: 24 }}>
                        {decision.status === 'signed' ? '✓ ĐÃ KÝ SỐ ĐIỆN TỬ (VNPT SmartCA)' : '(Chờ ký số)'}
                      </p>
                      <p style={{ fontWeight: 600 }}>PGS.TS Nguyễn Văn Bình</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-body">
              <h3 className="section-title">Thông tin hồ sơ trình duyệt</h3>
              <table className="info-table">
                <tbody>
                  <tr><th>Mã hồ sơ</th><td><strong>{decision.request_code || decision.id}</strong></td></tr>
                  <tr><th>Sinh viên</th><td>{decision.student || decision.student_name}</td></tr>
                  <tr><th>Thủ tục</th><td>{decision.type_name || decision.type}</td></tr>
                  <tr><th>Đơn vị trình</th><td>{decision.department_name || decision.department}</td></tr>
                  <tr><th>Người trình</th><td>{decision.submitted_by || 'Trưởng phòng'}</td></tr>
                  <tr><th>Trạng thái</th><td><Badge label={decision.status === 'signed' ? 'Đã ký số' : sc.label} color={sc.color} bg={sc.bg} /></td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {decision.status !== 'signed' && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-body">
                <h3 className="section-title">Thực hiện ký số điện tử</h3>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
                    Dịch vụ ký số từ xa (Remote Signing CA)
                  </label>
                  <div className="radio-group" style={{ display: 'flex', gap: 12 }}>
                    <label className={`radio-card ${signProvider === 'vnpt_smartca' ? 'radio-card--active' : ''}`} style={{ flex: 1, padding: 12, border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer' }}>
                      <input type="radio" name="signProvider" value="vnpt_smartca" checked={signProvider === 'vnpt_smartca'} onChange={() => setSignProvider('vnpt_smartca')} />
                      <div>
                        <strong>VNPT SmartCA</strong>
                        <span style={{ fontSize: 11, color: '#6B7280', display: 'block' }}>Ký di động không cần USB</span>
                      </div>
                    </label>
                    <label className={`radio-card ${signProvider === 'viettel_ca' ? 'radio-card--active' : ''}`} style={{ flex: 1, padding: 12, border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer' }}>
                      <input type="radio" name="signProvider" value="viettel_ca" checked={signProvider === 'viettel_ca'} onChange={() => setSignProvider('viettel_ca')} />
                      <div>
                        <strong>Viettel-CA</strong>
                        <span style={{ fontSize: 11, color: '#6B7280', display: 'block' }}>Smart CA & Cloud PKI</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="action-btn-group" style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Button variant="success" onClick={handleSign}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Ký số ngay (SmartCA Push)
                  </Button>
                  <Button variant="secondary" onClick={() => setShowRejectModal(true)}>
                    ↩ Trả lại Trưởng phòng xem xét lại
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Return to Head Modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Ý kiến trả lại hồ sơ cho Trưởng phòng">
        <div className="modal-field">
          <label>Nội dung ý kiến chỉ đạo của Hiệu trưởng:</label>
          <textarea
            placeholder="Cần làm rõ căn cứ / số liệu trước khi ra quyết định..."
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </div>
        <div className="modal-footer">
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>Hủy</Button>
          <Button variant="danger" onClick={handleReturnToHead}>Xác nhận trả lại</Button>
        </div>
      </Modal>

      {/* Confirm Modal */}
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)}
        title={confirmAction === 'sign' ? 'Ký số văn bản thành công' : 'Đã hoàn trả hồ sơ'}>
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div className="success-icon" style={{ margin: '0 auto 16px', background: '#ECFDF5', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M8 16l6 6 10-10" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.6 }}>
            {confirmAction === 'sign' && (smartCaPrompt?.message || `Quyết định ${decision.request_code || decision.id} đã được đóng dấu chữ ký số điện tử của Hiệu trưởng thành công!`)}
            {confirmAction === 'return' && `Hồ sơ đã được trả về cho Trưởng phòng kèm theo ý kiến chỉ đạo.`}
          </p>
        </div>
        <div className="modal-footer">
          <Button variant="primary" onClick={() => { setShowConfirmModal(false); navigate('/principal/decisions'); }}>
            Về danh sách quyết định
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default PrincipalDecisionDetail;
