import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../common/Button';
import { allRequests } from '../../data/mockData';
import { feedbackApi } from '../../services/api';
import './StudentPages.css';

function FeedbackForm() {
  const navigate = useNavigate();
  const request = allRequests.find(r => r.status === 'Đã duyệt' || r.status === 'Đã xử lý') || allRequests[0];

  const [starRating, setStarRating] = useState(5);
  const [speedScore, setSpeedScore] = useState(5);
  const [attitudeScore, setAttitudeScore] = useState(5);
  const [convenienceScore, setConvenienceScore] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await feedbackApi.submit({
        request_id: request.request_id || 1,
        star_rating: starRating,
        speed_score: speedScore,
        attitude_score: attitudeScore,
        convenience_score: convenienceScore,
        comment,
      });
      setSubmitted(true);
    } catch (err) {
      alert('Không thể gửi đánh giá: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="feedback-form" style={{ maxWidth: 600, margin: '40px auto' }}>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div className="success-icon" style={{ margin: '0 auto 16px', background: '#ECFDF5', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
                <path d="M8 16l6 6 10-10" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="success-title" style={{ fontSize: 22, color: '#111827', marginBottom: 8 }}>Cảm ơn bạn đã đánh giá!</h2>
            <p className="success-desc" style={{ color: '#4B5563', fontSize: 14, marginBottom: 24 }}>
              Ý kiến đóng góp quý báu của bạn sẽ giúp nhà trường không ngừng nâng cao chất lượng dịch vụ công và hỗ trợ sinh viên tốt hơn.
            </p>
            <Button variant="primary" onClick={() => navigate('/student')}>Về trang chủ sinh viên</Button>
          </div>
        </div>
      </div>
    );
  }

  const renderStarInput = (val, setVal) => (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          onClick={() => setVal(s)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 2,
            fontSize: 22,
            color: s <= val ? '#F59E0B' : '#D1D5DB',
            transition: 'color 0.15s',
          }}
        >
          ★
        </button>
      ))}
      <span style={{ fontSize: 13, fontWeight: 500, color: '#4B5563', marginLeft: 8 }}>
        {val === 5 ? 'Rất hài lòng' : val === 4 ? 'Hài lòng' : val === 3 ? 'Bình thường' : val === 2 ? 'Chưa hài lòng' : 'Rất không hài lòng'}
      </span>
    </div>
  );

  return (
    <div className="feedback-form" style={{ maxWidth: 760, margin: '0 auto' }}>
      <a className="back-link" onClick={() => navigate(-1)} style={{ cursor: 'pointer' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Quay lại
      </a>

      <h1 className="page-title">Đánh giá mức độ hài lòng dịch vụ</h1>
      <p className="page-subtitle">
        Mã hồ sơ: <strong>{request.request_code || request.id}</strong> — {request.procedure || request.type_name}
      </p>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-body">
          {/* General Rating */}
          <div style={{ paddingBottom: 20, borderBottom: '1px solid #E5E7EB' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 15, color: '#1F2937', marginBottom: 8 }}>
              1. Mức độ hài lòng tổng thể
            </label>
            {renderStarInput(starRating, setStarRating)}
          </div>

          {/* Sub Criteria (Contract Section 6) */}
          <div style={{ padding: '20px 0', borderBottom: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                2. Tốc độ tiếp nhận & giải quyết thủ tục (SLA):
              </label>
              {renderStarInput(speedScore, setSpeedScore)}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                3. Thái độ phục vụ & hướng dẫn của cán bộ:
              </label>
              {renderStarInput(attitudeScore, setAttitudeScore)}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                4. Sự thuận tiện & rõ ràng của cổng dịch vụ công trực tuyến:
              </label>
              {renderStarInput(convenienceScore, setConvenienceScore)}
            </div>
          </div>

          {/* Comment */}
          <div className="form-group" style={{ marginTop: 20 }}>
            <label style={{ fontWeight: 600, fontSize: 14, color: '#1F2937' }}>
              5. Ý kiến đóng góp hoặc phản hồi thêm (tùy chọn)
            </label>
            <textarea
              placeholder="Chia sẻ thêm cảm nhận hoặc đề xuất cải tiến của bạn về thủ tục này..."
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>

          <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <Button variant="secondary" onClick={() => navigate(-1)}>Hủy</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeedbackForm;
