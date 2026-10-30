import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../common/Button';
import { allRequests } from '../../data/mockData';
import { staffApi } from '../../services/api';
import './StaffPages.css';

function StaffIssueResult() {
  const navigate = useNavigate();
  const { id } = useParams();
  const request = allRequests.find(r => r.id === id || String(r.request_id) === String(id) || r.request_code === id) || allRequests[1];

  const [formData, setFormData] = useState({
    deliveryMethod: 'both',
    location: `Bàn tiếp nhận số 1 — ${request.department_name || request.department || 'Phòng Đào tạo'} (P.301 Nhà A)`,
    pickupStartDate: '2026-11-02',
    pickupExpiryDate: '2026-11-16',
    notes: 'Sinh viên vui lòng mang theo Thẻ sinh viên hoặc CCCD gốc để đối chiếu khi nhận bản in.',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await staffApi.assignPickup(request.request_id || request.id, {
        pickup_location: formData.location,
        pickup_start_date: formData.pickupStartDate,
        pickup_expiry_date: formData.pickupExpiryDate,
        pickup_note: formData.notes,
        electronic_result_url: `/results/${request.request_code || request.id}_signed.pdf`,
      });
      setSubmitted(true);
    } catch (err) {
      alert('Lỗi tạo lịch hẹn kết quả: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="staff-issue-result">
        <div className="success-page" style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center' }}>
          <div className="success-icon" style={{ margin: '0 auto 16px', background: '#ECFDF5', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <path d="M8 16l6 6 10-10" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 22, color: '#111827', marginBottom: 8 }}>Phát hành kết quả thành công</h2>
          <p style={{ color: '#4B5563', fontSize: 14, marginBottom: 20 }}>
            Hệ thống đã tự động gửi email và thông báo cổng cho sinh viên gồm: tệp điện tử PDF ký số và thông tin lịch hẹn nhận bản in tại trường.
          </p>
          <table className="info-table" style={{ maxWidth: 440, margin: '0 auto 24px' }}>
            <tbody>
              <tr><th>Mã hồ sơ</th><td><strong>{request.request_code || request.id}</strong></td></tr>
              <tr><th>Sinh viên</th><td>{request.student}</td></tr>
              <tr><th>Địa điểm nhận</th><td>{formData.location}</td></tr>
              <tr><th>Hạn nhận</th><td>{formData.pickupStartDate} đến {formData.pickupExpiryDate}</td></tr>
            </tbody>
          </table>
          <div className="action-buttons" style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <Button variant="secondary" onClick={() => navigate('/staff/requests')}>Về danh sách hồ sơ</Button>
            <Button variant="primary" onClick={() => navigate(`/staff/request/${request.id}`)}>Xem chi tiết hồ sơ</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="staff-issue-result">
      <a className="back-link" onClick={() => navigate(-1)} style={{ cursor: 'pointer' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Quay lại chi tiết
      </a>

      <h1 className="page-title">Cấp kết quả & Thiết lập lịch hẹn</h1>
      <p className="page-subtitle">Hồ sơ: <strong>{request.request_code || request.id}</strong> — {request.student}</p>

      <div className="two-col" style={{ marginTop: 20 }}>
        <div>
          <div className="card">
            <div className="card-body">
              <h3 className="section-title">Văn bản kết quả điện tử</h3>
              <div className="pdf-preview" style={{ background: '#F9FAFB', border: '1px dashed #D1D5DB', borderRadius: 8, padding: 24, textAlign: 'center' }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="8" y="4" width="32" height="40" rx="3" stroke="#2563EB" strokeWidth="2"/><path d="M16 16h16M16 22h16M16 28h10" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <p style={{ marginTop: 12, fontWeight: 600 }}>Tệp kết quả đã ký số sẵn sàng</p>
                <span style={{ fontSize: 13, color: '#6B7280' }}>{request.request_code || request.id}_signed.pdf</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-body">
              <h3 className="section-title">Thông tin giao trả kết quả cho sinh viên</h3>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
                  Hình thức trả kết quả
                </label>
                <div className="radio-group" style={{ display: 'flex', gap: 12 }}>
                  <label className={`radio-card ${formData.deliveryMethod === 'both' ? 'radio-card--active' : ''}`} style={{ flex: 1, padding: 10, border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="radio" name="delivery" value="both" checked={formData.deliveryMethod === 'both'} onChange={() => handleChange('deliveryMethod', 'both')} />
                    <div>
                      <strong style={{ fontSize: 13, display: 'block' }}>Điện tử + Bản cứng</strong>
                      <span style={{ fontSize: 11, color: '#6B7280' }}>Tải PDF và nhận trực tiếp</span>
                    </div>
                  </label>
                  <label className={`radio-card ${formData.deliveryMethod === 'pickup' ? 'radio-card--active' : ''}`} style={{ flex: 1, padding: 10, border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="radio" name="delivery" value="pickup" checked={formData.deliveryMethod === 'pickup'} onChange={() => handleChange('deliveryMethod', 'pickup')} />
                    <div>
                      <strong style={{ fontSize: 13, display: 'block' }}>Chỉ bản cứng</strong>
                      <span style={{ fontSize: 11, color: '#6B7280' }}>Nhận tại phòng ban</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Địa điểm nhận kết quả
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  style={{ width: '100%', padding: '8px 12px' }}
                />
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Bắt đầu nhận từ ngày
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.pickupStartDate}
                    onChange={(e) => handleChange('pickupStartDate', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Hạn nhận cuối cùng
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.pickupExpiryDate}
                    onChange={(e) => handleChange('pickupExpiryDate', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Ghi chú hướng dẫn nhận kết quả
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="action-buttons" style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <Button variant="secondary" onClick={() => navigate(-1)}>Hủy</Button>
                <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Đang phát hành...' : 'Phát hành kết quả & Gửi hẹn'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StaffIssueResult;
