import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../common/Button';
import { allRequests, procedures } from '../../data/mockData';
import { staffApi } from '../../services/api';
import './StaffPages.css';

function StaffReviewForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const request = allRequests.find(r => r.id === id || String(r.request_id) === String(id) || r.request_code === id) || allRequests[1];
  const proc = procedures.find(p => p.type_id === request.type_id || p.name === request.procedure) || procedures[0];

  const [formData, setFormData] = useState({
    result: 'pass',
    notes: 'Đã kiểm tra đầy đủ minh chứng, đối chiếu thông tin trên hệ thống hợp lệ. Đề xuất phê duyệt.',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (formData.result === 'pass') {
        const isOneLevel = proc.approval_levels === 1;
        if (isOneLevel) {
          await staffApi.approve(request.request_id || request.id, { notes: formData.notes });
          setSubmitMessage('Chuyên viên đã thẩm định và duyệt hồ sơ thành công. Hồ sơ chuyển sang phát hành kết quả.');
        } else {
          await staffApi.submitToHead(request.request_id || request.id, {
            notes: formData.notes,
            generated_draft_url: `/drafts/${request.request_code || request.id}_draft.pdf`,
          });
          setSubmitMessage('Hồ sơ đã được thẩm định đạt và chuyển lên Trưởng phòng phê duyệt theo quy trình.');
        }
      } else {
        await staffApi.reject(request.request_id || request.id, {
          reason_id: 1,
          rejection_note: formData.notes || 'Hồ sơ không đạt tiêu chuẩn theo quy chế.',
        });
        setSubmitMessage('Đã ghi nhận kết quả không đạt và gửi lý do từ chối đến sinh viên.');
      }
      setSubmitted(true);
    } catch (err) {
      alert('Lỗi xử lý thẩm định: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="staff-review-form">
        <div className="success-page" style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center' }}>
          <div className="success-icon" style={{ margin: '0 auto 16px', background: '#ECFDF5', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <path d="M8 16l6 6 10-10" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 22, color: '#111827', marginBottom: 8 }}>Thẩm định hoàn tất</h2>
          <p style={{ color: '#4B5563', fontSize: 14, marginBottom: 20 }}>{submitMessage}</p>
          <table className="info-table" style={{ maxWidth: 440, margin: '0 auto 24px' }}>
            <tbody>
              <tr><th>Mã yêu cầu</th><td><strong>{request.request_code || request.id}</strong></td></tr>
              <tr><th>Thủ tục</th><td>{request.procedure || request.type_name}</td></tr>
              <tr><th>Kết quả</th><td style={{ color: formData.result === 'pass' ? '#059669' : '#DC2626', fontWeight: 600 }}>{formData.result === 'pass' ? 'Đạt yêu cầu' : 'Không đạt'}</td></tr>
            </tbody>
          </table>
          <div className="action-buttons" style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <Button variant="secondary" onClick={() => navigate('/staff/requests')}>Về danh sách hồ sơ</Button>
            <Button variant="primary" onClick={() => navigate(`/staff/request/${request.id}`)}>Xem chi tiết</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="staff-review-form">
      <a className="back-link" onClick={() => navigate(-1)} style={{ cursor: 'pointer' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Quay lại chi tiết
      </a>

      <h1 className="page-title">Thẩm định hồ sơ thủ tục</h1>
      <p className="page-subtitle">Hồ sơ: <strong>{request.request_code || request.id}</strong> — {request.student}</p>

      <div className="two-col" style={{ marginTop: 20 }}>
        <div>
          <div className="card">
            <div className="card-body">
              <h3 className="section-title">Thông tin yêu cầu</h3>
              <table className="info-table">
                <tbody>
                  <tr><th>Sinh viên</th><td>{request.student} — {request.mssv}</td></tr>
                  <tr><th>Thủ tục</th><td>{request.procedure || request.type_name}</td></tr>
                  <tr><th>Quy trình phê duyệt</th><td>{proc.approvalLevels || `${proc.approval_levels} cấp`}</td></tr>
                  <tr><th>Ngày nộp</th><td>{request.date}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-body">
              <h3 className="section-title">Hồ sơ đính kèm của sinh viên</h3>
              <div className="file-list">
                <div className="file-item">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 2H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V6l-4-4z" stroke="#6B7280" strokeWidth="1.2"/><path d="M12 2v4h4" stroke="#6B7280" strokeWidth="1.2"/></svg>
                  <span>don_yeu_cau_{request.mssv || '21CS001'}.pdf</span>
                  <button className="btn btn--link btn--sm">Xem</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-body">
              <h3 className="section-title">Ý kiến thẩm định của Chuyên viên</h3>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
                  Kết quả đánh giá hồ sơ
                </label>
                <div className="radio-group" style={{ display: 'flex', gap: 16 }}>
                  <label className={`radio-card ${formData.result === 'pass' ? 'radio-card--active' : ''}`} style={{ flex: 1, padding: 12, border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input type="radio" name="result" value="pass" checked={formData.result === 'pass'} onChange={() => handleChange('result', 'pass')} />
                    <div>
                      <strong style={{ color: '#059669', display: 'block' }}>Đạt yêu cầu</strong>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>Hồ sơ đầy đủ, đúng quy định</span>
                    </div>
                  </label>
                  <label className={`radio-card ${formData.result === 'fail' ? 'radio-card--active' : ''}`} style={{ flex: 1, padding: 12, border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input type="radio" name="result" value="fail" checked={formData.result === 'fail'} onChange={() => handleChange('result', 'fail')} />
                    <div>
                      <strong style={{ color: '#DC2626', display: 'block' }}>Không đạt</strong>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>Thiếu minh chứng / không hợp lệ</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Nhận xét / Ý kiến đề xuất
                </label>
                <textarea
                  className="form-input"
                  placeholder="Ghi nhận xét và kiến nghị của chuyên viên..."
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="action-buttons" style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <Button variant="secondary" onClick={() => navigate(-1)}>Hủy</Button>
                <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Đang gửi...' : 'Gửi kết quả thẩm định'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StaffReviewForm;
