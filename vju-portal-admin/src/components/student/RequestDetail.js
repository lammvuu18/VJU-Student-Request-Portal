import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Modal from '../common/Modal';
import { allRequests, statusConfig, users } from '../../data/mockData';
import { requestApi } from '../../services/api';
import './StudentPages.css';

function RequestDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [currentReq, setCurrentReq] = useState(() => {
    return allRequests.find(r => r.id === id || String(r.request_id) === String(id) || r.request_code === id) || allRequests[0];
  });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const request = currentReq;
  const sc = statusConfig[request.status] || statusConfig[request.internal_status] || { label: request.status, color: '#6B7280', bg: '#F3F4F6' };
  const student = users.student;

  const timeline = [
    { date: request.date || '28/10/2026', event: 'Nộp yêu cầu', desc: 'Hồ sơ đã được nộp thành công qua cổng dịch vụ công VJU' },
    { date: request.lastUpdate || request.date || '29/10/2026', event: 'Tiến độ xử lý', desc: `Trạng thái hiện tại: "${sc.label}"` },
  ];

  const canSupplement = request.status === 'supplement' || request.status === 'Cần bổ sung' || request.internal_status === 'Cần bổ sung';
  const canReceive = request.status === 'completed' || request.status === 'Đã duyệt' || request.status === 'Đã xử lý';
  const canFeedback = canReceive;
  const canCancel = request.status === 'Chờ thanh toán' || request.status === 'Đã gửi' || request.status === 'pending' || request.internal_status === 'Chờ phân công';

  const handleCancelRequest = async () => {
    try {
      await requestApi.cancel(request.request_id || request.id, cancelReason);
      setCurrentReq(prev => ({
        ...prev,
        status: 'Đã hủy',
        internal_status: 'Đã hủy',
      }));
      setShowCancelModal(false);
      setToastMsg('Đã hủy yêu cầu thành công!');
      setTimeout(() => setToastMsg(''), 4000);
    } catch (err) {
      alert('Không thể hủy yêu cầu: ' + err.message);
    }
  };

  return (
    <div className="request-detail">
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 9999,
          background: '#059669',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14,
          fontWeight: 500,
        }}>
          <span>✓</span> {toastMsg}
        </div>
      )}

      <a className="back-link" onClick={() => navigate(-1)} style={{ cursor: 'pointer' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Quay lại
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
                  <tr><th>Thủ tục</th><td>{request.procedure || request.type_name}</td></tr>
                  <tr><th>Đơn vị tiếp nhận</th><td>{request.department_name || request.department}</td></tr>
                  <tr><th>Thời hạn cam kết (SLA)</th><td>{request.sla_deadline ? new Date(request.sla_deadline).toLocaleDateString('vi-VN') : (request.sla || 'Theo quy chế')}</td></tr>
                  <tr><th>Lệ phí thủ tục</th><td>{request.is_fee_required ? `${(request.fee_amount || 50000).toLocaleString('vi-VN')} VNĐ` : 'Miễn phí'}</td></tr>
                  <tr><th>Ngày nộp hồ sơ</th><td>{request.date}</td></tr>
                  <tr><th>Trạng thái hiện tại</th><td><Badge label={sc.label} color={sc.color} bg={sc.bg} /></td></tr>
                  {request.rejection_note && (
                    <tr>
                      <th style={{ color: '#DC2626' }}>Lý do từ chối</th>
                      <td style={{ color: '#DC2626', fontWeight: 500 }}>{request.rejection_note}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {request.form_data && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-body">
                <h3 className="section-title">Thông tin biểu mẫu đã khai</h3>
                <table className="info-table">
                  <tbody>
                    {Object.entries(request.form_data).map(([k, v]) => (
                      <tr key={k}>
                        <th>{k === 'purpose' ? 'Mục đích' : k === 'quantity' ? 'Số lượng bản' : k === 'course_name' ? 'Môn thi' : k === 'company_name' ? 'Đơn vị thực tập' : k}</th>
                        <td>{String(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-body">
              <h3 className="section-title">Thông tin sinh viên</h3>
              <table className="info-table">
                <tbody>
                  <tr><th>Họ tên</th><td>{student.name}</td></tr>
                  <tr><th>MSSV</th><td>{student.mssv}</td></tr>
                  <tr><th>Email</th><td>{student.email}</td></tr>
                  <tr><th>Lớp</th><td>{student.lop}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-body">
              <h3 className="section-title">Lịch sử xử lý hồ sơ</h3>
              <div className="timeline">
                {timeline.map((t, i) => (
                  <div key={i} className="timeline-item">
                    <div className="timeline-dot" />
                    {i < timeline.length - 1 && <div className="timeline-line" />}
                    <div className="timeline-content">
                      <div className="timeline-date">{t.date}</div>
                      <div className="timeline-event">{t.event}</div>
                      <div className="timeline-desc">{t.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="action-buttons" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {canSupplement && (
              <Button variant="primary" onClick={() => navigate('/student/request/supplement')}>
                ⚠️ Bổ sung hồ sơ theo yêu cầu
              </Button>
            )}
            {canReceive && (
              <Button variant="primary" onClick={() => navigate('/student/request/result')}>
                📥 Nhận kết quả & Tải tệp ký số
              </Button>
            )}
            {canFeedback && (
              <Button variant="outline-red" onClick={() => navigate('/student/feedback')}>
                ⭐ Đánh giá chất lượng dịch vụ
              </Button>
            )}
            {canCancel && (
              <button
                className="btn btn--outline-red"
                onClick={() => setShowCancelModal(true)}
                style={{ width: '100%', padding: '10px 16px' }}
              >
                ✕ Hủy yêu cầu này
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Xác nhận hủy yêu cầu"
      >
        <p style={{ fontSize: 14, color: '#4B5563', marginBottom: 16 }}>
          Bạn có chắc chắn muốn hủy yêu cầu <strong>{request.request_code || request.id}</strong> không? Sau khi hủy, hồ sơ sẽ ngừng xử lý.
        </p>
        <div className="modal-field">
          <label>Lý do hủy (tùy chọn)</label>
          <textarea
            placeholder="Nhập lý do bạn muốn hủy hồ sơ này..."
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </div>
        <div className="modal-footer">
          <Button variant="secondary" onClick={() => setShowCancelModal(false)}>Đóng</Button>
          <Button variant="danger" onClick={handleCancelRequest}>Xác nhận hủy</Button>
        </div>
      </Modal>
    </div>
  );
}

export default RequestDetail;
