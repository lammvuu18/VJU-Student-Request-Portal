import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import './StudentPages.css';

function FeedbackSuccess() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const requestCode = id || location.state?.requestCode || 'VJU-2026-0840';

  const handleBackToDetail = () => {
    if (requestCode) {
      navigate(`/student/request/${requestCode}`);
    } else {
      navigate('/student/dashboard');
    }
  };

  return (
    <div className="feedback-success-container">
      {/* 80x80 Green Circle Badge with Checkmark */}
      <div className="feedback-success-badge-green">
        <span className="feedback-success-badge-checkmark">✓</span>
      </div>

      {/* Spacer 16px */}
      <div style={{ width: 10, height: 16 }} />

      {/* Title */}
      <h1 className="feedback-success-title-green">Cảm ơn bạn đã đánh giá!</h1>

      {/* Spacer 4px */}
      <div style={{ width: 10, height: 4 }} />

      {/* Subtitle */}
      <p className="feedback-success-subtitle-gray">
        Đánh giá của bạn đã được gửi đến phòng ban tương ứng.
      </p>

      {/* Spacer 24px */}
      <div style={{ width: 10, height: 24 }} />

      {/* Back to Request Detail Button */}
      <button
        type="button"
        className="btn-feedback-back-detail"
        onClick={handleBackToDetail}
      >
        ← Về chi tiết yêu cầu
      </button>
    </div>
  );
}

export default FeedbackSuccess;

