import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './StudentPages.css';

function SupplementSuccess() {
  const navigate = useNavigate();
  const location = useLocation();

  const requestCode = location.state?.requestCode || 'VJU-2026-0842';
  const procedureName = location.state?.procedureName || 'Cấp bảng điểm';
  const submissionDate = location.state?.submissionDate || '21/10/2026';
  const status = location.state?.status || 'Đang xử lý';

  const getStatusPillClass = (st) => {
    if (st === 'Đang xử lý') return 'processing';
    if (st === 'Cần bổ sung') return 'supplement';
    if (st === 'Chờ thanh toán') return 'payment';
    if (st === 'Hoàn thành') return 'completed';
    if (st === 'Đã hủy') return 'cancelled';
    return 'processing';
  };

  return (
    <div className="supplement-success-container">
      <div className="supplement-success-content">
        {/* Success Icon */}
        <div className="supplement-success-badge">
          <span>✓</span>
        </div>

        {/* Text Group: Title & Subtitle */}
        <div className="supplement-success-text-group">
          <h1 className="supplement-success-heading">Cập nhật hồ sơ thành công</h1>
          <p className="supplement-success-subheading">
            Hồ sơ bổ sung đã được cập nhật và gửi đến Phòng Đào tạo xử lý.
          </p>
        </div>

        {/* Card: Thủ tục vừa được cập nhật */}
        <div className="supplement-success-card">
          <div className="supplement-card-header-title">
            Thủ tục vừa được cập nhật
          </div>
          <div className="req-detail-divider" />

          {/* Row 1: Mã yêu cầu */}
          <div className="supplement-success-row">
            <div className="supplement-success-label">Mã yêu cầu</div>
            <div className="supplement-success-value">{requestCode}</div>
          </div>
          <div className="req-detail-divider" />

          {/* Row 2: Tên thủ tục */}
          <div className="supplement-success-row">
            <div className="supplement-success-label">Tên thủ tục</div>
            <div className="supplement-success-value">{procedureName}</div>
          </div>
          <div className="req-detail-divider" />

          {/* Row 3: Ngày gửi */}
          <div className="supplement-success-row">
            <div className="supplement-success-label">Ngày gửi</div>
            <div className="supplement-success-value">{submissionDate}</div>
          </div>
          <div className="req-detail-divider" />

          {/* Row 4: Trạng thái */}
          <div className="supplement-success-row">
            <div className="supplement-success-label">Trạng thái</div>
            <div className="supplement-success-value">
              <span className={`req-status-pill ${getStatusPillClass(status)}`}>
                {status}
              </span>
            </div>
          </div>
          <div className="req-detail-divider" />

          {/* Action button */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            paddingTop: 16,
            width: '100%',
            boxSizing: 'border-box',
          }}>
            <button
              type="button"
              className="btn-supplement-view-detail"
              onClick={() => navigate(`/student/request/${requestCode}`)}
            >
              <span>Xem chi tiết →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupplementSuccess;
