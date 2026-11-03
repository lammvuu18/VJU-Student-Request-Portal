import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../../services/api';
import './StudentPages.css';

// Các tiêu chí backend yêu cầu, mỗi tiêu chí 1–5 sao
const CRITERIA = [
  { key: 'star_rating', label: 'Mức độ hài lòng chung' },
  { key: 'speed_score', label: 'Tốc độ xử lý' },
  { key: 'attitude_score', label: 'Thái độ cán bộ' },
  { key: 'convenience_score', label: 'Mức độ thuận tiện' },
];

const RATING_LABELS = {
  5: 'Rất hài lòng',
  4: 'Hài lòng',
  3: 'Bình thường',
  2: 'Chưa hài lòng',
  1: 'Rất không hài lòng',
};

function StarRow({ label, value, onChange }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <>
      <div className="feedback-row">
        <div className="feedback-label">{label}</div>
        <div className="feedback-stars-container">
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = shown >= star;
            return (
              <button
                key={star}
                type="button"
                className="feedback-star-btn"
                onClick={() => onChange(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                aria-label={`${label}: ${star} sao`}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 20 20"
                  fill={isFilled ? '#AA2327' : '#D1D5DB'}
                  stroke={isFilled ? '#AA2327' : '#D1D5DB'}
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
            {RATING_LABELS[shown]} ({shown}/5)
          </span>
        </div>
      </div>
      <div className="req-detail-divider" />
    </>
  );
}

function FeedbackForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const [request, setRequest] = useState(null);
  const [scores, setScores] = useState({ star_rating: 5, speed_score: 5, attitude_score: 5, convenience_score: 5 });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.requests.getDetail(id)
      .then(res => setRequest(res.data))
      .catch(err => setError(err.message || 'Không tải được yêu cầu.'));
  }, [id]);

  const requestCode = request?.request_code || location.state?.requestCode || '—';
  const procedureName = request?.type_name || location.state?.procedureName || '—';
  const department = request?.department_name || location.state?.department || '—';

  const handleBack = () => navigate(id ? `/student/request/${id}` : '/student/dashboard');

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.requests.feedback(id, { ...scores, comment_text: comment.trim() });
      navigate(`/student/request/${id}/feedback/success`, {
        state: { requestCode, procedureName, department },
      });
    } catch (err) {
      setError(err.message || 'Gửi đánh giá thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="feedback-page-container">
      {/* Page Heading */}
      <h1 className="feedback-page-title">Chia sẻ trải nghiệm của bạn</h1>

      <div className="feedback-card">
        <div className="feedback-card-title">Form đánh giá dịch vụ</div>
        <div style={{ alignSelf: 'stretch', height: 14 }} />
        <div className="req-detail-divider" />

        {[['Mã yêu cầu', requestCode], ['Thủ tục', procedureName], ['Phòng phụ trách', department]].map(([label, value]) => (
          <React.Fragment key={label}>
            <div className="feedback-row">
              <div className="feedback-label">{label}</div>
              <div className="feedback-value">{value}</div>
            </div>
            <div className="req-detail-divider" />
          </React.Fragment>
        ))}

        {CRITERIA.map(c => (
          <StarRow
            key={c.key}
            label={c.label}
            value={scores[c.key]}
            onChange={(v) => setScores(prev => ({ ...prev, [c.key]: v }))}
          />
        ))}

        <div className="feedback-row-col">
          <div className="feedback-label-bold">Nhận xét</div>
          <textarea
            className="feedback-textarea"
            placeholder="Chia sẻ thêm cảm nhận hoặc góp ý (không bắt buộc)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />
        </div>

        {error && (
          <div role="alert" style={{ color: '#B91C1C', fontSize: 13, alignSelf: 'stretch' }}>{error}</div>
        )}

        <div style={{ alignSelf: 'stretch', height: 8 }} />

        <div className="feedback-actions">
          <button type="button" className="btn-feedback-back" onClick={handleBack}>
            ← Quay lại chi tiết
          </button>
          <button type="button" className="btn-feedback-submit" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Đang gửi...' : 'Gửi đánh giá →'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FeedbackForm;
