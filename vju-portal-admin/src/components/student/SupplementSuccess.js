import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../common/Button';
import './StudentPages.css';

function SupplementSuccess() {
  const navigate = useNavigate();

  return (
    <div className="success-page">
      <div className="success-icon">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M8 16l6 6 10-10" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h2 className="success-title">Bổ sung hồ sơ thành công!</h2>
      <p className="success-desc">Hồ sơ bổ sung đã được gửi. Yêu cầu sẽ tiếp tục được xử lý.</p>
      <div className="action-buttons" style={{ justifyContent: 'center' }}>
        <Button variant="secondary" onClick={() => navigate('/student/dashboard')}>Về danh sách yêu cầu</Button>
        <Button variant="primary" onClick={() => navigate('/student/request/REQ-20261030-003')}>Xem chi tiết hồ sơ</Button>
      </div>
    </div>
  );
}

export default SupplementSuccess;
