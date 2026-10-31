import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './StudentPages.css';

function ReceiveResult() {
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve any state passed from previous screens or default to Figma mockup
  const studentName = location.state?.studentName || 'Nguyễn Minh Anh';
  const studentId = location.state?.studentId || '23110150';
  const major = location.state?.major || 'Khoa học máy tính';
  const cohort = location.state?.cohort || 'QH-2023';
  const procedureName = location.state?.procedureName || 'Cấp bảng điểm';
  const issueDate = location.state?.issueDate || '21/10/2026';
  const pickupDate = location.state?.pickupDate || '28/10/2026';
  const pickupHours = location.state?.pickupHours || '08:00 – 11:30, 13:30 – 17:00';
  const contactPerson = location.state?.contactPerson || 'Nguyễn Văn A — Chuyên viên PĐT';
  const pickupLocation = location.state?.pickupLocation || 'Phòng Đào tạo — Phòng 204, Tầng 2';

  const [toastMsg, setToastMsg] = useState('');
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = () => {
    setDownloading(true);
    // Create and trigger download of a generated file
    const fileContent = `%PDF-1.4\n% VJU Academic Transcript - ${studentName} (${studentId})\n% Generated & Digitally Signed on ${issueDate}\n`;
    const blob = new Blob([fileContent], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bang_Diem_${studentId}_signed.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloading(false);
    setToastMsg('Đã tải xuống file PDF bảng điểm điện tử có chữ ký số!');
    setTimeout(() => {
      setToastMsg('');
    }, 4000);
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/student/dashboard');
    }
  };

  return (
    <div className="receive-result-container">
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

      {/* Top Header Row */}
      <div className="receive-result-header">
        <h1 className="receive-result-title">Nhận kết quả</h1>
        <button
          type="button"
          className="btn-back-request-detail"
          onClick={handleBack}
        >
          ← Chi tiết yêu cầu
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div className="receive-result-columns">
        {/* Left Column: Document Sheet Preview (620px) */}
        <div className="doc-preview-card">
          <div className="doc-paper-sheet">
            {/* University & School Name */}
            <div className="doc-sheet-univ-title">
              ĐẠI HỌC QUỐC GIA HÀ NỘI<br />
              TRƯỜNG ĐẠI HỌC VIỆT NHẬT
            </div>

            {/* Title Underline */}
            <div className="doc-sheet-divider-bar" />

            {/* Document Title */}
            <div className="doc-sheet-heading">BẢNG ĐIỂM</div>
            <div className="doc-sheet-subheading">(Academic Transcript)</div>

            <div style={{ width: 10, height: 8 }} />

            {/* Student Details */}
            <div className="doc-sheet-student-info">Họ và tên: {studentName}</div>
            <div className="doc-sheet-student-info">MSSV: {studentId}</div>
            <div className="doc-sheet-student-info">Ngành: {major}</div>
            <div className="doc-sheet-student-info">Khóa: {cohort}</div>

            <div style={{ width: 10, height: 6 }} />

            {/* Grades Table Header */}
            <div className="doc-grades-table-header">
              <div className="doc-col-stt">STT</div>
              <div className="doc-col-code">Mã HP</div>
              <div className="doc-col-name">Tên học phần</div>
              <div className="doc-col-credits">TC</div>
              <div className="doc-col-grade">Điểm</div>
            </div>

            {/* Grades Table Rows */}
            <div className="doc-grades-table-row">
              <div className="doc-col-stt">1</div>
              <div className="doc-col-code">CS101</div>
              <div className="doc-col-name">Nhập môn lập trình</div>
              <div className="doc-col-credits">3</div>
              <div className="doc-col-grade">8.5</div>
            </div>

            <div className="doc-grades-table-row">
              <div className="doc-col-stt">2</div>
              <div className="doc-col-code">CS201</div>
              <div className="doc-col-name">Cấu trúc dữ liệu</div>
              <div className="doc-col-credits">3</div>
              <div className="doc-col-grade">9.0</div>
            </div>

            <div className="doc-grades-table-row">
              <div className="doc-col-stt">3</div>
              <div className="doc-col-code">MA101</div>
              <div className="doc-col-name">Giải tích I</div>
              <div className="doc-col-credits">4</div>
              <div className="doc-col-grade">7.5</div>
            </div>

            <div className="doc-grades-table-row">
              <div className="doc-col-stt">4</div>
              <div className="doc-col-code">JP101</div>
              <div className="doc-col-name">Tiếng Nhật cơ sở</div>
              <div className="doc-col-credits">4</div>
              <div className="doc-col-grade">8.0</div>
            </div>

            <div className="doc-grades-table-row">
              <div className="doc-col-stt">5</div>
              <div className="doc-col-code">CS301</div>
              <div className="doc-col-name">Hệ điều hành</div>
              <div className="doc-col-credits">3</div>
              <div className="doc-col-grade">7.0</div>
            </div>

            {/* Trailing dots */}
            <div className="doc-sheet-dots">· · ·</div>

            {/* Footer Area with Digital Signature & QR */}
            <div className="doc-sheet-footer-area">
              <div className="doc-digital-signature-box">
                <div className="doc-sign-date-text">Ký số ngày {issueDate}</div>
                <div className="doc-qr-code-box">
                  <svg width="34" height="34" viewBox="0 0 33 33" fill="none">
                    {/* Top-Left Finder */}
                    <rect x="2" y="2" width="9" height="9" fill="none" stroke="#1F2937" strokeWidth="1.8" />
                    <rect x="4.5" y="4.5" width="4" height="4" fill="#1F2937" />
                    {/* Top-Right Finder */}
                    <rect x="22" y="2" width="9" height="9" fill="none" stroke="#1F2937" strokeWidth="1.8" />
                    <rect x="24.5" y="4.5" width="4" height="4" fill="#1F2937" />
                    {/* Bottom-Left Finder */}
                    <rect x="2" y="22" width="9" height="9" fill="none" stroke="#1F2937" strokeWidth="1.8" />
                    <rect x="4.5" y="24.5" width="4" height="4" fill="#1F2937" />
                    {/* Matrix Data Bits */}
                    <rect x="14" y="3" width="2" height="3" fill="#1F2937" />
                    <rect x="18" y="2" width="2" height="2" fill="#1F2937" />
                    <rect x="14" y="8" width="5" height="2" fill="#1F2937" />
                    <rect x="3" y="14" width="2" height="5" fill="#1F2937" />
                    <rect x="8" y="14" width="3" height="2" fill="#1F2937" />
                    <rect x="13" y="13" width="3" height="3" fill="#1F2937" />
                    <rect x="18" y="14" width="2" height="4" fill="#1F2937" />
                    <rect x="23" y="13" width="4" height="2" fill="#1F2937" />
                    <rect x="28" y="15" width="3" height="3" fill="#1F2937" />
                    <rect x="13" y="18" width="3" height="2" fill="#1F2937" />
                    <rect x="18" y="20" width="3" height="3" fill="#1F2937" />
                    <rect x="14" y="25" width="2" height="5" fill="#1F2937" />
                    <rect x="18" y="27" width="4" height="2" fill="#1F2937" />
                    <rect x="24" y="18" width="2" height="4" fill="#1F2937" />
                    <rect x="23" y="24" width="5" height="2" fill="#1F2937" />
                    <rect x="25" y="27" width="2" height="4" fill="#1F2937" />
                  </svg>
                </div>
                <div className="doc-qr-label-text">QR xác thực</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Info Cards */}
        <div className="receive-result-info-col">
          {/* Card 1: Thông tin giấy tờ */}
          <div className="receive-result-card">
            <h2 className="receive-result-card-title">Thông tin giấy tờ</h2>
            <div style={{ alignSelf: 'stretch', height: 14 }} />
            <div className="req-detail-divider" />

            {/* Row 1: Mã sinh viên */}
            <div className="receive-result-row">
              <div className="receive-result-row-content">
                <div className="receive-result-label">Mã sinh viên</div>
                <div className="receive-result-value">{studentId}</div>
              </div>
            </div>
            <div className="req-detail-divider" />

            {/* Row 2: Tên thủ tục */}
            <div className="receive-result-row">
              <div className="receive-result-row-content">
                <div className="receive-result-label">Tên thủ tục</div>
                <div className="receive-result-value">{procedureName}</div>
              </div>
            </div>
            <div className="req-detail-divider" />

            {/* Row 3: Ngày cấp */}
            <div className="receive-result-row">
              <div className="receive-result-row-content">
                <div className="receive-result-label">Ngày cấp</div>
                <div className="receive-result-value">{issueDate}</div>
              </div>
            </div>
            <div className="req-detail-divider" />

            {/* Row 4: Tải kết quả */}
            <div className="receive-result-row">
              <div className="receive-result-row-content">
                <div className="receive-result-label">Tải kết quả</div>
              </div>
              <button
                type="button"
                className="btn-download-pdf-red"
                onClick={handleDownloadPdf}
                disabled={downloading}
              >
                Tải PDF ↓
              </button>
            </div>

            <div style={{ alignSelf: 'stretch', height: 8 }} />

            {/* Notice 1 */}
            <div className="receive-result-alert-box">
              <span className="receive-result-alert-icon">⚠</span>
              <div className="receive-result-alert-text">
                Bản điện tử lưu giữ 30 ngày. Sau đó chuyển cold storage.
              </div>
            </div>
          </div>

          {/* Card 2: Thời gian và địa điểm nhận bản cứng */}
          <div className="receive-result-card">
            <h2 className="receive-result-card-title">
              Thời gian và địa điểm nhận bản cứng
            </h2>
            <div style={{ alignSelf: 'stretch', height: 14 }} />
            <div className="req-detail-divider" />

            {/* Row 1: Ngày nhận */}
            <div className="receive-result-row receive-result-row--with-icon">
              <div className="receive-result-row-icon">
                <div style={{ width: 16, height: 16, position: 'relative' }}>
                  <div style={{ width: 14, height: 12, left: 1, top: 3, position: 'absolute', borderRadius: 2, border: '1.30px #6B7280 solid' }} />
                  <div style={{ width: 1.5, height: 4, left: 5, top: 1, position: 'absolute', background: '#6B7280' }} />
                  <div style={{ width: 1.5, height: 4, left: 10, top: 1, position: 'absolute', background: '#6B7280' }} />
                  <div style={{ width: 10, height: 5, left: 3, top: 8, position: 'absolute', opacity: 0.3, background: '#6B7280' }} />
                </div>
              </div>
              <div className="receive-result-row-content">
                <div className="receive-result-label">Ngày nhận</div>
                <div className="receive-result-value">{pickupDate}</div>
              </div>
            </div>
            <div className="req-detail-divider" />

            {/* Row 2: Giờ nhận */}
            <div className="receive-result-row receive-result-row--with-icon">
              <div className="receive-result-row-icon">
                <div style={{ width: 16, height: 16, position: 'relative' }}>
                  <div style={{ width: 14, height: 14, left: 1, top: 1, position: 'absolute', borderRadius: 9999, border: '1.30px #6B7280 solid' }} />
                  <div style={{ width: 1.2, height: 4, left: 7.4, top: 4, position: 'absolute', background: '#6B7280' }} />
                  <div style={{ width: 3, height: 1.2, left: 7.4, top: 7.4, position: 'absolute', background: '#6B7280' }} />
                </div>
              </div>
              <div className="receive-result-row-content">
                <div className="receive-result-label">Giờ nhận</div>
                <div className="receive-result-value">{pickupHours}</div>
              </div>
            </div>
            <div className="req-detail-divider" />

            {/* Row 3: Liên hệ */}
            <div className="receive-result-row receive-result-row--with-icon">
              <div className="receive-result-row-icon">
                <div style={{ width: 16, height: 16, position: 'relative' }}>
                  <div style={{ width: 6, height: 6, left: 5, top: 1, position: 'absolute', borderRadius: 9999, border: '1.30px #6B7280 solid' }} />
                  <div style={{ width: 14, height: 10, left: 1, top: 9, position: 'absolute', borderRadius: 9999, border: '1.30px #6B7280 solid' }} />
                </div>
              </div>
              <div className="receive-result-row-content">
                <div className="receive-result-label">Liên hệ</div>
                <div className="receive-result-value">{contactPerson}</div>
              </div>
            </div>
            <div className="req-detail-divider" />

            {/* Row 4: Địa điểm */}
            <div className="receive-result-row receive-result-row--with-icon">
              <div className="receive-result-row-icon">
                <div style={{ width: 14, height: 18, position: 'relative' }}>
                  <div style={{ width: 14, height: 14, left: 0, top: 0, position: 'absolute', borderRadius: 9999, border: '1.30px #6B7280 solid' }} />
                  <div style={{ width: 4, height: 4, left: 5, top: 5, position: 'absolute', borderRadius: 9999, border: '1px #6B7280 solid' }} />
                  <div style={{ width: 2, height: 6, left: 6, top: 12, position: 'absolute', background: '#6B7280' }} />
                </div>
              </div>
              <div className="receive-result-row-content">
                <div className="receive-result-label">Địa điểm</div>
                <div className="receive-result-value">{pickupLocation}</div>
              </div>
            </div>

            <div style={{ alignSelf: 'stretch', height: 8 }} />

            {/* Notice 2 */}
            <div className="receive-result-alert-box">
              <span className="receive-result-alert-icon">⚠</span>
              <div className="receive-result-alert-text">
                Bản cứng được lưu giữ 30 ngày kể từ ngày cấp.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReceiveResult;
