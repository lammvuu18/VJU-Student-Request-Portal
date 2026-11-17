import React, { useState } from 'react';
import './DigitalSignModal.css';

/**
 * Modal Ký số Điện tử Demo (MISA eSign Pattern)
 * Cho phép Hiệu trưởng xem trước con dấu đỏ tròn + chữ ký tay và xác nhận ký số.
 */
function DigitalSignModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  requestCode = 'REQ-20261031-004',
  studentName = 'Nguyễn Minh Anh',
  mssv = '21CS001',
  procedureName = 'Bảo lưu kết quả học tập',
  signerName = 'PGS.TS. Nguyễn Văn Bình',
  signerRole = 'Hiệu trưởng Trường Đại học Việt Nhật',
}) {
  const [pin, setPin] = useState('123456');
  const [showPin, setShowPin] = useState(false);
  const [committed, setCommitted] = useState(true);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!committed || loading) return;
    if (onConfirm) {
      onConfirm({ pin });
    }
  };

  return (
    <div className="digital-sign-overlay" onClick={onClose}>
      <div className="digital-sign-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="digital-sign-header">
          <div className="digital-sign-header-left">
            <div className="digital-sign-icon-badge">
              <span>✍️</span>
            </div>
            <div>
              <h3 className="digital-sign-title">Xác nhận Ký số Điện tử (Demo eSign)</h3>
              <div className="digital-sign-subtitle">
                Mô phỏng ký số theo chuẩn MISA eSign & Nghị định 30/2020/NĐ-CP
              </div>
            </div>
          </div>
          <button
            type="button"
            className="digital-sign-close-btn"
            onClick={onClose}
            disabled={loading}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="digital-sign-body">
          {/* Document Summary */}
          <div className="digital-sign-doc-summary">
            <div className="digital-sign-doc-row">
              <span className="digital-sign-doc-label">Văn bản trình ký:</span>
              <span className="digital-sign-doc-value">Quyết định cho phép tạm dừng & bảo lưu KQHT</span>
            </div>
            <div className="digital-sign-doc-row">
              <span className="digital-sign-doc-label">Mã hồ sơ:</span>
              <span className="digital-sign-doc-value" style={{ color: '#AA2327', fontWeight: 600 }}>
                {requestCode}
              </span>
            </div>
            <div className="digital-sign-doc-row">
              <span className="digital-sign-doc-label">Sinh viên:</span>
              <span className="digital-sign-doc-value">{studentName} ({mssv})</span>
            </div>
            <div className="digital-sign-doc-row">
              <span className="digital-sign-doc-label">Thủ tục:</span>
              <span className="digital-sign-doc-value">{procedureName}</span>
            </div>
          </div>

          {/* Certificate Card */}
          <div className="digital-sign-cert-card">
            <div className="digital-sign-cert-badge">Đã xác thực</div>
            <div className="digital-sign-cert-title">
              <span>🛡️</span> Chứng thư số của Người ký
            </div>
            <div className="digital-sign-cert-item">
              <span>Chủ thể ký:</span>
              <strong>{signerName}</strong>
            </div>
            <div className="digital-sign-cert-item">
              <span>Chức vụ:</span>
              <span>{signerRole}</span>
            </div>
            <div className="digital-sign-cert-item">
              <span>Nhà cung cấp CA:</span>
              <span>VJU Digital CA (Demo SmartCA / eSign)</span>
            </div>
            <div className="digital-sign-cert-item">
              <span>Serial chứng thư:</span>
              <code style={{ fontSize: 11, color: '#991B1B' }}>5402-1890-9982-7716-VJU</code>
            </div>
            <div className="digital-sign-cert-item">
              <span>Thời hạn hiệu lực:</span>
              <span>01/01/2026 — 31/12/2029 (Hợp lệ)</span>
            </div>
          </div>

          {/* Visual Signature Preview (MISA eSign Style) */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Xem trước mẫu hiển thị chữ ký trên Quyết định:
            </div>
            <div className="digital-sign-preview-box">
              <div className="digital-sign-preview-stamp">
                {/* Con dấu tròn đỏ tổ chức ĐH Việt Nhật */}
                <div className="seal-circle" title="Con dấu tròn tổ chức theo Nghị định 30/2020/NĐ-CP">
                  <div className="seal-circle-inner">
                    <div className="seal-univ">ĐHQG HÀ NỘI</div>
                    <div className="seal-school">ĐH VIỆT NHẬT</div>
                    <div className="seal-star">★</div>
                    <div className="seal-role">HIỆU TRƯỞNG</div>
                  </div>
                </div>

                {/* Chữ ký tay nét mực xanh */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <svg className="cursive-sig-svg" viewBox="0 0 160 70" fill="none">
                    {/* Đường nét chữ ký tay uốn lượn phong cách bút máy */}
                    <path
                      d="M10,40 C18,10 32,8 38,32 C42,48 48,15 56,22 C64,30 70,12 80,18 C90,24 82,48 100,35 C115,25 125,10 138,20 C146,26 150,42 155,38"
                      stroke="#002D72"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Gạch chân bay bổng */}
                    <path
                      d="M20,52 C60,46 110,48 152,54"
                      stroke="#002D72"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <circle cx="156" cy="54" r="2" fill="#002D72" />
                  </svg>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1F2937', marginTop: -4 }}>
                    {signerName}
                  </div>
                </div>

                {/* Khung chứng nhận số MISA eSign */}
                <div className="misa-cert-preview">
                  <div className="misa-cert-preview-header">✓ MISA eSign Verified</div>
                  <div><strong>Ký bởi:</strong> {signerName}</div>
                  <div><strong>Ngày ký:</strong> Hôm nay (GMT+07:00)</div>
                  <div style={{ color: '#059669', fontWeight: 600, fontSize: 9, marginTop: 2 }}>
                    ● Văn bản gốc toàn vẹn
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PIN Input */}
          <div className="digital-sign-pin-group">
            <label className="digital-sign-pin-label">
              Mã PIN ký số nội bộ (Demo):
            </label>
            <div className="digital-sign-pin-input-wrap">
              <input
                type={showPin ? 'text' : 'password'}
                className="digital-sign-pin-input"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Nhập mã PIN ký số"
                maxLength={8}
                disabled={loading}
              />
              <button
                type="button"
                className="digital-sign-pin-toggle"
                onClick={() => setShowPin(!showPin)}
                tabIndex={-1}
              >
                {showPin ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>
              * Mặc định hệ thống demo là <strong>123456</strong>.
            </div>
          </div>

          {/* Commitment Checkbox */}
          <label className="digital-sign-commitment">
            <input
              type="checkbox"
              checked={committed}
              onChange={(e) => setCommitted(e.target.checked)}
              disabled={loading}
            />
            <span>
              Tôi xác nhận với tư cách Hiệu trưởng đã thẩm tra nội dung Quyết định và đồng ý đóng dấu chữ ký số điện tử để ban hành quyết định này.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="digital-sign-footer">
          <button
            type="button"
            className="digital-sign-btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            className="digital-sign-btn-submit"
            onClick={handleConfirm}
            disabled={!committed || loading || !pin}
          >
            {loading ? (
              <>
                <div className="digital-sign-spinner" />
                <span>Đang đóng dấu ký số...</span>
              </>
            ) : (
              <>
                <span>✍️</span>
                <span>Xác nhận Ký số Quyết định</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DigitalSignModal;
