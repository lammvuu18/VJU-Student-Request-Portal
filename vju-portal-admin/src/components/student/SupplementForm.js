import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../common/Button';
import { allRequests } from '../../data/mockData';
import { requestApi } from '../../services/api';
import './StudentPages.css';

function SupplementForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const request = allRequests.find(r => r.id === id || String(r.request_id) === String(id) || r.status === 'Cần bổ sung' || r.internal_status === 'Cần bổ sung') || allRequests[2];

  const [notes, setNotes] = useState('');
  const [fileUploaded, setFileUploaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await requestApi.supplement(request.request_id || request.id, {
        notes,
        attachments: [
          {
            config_id: 2,
            file_url: 'https://storage.vju.ac.vn/attachments/supplement_minh_chung.pdf',
            file_name: 'minh_chung_bo_sung_bo_sung.pdf',
            file_size: 1048576,
          },
        ],
      });
      navigate('/student/request/supplement/success');
    } catch (err) {
      alert('Lỗi nộp bổ sung: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="supplement-form">
      <a className="back-link" onClick={() => navigate(-1)} style={{ cursor: 'pointer' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Quay lại chi tiết yêu cầu
      </a>

      <h1 className="page-title">Bổ sung hồ sơ minh chứng</h1>
      <p className="page-subtitle">Mã hồ sơ: <strong>{request.request_code || request.id}</strong> — {request.procedure || request.type_name}</p>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-body">
          <div className="supplement-notice" style={{ background: '#FFFBEB', border: '1px solid #FCD34D', padding: 16, borderRadius: 8, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
              <circle cx="10" cy="10" r="8" stroke="#D97706" strokeWidth="1.5"/>
              <path d="M10 7v3M10 13h.01" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div>
              <strong style={{ color: '#92400E', fontSize: 14 }}>Yêu cầu từ cán bộ tiếp nhận ({request.assignee || 'Chuyên viên'}):</strong>
              <p style={{ color: '#78350F', fontSize: 13, marginTop: 4 }}>
                {request.supplement_note || 'Vui lòng bổ sung Giấy tiếp nhận thực tập có chữ ký và đóng dấu tròn của doanh nghiệp tiếp nhận. Bản tải lên trước đó chưa có dấu mộc.'}
              </p>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 24 }}>
            <label style={{ fontWeight: 600, fontSize: 14, color: '#1F2937' }}>
              Tải lên tệp tài liệu bổ sung *
            </label>
            <div
              className="upload-zone"
              onClick={() => setFileUploaded(true)}
              style={{
                cursor: 'pointer',
                background: fileUploaded ? '#ECFDF5' : '#F9FAFB',
                borderColor: fileUploaded ? '#10B981' : '#D1D5DB',
              }}
            >
              <div className="upload-zone-icon">
                {fileUploaded ? (
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#10B981"/>
                    <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <path d="M20 10v20M10 20h20" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
                    <rect x="4" y="4" width="32" height="32" rx="8" stroke="#D1D5DB" strokeWidth="1.5"/>
                  </svg>
                )}
              </div>
              <p className="upload-zone-text">
                {fileUploaded ? (
                  <strong style={{ color: '#065F46' }}>✓ Đã chọn: giay_tiep_nhan_fpt_signed.pdf (1.8 MB)</strong>
                ) : (
                  <>Kéo thả file hoặc <span>chọn file từ máy tính</span></>
                )}
              </p>
              <p className="upload-zone-text" style={{ fontSize: 12 }}>Định dạng cho phép: PDF, JPG, PNG (tối đa 10MB)</p>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 16 }}>
            <label style={{ fontWeight: 600, fontSize: 14, color: '#1F2937' }}>
              Ghi chú giải trình của sinh viên (tùy chọn)
            </label>
            <textarea
              placeholder="Nhập nội dung giải trình thêm với cán bộ thụ lý..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: '100%', marginTop: 6 }}
            />
          </div>

          <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <Button variant="secondary" onClick={() => navigate(-1)}>Hủy</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Đang gửi...' : 'Nộp bổ sung hồ sơ'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupplementForm;
