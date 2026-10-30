import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { allRequests, users } from '../../data/mockData';
import './StudentPages.css';

function ReceiveResult() {
  const navigate = useNavigate();
  const location = useLocation();

  // Pick completed request
  const request = allRequests.find(r => r.result || r.status === 'Đã duyệt' || r.status === 'Đã xử lý') || allRequests[0];
  const student = users.student;
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState('');

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      setToast('Tải xuống tài liệu PDF ký số thành công!');
      setTimeout(() => setToast(''), 4000);
    }, 1000);
  };

  return (
    <div className="receive-result">
      {toast && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 9999,
          background: '#059669',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14,
          fontWeight: 500,
        }}>
          <span>✓</span> {toast}
        </div>
      )}

      <a className="back-link" onClick={() => navigate(-1)} style={{ cursor: 'pointer' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Quay lại
      </a>

      <h1 className="page-title">Nhận kết quả thủ tục</h1>
      <p className="page-subtitle">Mã hồ sơ: <strong>{request.request_code || request.id}</strong> — {request.procedure || request.type_name}</p>

      <div className="two-col" style={{ marginTop: 24 }}>
        <div>
          <div className="card">
            <div className="card-body">
              <h3 className="section-title">Xem trước tài liệu điện tử</h3>
              <div className="pdf-preview" style={{ background: '#F9FAFB', border: '1px dashed #D1D5DB', borderRadius: 8, padding: 24, textAlign: 'center' }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <path d="M28 4H12a4 4 0 00-4 4v32a4 4 0 004 4h24a4 4 0 004-4V16l-12-12z" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M28 4v12h12" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 24h16M16 30h16M16 36h8" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <p style={{ marginTop: 12, fontWeight: 600, color: '#1F2937' }}>
                  {request.procedure || request.type_name} — {student.name}
                </p>
                <p style={{ fontSize: 13, color: '#6B7280' }}>
                  {request.request_code || request.id}_signed.pdf (1.2 MB)
                </p>

                <div style={{
                  marginTop: 16,
                  padding: '10px 14px',
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: 6,
                  textAlign: 'left',
                  fontSize: 12,
                  color: '#065F46',
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Chữ ký số hợp lệ:</div>
                  <div>• Ký bởi: <strong>PGS.TS Nguyễn Văn Bình</strong> (Hiệu trưởng)</div>
                  <div>• Thời gian: 29/10/2026 15:00 (GMT+7)</div>
                  <div>• Mã tra cứu xác thực: <strong>{request.result?.verification_code || 'VJU-XN-2026-001'}</strong></div>
                </div>
              </div>

              <Button
                variant="secondary"
                className="btn--full"
                style={{ marginTop: 16 }}
                onClick={handleDownload}
                disabled={downloading}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M14 10v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3M8 2v9M5 8l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {downloading ? 'Đang chuẩn bị tệp...' : 'Tải xuống PDF ký số'}
              </Button>
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-body">
              <h3 className="section-title">Thông tin nhận kết quả</h3>
              <table className="info-table">
                <tbody>
                  <tr><th>Thủ tục</th><td>{request.procedure || request.type_name}</td></tr>
                  <tr><th>Mã yêu cầu</th><td><strong>{request.request_code || request.id}</strong></td></tr>
                  <tr><th>Đơn vị cấp</th><td>{request.department_name || request.department}</td></tr>
                  <tr><th>Hình thức cấp</th><td><Badge label="Bản điện tử + Bản cứng" color="#2563EB" bg="#EFF6FF" /></td></tr>
                  <tr><th>Mã xác thực</th><td><code>{request.result?.verification_code || 'VJU-XN-2026-001'}</code></td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-body">
              <h3 className="section-title">Thông tin nhận bản cứng tại trường</h3>
              <table className="info-table">
                <tbody>
                  <tr><th>Địa điểm</th><td>Bàn số 2 — {request.department_name || request.department} (Tầng 3, Nhà A)</td></tr>
                  <tr><th>Thời gian phục vụ</th><td>Thứ 2 - Thứ 6: 08:30 - 11:30 | 13:30 - 16:30</td></tr>
                  <tr><th>Thời hạn lưu hồ sơ</th><td>15 ngày kể từ ngày thông báo có kết quả</td></tr>
                  <tr><th>Yêu cầu khi đến</th><td>Xuất trình thẻ sinh viên hoặc CCCD gốc để đối chiếu</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="action-buttons" style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            <Button variant="outline-red" onClick={() => navigate('/student/feedback')}>
              ⭐ Đánh giá dịch vụ
            </Button>
            <Button variant="primary" onClick={() => navigate('/student')}>
              Về trang chủ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReceiveResult;
