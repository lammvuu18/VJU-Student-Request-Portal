import React, { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { allRequests, studentOverviewRequests } from '../../data/mockData';
import './StudentPages.css';

function SupplementForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const fileInputRef = useRef(null);

  // Find request in mock data or fallback to Figma default
  const req = (studentOverviewRequests || []).find(
    (r) => r.id === id || r.request_code === id || String(r.request_id) === String(id)
  ) || (allRequests || []).find(
    (r) => r.id === id || r.request_code === id || String(r.request_id) === String(id)
  ) || {
    id: id || 'VJU-2026-0840',
    student: 'Nguyễn Minh Anh',
    mssv: '23110150',
    procedure: 'Cấp bảng điểm',
  };

  const [fullName, setFullName] = useState(req.student || 'Nguyễn Minh Anh');
  const [mssv, setMssv] = useState(req.mssv || '23110150');
  const [lop, setLop] = useState('QH-2023-I/CQ-M-CLC');
  const [khoa, setKhoa] = useState('QH-2023');
  const [nganh, setNganh] = useState('Khoa học máy tính');
  const [email, setEmail] = useState('23110150@vnu.edu.vn');
  const [purpose, setPurpose] = useState('Xin việc / Ứng tuyển');
  const [quantity, setQuantity] = useState(1);
  const [language, setLanguage] = useState('Tiếng Việt');
  const [deliveryMethod, setDeliveryMethod] = useState('PDF ký số');
  const [notes, setNotes] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setUploadedFile({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      });
      showToast(`Đã chọn tệp: ${file.name}`);
    }
  };

  const handleTriggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    showToast('Đang lưu thông tin bổ sung...');
    setTimeout(() => {
      setSubmitting(false);
      navigate('/student/request/supplement/success', {
        state: {
          requestCode: req.id || req.request_code || 'VJU-2026-0842',
          procedureName: req.procedure || req.type_name || 'Cấp bảng điểm',
          submissionDate: '21/10/2026',
          status: 'Đang xử lý',
        },
      });
    }, 500);
  };

  return (
    <div className="supplement-page-container">
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
        }}>
          <span>✓</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".pdf"
        onChange={handleFileChange}
      />

      {/* Title Bar */}
      <div className="supplement-top-bar">
        <h1 className="supplement-title">Bổ sung hồ sơ</h1>
        <button
          type="button"
          className="btn-back-to-detail"
          onClick={() => navigate(-1)}
        >
          <span>← Chi tiết yêu cầu</span>
        </button>
      </div>

      {/* Form Container Card */}
      <form className="supplement-card" onSubmit={handleSubmit}>
        {/* Row 1: Họ và tên * & Mã số sinh viên * */}
        <div className="supplement-form-row">
          <div className="supplement-form-col">
            <label className="supplement-field-label">
              <span>Họ và tên</span>
              <span className="supplement-required-star">*</span>
            </label>
            <input
              type="text"
              className="supplement-input-box"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="supplement-form-col">
            <label className="supplement-field-label">
              <span>Mã số sinh viên</span>
              <span className="supplement-required-star">*</span>
            </label>
            <input
              type="text"
              className="supplement-input-box"
              value={mssv}
              onChange={(e) => setMssv(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Row 2: Lớp * & Khóa * */}
        <div className="supplement-form-row">
          <div className="supplement-form-col">
            <label className="supplement-field-label">
              <span>Lớp</span>
              <span className="supplement-required-star">*</span>
            </label>
            <input
              type="text"
              className="supplement-input-box"
              value={lop}
              onChange={(e) => setLop(e.target.value)}
              required
            />
          </div>
          <div className="supplement-form-col">
            <label className="supplement-field-label">
              <span>Khóa</span>
              <span className="supplement-required-star">*</span>
            </label>
            <div className="supplement-select-box">
              <select value={khoa} onChange={(e) => setKhoa(e.target.value)}>
                <option value="QH-2023">QH-2023</option>
                <option value="QH-2022">QH-2022</option>
                <option value="QH-2021">QH-2021</option>
                <option value="QH-2020">QH-2020</option>
              </select>
            </div>
          </div>
        </div>

        {/* Row 3: Ngành * & Email * */}
        <div className="supplement-form-row">
          <div className="supplement-form-col">
            <label className="supplement-field-label">
              <span>Ngành</span>
              <span className="supplement-required-star">*</span>
            </label>
            <div className="supplement-select-box">
              <select value={nganh} onChange={(e) => setNganh(e.target.value)}>
                <option value="Khoa học máy tính">Khoa học máy tính</option>
                <option value="Kỹ thuật Cơ điện tử">Kỹ thuật Cơ điện tử</option>
                <option value="Công nghệ Kỹ thuật Xây dựng">Công nghệ Kỹ thuật Xây dựng</option>
                <option value="Nông nghiệp Thông minh">Nông nghiệp Thông minh</option>
                <option value="Nhật Bản học">Nhật Bản học</option>
              </select>
            </div>
          </div>
          <div className="supplement-form-col">
            <label className="supplement-field-label">
              <span>Email</span>
              <span className="supplement-required-star">*</span>
            </label>
            <input
              type="email"
              className="supplement-input-box"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Row 4: Mục đích sử dụng * */}
        <div className="supplement-form-col" style={{ width: '100%' }}>
          <label className="supplement-field-label">
            <span>Mục đích sử dụng</span>
            <span className="supplement-required-star">*</span>
          </label>
          <input
            type="text"
            className="supplement-input-box"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            required
          />
        </div>

        {/* Row 5: Số bản * */}
        <div className="supplement-form-col" style={{ width: '100%' }}>
          <label className="supplement-field-label">
            <span>Số bản</span>
            <span className="supplement-required-star">*</span>
          </label>
          <div className="supplement-stepper">
            <button
              type="button"
              className="supplement-stepper-btn"
              disabled={quantity <= 1}
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              −
            </button>
            <div className="supplement-stepper-value">
              {String(quantity).padStart(2, '0')}
            </div>
            <button
              type="button"
              className="supplement-stepper-btn"
              onClick={() => setQuantity(quantity + 1)}
            >
              +
            </button>
          </div>
        </div>

        {/* Row 6: Ngôn ngữ * & Hình thức nhận * */}
        <div className="supplement-form-row">
          <div className="supplement-form-col">
            <label className="supplement-field-label">
              <span>Ngôn ngữ</span>
              <span className="supplement-required-star">*</span>
            </label>
            <div className="supplement-select-box">
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="Tiếng Việt">Tiếng Việt</option>
                <option value="Tiếng Anh">Tiếng Anh</option>
                <option value="Song ngữ Việt - Anh">Song ngữ Việt - Anh</option>
              </select>
            </div>
          </div>
          <div className="supplement-form-col">
            <label className="supplement-field-label">
              <span>Hình thức nhận</span>
              <span className="supplement-required-star">*</span>
            </label>
            <div className="supplement-select-box">
              <select value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value)}>
                <option value="PDF ký số">PDF ký số</option>
                <option value="Bản giấy tại phòng Một cửa">Bản giấy tại phòng Một cửa</option>
                <option value="Chuyển phát nhanh bưu điện">Chuyển phát nhanh bưu điện</option>
              </select>
            </div>
          </div>
        </div>

        {/* Row 7: Ghi chú */}
        <div className="supplement-form-col" style={{ width: '100%' }}>
          <label className="supplement-field-label">
            <span>Ghi chú</span>
          </label>
          <textarea
            className="supplement-textarea"
            placeholder="Nhập ghi chú bổ sung nếu có..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Row 8: Hồ sơ đính kèm */}
        <div className="supplement-form-col" style={{ width: '100%' }}>
          <label className="supplement-field-label">
            <span>Hồ sơ đính kèm</span>
          </label>
          <div className="supplement-upload-zone">
            {uploadedFile ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: '#ECFDF5',
                border: '1px solid #10B981',
                padding: '10px 16px',
                borderRadius: 8,
              }}>
                <span style={{ color: '#059669', fontSize: 16 }}>✓</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#065F46' }}>
                  {uploadedFile.name} ({uploadedFile.size})
                </span>
                <button
                  type="button"
                  style={{
                    marginLeft: 12,
                    background: 'none',
                    border: 'none',
                    color: '#DC2626',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                  onClick={() => setUploadedFile(null)}
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <div className="supplement-upload-title">Kéo thả tệp vào đây hoặc</div>
                <button
                  type="button"
                  className="btn-upload-file"
                  onClick={handleTriggerUpload}
                >
                  <span>Chọn tệp ↑</span>
                </button>
                <div className="supplement-upload-subtext">Chấp nhận PDF · Tối đa 5 MB</div>
              </>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="supplement-bottom-actions">
          <button
            type="button"
            className="btn-supplement-back"
            onClick={() => navigate(-1)}
          >
            ← Quay lại
          </button>
          <button
            type="submit"
            className="btn-supplement-submit"
            disabled={submitting}
          >
            <span>{submitting ? 'Đang lưu...' : 'Cập nhật thay đổi →'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default SupplementForm;
