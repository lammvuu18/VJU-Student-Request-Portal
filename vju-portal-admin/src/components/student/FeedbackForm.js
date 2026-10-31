import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { allRequests } from '../../data/mockData';
import { feedbackApi } from '../../services/api';
import FeedbackSuccess from './FeedbackSuccess';
import './StudentPages.css';

function FeedbackForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  // Find request from mock data or fallback to Figma defaults
  const foundReq = (allRequests || []).find(
    (r) => r.id === id || r.request_code === id || String(r.request_id) === String(id)
  );

  const requestCode = id || location.state?.requestCode || foundReq?.request_code || foundReq?.id || 'VJU-2026-0840';
  const procedureName = location.state?.procedureName || foundReq?.procedure || foundReq?.type_name || 'Cấp bảng điểm';
  const department = location.state?.department || foundReq?.department_name || foundReq?.department || 'Phòng Đào tạo';

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const getRatingLabel = (score) => {
    switch (score) {
      case 5:
        return 'Rất hài lòng';
      case 4:
        return 'Hài lòng';
      case 3:
        return 'Bình thường';
      case 2:
        return 'Chưa hài lòng';
      case 1:
        return 'Rất không hài lòng';
      default:
        return '';
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(`/student/request/${requestCode}`);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSubmitting(true);

    try {
      if (feedbackApi && feedbackApi.submit) {
        await feedbackApi.submit({
          request_id: requestCode,
          star_rating: rating,
          comment,
        }).catch(() => {
          // Gracefully continue in mock/offline mode
        });
      }
    } catch {
      // Offline fallback
    }

    setSubmitting(false);
    navigate(`/student/request/${requestCode}/feedback/success`, {
      state: { requestCode, procedureName, department }
    });
  };

  return (
    <div className="feedback-page-container">
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 9999,
          background: '#059669',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: 8,
          boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'Inter, sans-serif',
          animation: 'fadeIn 0.2s ease',
        }}>
          <span>✓</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Page Heading */}
      <h1 className="feedback-page-title">Chia sẻ trải nghiệm của bạn</h1>

      {!submitted ? (
        /* White Form Card (Figma Match) */
        <div className="feedback-card">
          {/* Card Title */}
          <div className="feedback-card-title">Form đánh giá dịch vụ</div>
          <div style={{ alignSelf: 'stretch', height: 14 }} />
          <div className="req-detail-divider" />

          {/* Row 1: Mã yêu cầu */}
          <div className="feedback-row">
            <div className="feedback-label">Mã yêu cầu</div>
            <div className="feedback-value">{requestCode}</div>
          </div>
          <div className="req-detail-divider" />

          {/* Row 2: Thủ tục */}
          <div className="feedback-row">
            <div className="feedback-label">Thủ tục</div>
            <div className="feedback-value">{procedureName}</div>
          </div>
          <div className="req-detail-divider" />

          {/* Row 3: Phòng phụ trách */}
          <div className="feedback-row">
            <div className="feedback-label">Phòng phụ trách</div>
            <div className="feedback-value">{department}</div>
          </div>
          <div className="req-detail-divider" />

          {/* Row 4: Tốc độ xử lý (Star Rating) */}
          <div className="feedback-row">
            <div className="feedback-label">Tốc độ xử lý</div>
            <div className="feedback-stars-container">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    className="feedback-star-btn"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`Đánh giá ${star} sao`}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 20 20"
                      fill={isFilled ? '#F59E0B' : 'none'}
                      stroke={isFilled ? '#F59E0B' : '#D1D5DB'}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                );
              })}
              <span className="feedback-rating-hint">
                {getRatingLabel(hoverRating || rating)} ({hoverRating || rating}/5)
              </span>
            </div>
          </div>
          <div className="req-detail-divider" />

          {/* Row 5: Nhận xét */}
          <div className="feedback-row-col">
            <div className="feedback-label-bold">Nhận xét</div>
            <textarea
              className="feedback-textarea"
              placeholder="Sinh viên nhập đánh giá vào đây..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>

          <div style={{ alignSelf: 'stretch', height: 8 }} />

          {/* Action Buttons */}
          <div className="feedback-actions">
            <button
              type="button"
              className="btn-feedback-back"
              onClick={handleBack}
            >
              ← Quay lại chi tiết
            </button>
            <button
              type="button"
              className="btn-feedback-submit"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Đang gửi...' : 'Gửi đánh giá →'}
            </button>
          </div>
        </div>
      ) : (
        <FeedbackSuccess />
      )}
    </div>
  );
}

export default FeedbackForm;
