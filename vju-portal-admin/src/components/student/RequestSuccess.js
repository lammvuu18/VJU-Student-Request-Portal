import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../common/Button';
import './StudentPages.css';

function RequestSuccess() {
  const navigate = useNavigate();

  return (
    <div className="success-page">
      <div className="success-icon">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M8 16l6 6 10-10" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h2 className="success-title">Nộp hồ sơ thành công!</h2>
      <p className="success-desc">Yêu cầu của bạn đã được ghi nhận trên Cổng dịch vụ công VJU.</p>

      <div className="success-summary card" style={{ maxWidth: 480, margin: '20px auto 24px', textAlign: 'left' }}>
        <div className="card-body">
          <table className="info-table">
            <tbody>
              <tr><th>Mã hồ sơ</th><td><strong style={{ color: '#AA2327' }}>REQ-20261030-010</strong></td></tr>
              <tr><th>Thủ tục</th><td>Cấp bảng điểm chính quy</td></tr>
              <tr><th>Ngày nộp</th><td>30/10/2026</td></tr>
              <tr><th>Trạng thái</th><td style={{ color: '#2563EB', fontWeight: 600 }}>Đã gửi — Đang chờ tiếp nhận</td></tr>
              <tr><th>Thời hạn cam kết (SLA)</th><td>04/11/2026 (3 ngày làm việc)</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="action-buttons" style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
        <Button variant="secondary" onClick={() => navigate('/student/dashboard')}>Về danh sách yêu cầu</Button>
        <Button variant="primary" onClick={() => navigate('/student/request/REQ-20261030-001')}>Xem tiến độ hồ sơ</Button>
      </div>
    </div>
  );
}

export default RequestSuccess;
