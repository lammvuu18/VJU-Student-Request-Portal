import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './StudentPages.css';

function RequestSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};

  const orderCode = state.orderCode || 'VJU-2026-0842';
  const procedureName = state.procedure?.name || 'Cấp bảng điểm';
  const deptName = state.procedure?.department_name || 'Phòng Đào tạo';
  const submissionDate = state.submissionDate || '21/10/2026';

  return (
    <div className="reqsuccess-container">
      {/* Success Checkmark Icon */}
      <div className="reqsuccess-icon-badge">
        <span>✓</span>
      </div>

      {/* Header Titles */}
      <div className="reqsuccess-header-group">
        <h1 className="reqsuccess-title">Thanh toán thành công</h1>
        <p className="reqsuccess-subtitle">
          Đơn của bạn đã được gửi và đang được {deptName} xử lý.
        </p>
      </div>

      {/* Spacer 24px */}
      <div className="reqsuccess-spacer" />

      {/* Details Card */}
      <div className="reqsuccess-card">
        <div className="reqsuccess-card-head">
          <h2 className="reqsuccess-card-title">Thủ tục vừa được gửi</h2>
        </div>
        <div className="reqsuccess-divider" />

        {/* Row 1: Mã yêu cầu */}
        <div className="reqsuccess-row">
          <div className="reqsuccess-label">Mã yêu cầu</div>
          <div className="reqsuccess-val">{orderCode}</div>
        </div>
        <div className="reqsuccess-divider" />

        {/* Row 2: Tên thủ tục */}
        <div className="reqsuccess-row">
          <div className="reqsuccess-label">Tên thủ tục</div>
          <div className="reqsuccess-val">{procedureName}</div>
        </div>
        <div className="reqsuccess-divider" />

        {/* Row 3: Ngày gửi */}
        <div className="reqsuccess-row">
          <div className="reqsuccess-label">Ngày gửi</div>
          <div className="reqsuccess-val">{submissionDate}</div>
        </div>
        <div className="reqsuccess-divider" />

        {/* Row 4: Trạng thái */}
        <div className="reqsuccess-row">
          <div className="reqsuccess-label" style={{ fontSize: 14, color: '#68717D' }}>Trạng thái</div>
          <div className="reqsuccess-status-badge">
            Đang xử lý
          </div>
        </div>
        <div className="reqsuccess-divider" />

        {/* Action Button: Xem chi tiết → */}
        <div className="reqsuccess-footer">
          <button
            type="button"
            className="reqsuccess-btn-detail"
            onClick={() => navigate('/student/dashboard')}
          >
            Xem chi tiết →
          </button>
        </div>
      </div>
    </div>
  );
}

export default RequestSuccess;
