import React, { useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { users, procedures } from '../../data/mockData';
import './StudentPages.css';

function RequestForm({ initialStep }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { procedureId } = useParams();
  const searchParams = new URLSearchParams(location.search);
  const stepFromQuery = searchParams.get('step');

  const procedure = procedures.find(p => p.id === parseInt(procedureId)) || procedures[0];
  const student = users.student || {};

  // Current Step: 1 = Điền thông tin, 2 = Thanh toán lệ phí
  const [currentStep, setCurrentStep] = useState(
    initialStep || (stepFromQuery === '2' ? 2 : 1)
  );

  // Form State (Step 1)
  const [formData, setFormData] = useState({
    fullName: student.full_name || student.name || 'Nguyễn Minh Anh',
    mssv: student.mssv || '21CS001',
    className: student.class_name || 'BCSE-2021',
    cohort: 'QH-2021',
    major: 'Khoa học Máy tính',
    email: student.email || 'minhanh@vju.ac.vn',
    purpose: '',
    quantity: 1,
    language: 'Tiếng Việt',
    deliveryMethod: 'Bản điện tử (PDF ký số)',
    notes: '',
  });

  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Payment State (Step 2)
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'transfer' | 'wallet'
  const [cardData, setCardData] = useState({
    cardHolder: 'NGUYEN MINH ANH',
    cardNumber: '9704 2200 1234 5678',
    expiry: '12 / 28',
    cvv: '888',
  });

  // Calculate pricing
  const unitFee = procedure.fee_amount || (procedure.fee === 'Miễn phí' ? 0 : 30000);
  const totalAmount = unitFee * formData.quantity;
  const formattedUnitPrice = unitFee === 0 ? 'Miễn phí' : `${unitFee.toLocaleString('vi-VN')} VNĐ`;
  const formattedTotalPrice = unitFee === 0 ? 'Miễn phí' : `${totalAmount.toLocaleString('vi-VN')} VNĐ`;
  const orderCode = 'VJU-2026-0842';

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleQuantityChange = (delta) => {
    setFormData(prev => ({
      ...prev,
      quantity: Math.max(1, prev.quantity + delta),
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Submit Step 1 -> Go to Step 2
  const handleStep1Submit = (e) => {
    e.preventDefault();
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit Step 2 -> Success
  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    navigate('/student/request/success', {
      state: {
        procedure,
        formData,
        orderCode,
        totalAmount: formattedTotalPrice,
        paymentMethod,
        filesCount: files.length,
      },
    });
  };

  const formattedQuantity = formData.quantity < 10 ? `0${formData.quantity}` : `${formData.quantity}`;

  const getHeaderTitle = () => {
    if (procedure.id === 1 || procedure.name === 'Cấp bảng điểm') {
      return 'Nộp yêu cầu cấp bảng điểm';
    }
    return `Nộp yêu cầu ${procedure.name.toLowerCase()}`;
  };

  // ==========================================
  // RENDER STEP 2: THANH TOÁN LỆ PHÍ (FIGMA)
  // ==========================================
  if (currentStep === 2) {
    return (
      <div className="reqpayment-container">
        {/* Main Title Centered */}
        <h1 className="reqpayment-main-title">Thanh toán lệ phí</h1>

        {/* Stepper Bar (Active Step 2) */}
        <div className="reqpayment-stepper-wrap">
          <div className="reqpayment-stepper">
            {/* Step 1 */}
            <div className="reqpayment-step-col">
              <div className="reqpayment-step-line-row">
                <div className="reqpayment-connector-line empty" />
                <div className="reqpayment-step-circle">1</div>
                <div className="reqpayment-connector-line" />
              </div>
              <div className="reqpayment-step-title">Điền thông tin</div>
            </div>

            {/* Step 2: Active */}
            <div className="reqpayment-step-col">
              <div className="reqpayment-step-line-row">
                <div className="reqpayment-connector-line active-half" />
                <div className="reqpayment-step-circle active">2</div>
                <div className="reqpayment-connector-line" />
              </div>
              <div className="reqpayment-step-title active">Xác nhận &amp; thanh toán</div>
            </div>

            {/* Step 3 */}
            <div className="reqpayment-step-col">
              <div className="reqpayment-step-line-row">
                <div className="reqpayment-connector-line" />
                <div className="reqpayment-step-circle">3</div>
                <div className="reqpayment-connector-line" />
              </div>
              <div className="reqpayment-step-title">Xử lý</div>
            </div>

            {/* Step 4 */}
            <div className="reqpayment-step-col">
              <div className="reqpayment-step-line-row">
                <div className="reqpayment-connector-line" />
                <div className="reqpayment-step-circle">4</div>
                <div className="reqpayment-connector-line empty" />
              </div>
              <div className="reqpayment-step-title">Nhận kết quả</div>
            </div>
          </div>
        </div>

        {/* 2-Columns Box */}
        <div className="reqpayment-content-row">
          {/* Left Column: Hóa đơn & Đơn hàng */}
          <div className="reqpayment-invoice-card">
            <div className="reqpayment-invoice-brand">VJU PORTAL</div>
            <div className="reqpayment-invoice-code">Mã đơn: {orderCode}</div>

            <div className="reqpayment-invoice-spacer" />

            <div className="reqpayment-invoice-item-row">
              <div className="reqpayment-invoice-item-name">{procedure.name}</div>
              <div className="reqpayment-invoice-item-price">{formattedUnitPrice}</div>
            </div>

            <div className="reqpayment-invoice-qty-row">
              <div className="reqpayment-invoice-qty-label">Số tờ</div>
              <div className="reqpayment-invoice-qty-val">× {formData.quantity}</div>
            </div>

            <div className="reqpayment-divider" />

            <div className="reqpayment-invoice-total-row">
              <div className="reqpayment-invoice-total-label">Tổng cộng</div>
              <div className="reqpayment-invoice-total-val">{formattedTotalPrice}</div>
            </div>
          </div>

          {/* Right Column: Phương thức thanh toán & Form */}
          <div className="reqpayment-form-card">
            {/* Payment Method Tabs */}
            <div className="reqpayment-tabs-row">
              {/* Tab 1: Thẻ ngân hàng */}
              <button
                type="button"
                className={`reqpayment-tab-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('card')}
              >
                <div className="reqpayment-tab-icon">
                  <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                    <rect x="0.5" y="0.5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M0.5 3.5h15" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="3.5" cy="7.5" r="1" fill="currentColor" />
                  </svg>
                </div>
                <span>Thẻ ngân hàng</span>
              </button>

              {/* Tab 2: Chuyển khoản */}
              <button
                type="button"
                className={`reqpayment-tab-btn ${paymentMethod === 'transfer' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('transfer')}
              >
                <div className="reqpayment-tab-icon">
                  <svg width="16" height="13" viewBox="0 0 16 13" fill="none">
                    <rect x="1" y="2" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M4 5.5h8M4 8.5h5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                  </svg>
                </div>
                <span>Chuyển khoản</span>
              </button>

              {/* Tab 3: Ví điện tử */}
              <button
                type="button"
                className={`reqpayment-tab-btn ${paymentMethod === 'wallet' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('wallet')}
              >
                <div className="reqpayment-tab-icon">
                  <svg width="16" height="13" viewBox="0 0 16 13" fill="none">
                    <rect x="1" y="3" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M3 1h10a1.5 1.5 0 011.5 1.5V3" stroke="currentColor" strokeWidth="1.1" />
                    <circle cx="11.5" cy="7.5" r="1.2" fill="currentColor" />
                  </svg>
                </div>
                <span>Ví điện tử</span>
              </button>
            </div>

            {/* Card Form Fields */}
            {paymentMethod === 'card' && (
              <>
                <div className="reqpayment-field-group">
                  <label className="reqpayment-field-label">Tên chủ thẻ</label>
                  <input
                    type="text"
                    className="reqpayment-field-input"
                    value={cardData.cardHolder}
                    onChange={(e) => setCardData({ ...cardData, cardHolder: e.target.value })}
                    placeholder="NGUYEN MINH ANH"
                  />
                </div>

                <div className="reqpayment-field-group">
                  <label className="reqpayment-field-label">Số thẻ</label>
                  <input
                    type="text"
                    className="reqpayment-field-input"
                    value={cardData.cardNumber}
                    onChange={(e) => setCardData({ ...cardData, cardNumber: e.target.value })}
                    placeholder="0000 0000 0000 0000"
                  />
                </div>

                <div className="reqpayment-fields-row">
                  <div className="reqpayment-field-group">
                    <label className="reqpayment-field-label">Ngày hết hạn</label>
                    <input
                      type="text"
                      className="reqpayment-field-input"
                      value={cardData.expiry}
                      onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                      placeholder="MM / YY"
                    />
                  </div>
                  <div className="reqpayment-field-group">
                    <label className="reqpayment-field-label">CVV</label>
                    <input
                      type="password"
                      maxLength={4}
                      className="reqpayment-field-input"
                      value={cardData.cvv}
                      onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                      placeholder="•••"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="reqpayment-btn-submit"
                  onClick={handlePaymentSubmit}
                >
                  Thanh toán ngay →
                </button>
              </>
            )}

            {/* Transfer View */}
            {paymentMethod === 'transfer' && (
              <div className="reqpayment-transfer-box">
                <div className="reqpayment-qr-wrap">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=21020001_${orderCode}_${totalAmount}`}
                    alt="VietQR Payment"
                    className="reqpayment-qr-img"
                  />
                </div>
                <div className="reqpayment-transfer-info">
                  <div className="reqpayment-transfer-row">
                    <span>Ngân hàng:</span> <strong>Vietcombank (Hà Nội)</strong>
                  </div>
                  <div className="reqpayment-transfer-row">
                    <span>Số tài khoản:</span> <strong>0011 0042 8888</strong>
                  </div>
                  <div className="reqpayment-transfer-row">
                    <span>Chủ tài khoản:</span> <strong>TRUONG DAI HOC VIET NHAT</strong>
                  </div>
                  <div className="reqpayment-transfer-row">
                    <span>Số tiền:</span> <strong style={{ color: '#AA2327' }}>{formattedTotalPrice}</strong>
                  </div>
                  <div className="reqpayment-transfer-row">
                    <span>Nội dung CK:</span> <strong>{orderCode}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className="reqpayment-btn-submit"
                  onClick={handlePaymentSubmit}
                >
                  Tôi đã chuyển khoản →
                </button>
              </div>
            )}

            {/* Wallet View */}
            {paymentMethod === 'wallet' && (
              <div className="reqpayment-transfer-box">
                <div className="reqpayment-qr-wrap">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=MOMO_${orderCode}_${totalAmount}`}
                    alt="MoMo QR"
                    className="reqpayment-qr-img"
                  />
                </div>
                <p style={{ fontSize: 13, color: '#68717D', textAlign: 'center', margin: '8px 0' }}>
                  Quét mã qua ứng dụng <strong>MoMo</strong> hoặc <strong>VNPay</strong> để hoàn tất thanh toán.
                </p>
                <button
                  type="button"
                  className="reqpayment-btn-submit"
                  onClick={handlePaymentSubmit}
                >
                  Xác nhận ví điện tử →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Back Button */}
        <div className="reqpayment-bottom-row">
          <button
            type="button"
            className="reqpayment-btn-back"
            onClick={() => {
              setCurrentStep(1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            ← Quay lại bước trước
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER STEP 1: ĐIỀN THÔNG TIN THỦ TỤC
  // ==========================================
  const steps = [
    { num: 1, label: 'Điền thông tin', active: true },
    { num: 2, label: 'Xác nhận & thanh toán', active: false },
    { num: 3, label: 'Xử lý', active: false },
    { num: 4, label: 'Nhận kết quả', active: false },
  ];

  return (
    <div className="reqform-container">
      {/* Centered Page Title */}
      <h1 className="reqform-main-title">{getHeaderTitle()}</h1>

      {/* Stepper Bar */}
      <div className="reqform-stepper-wrap">
        <div className="reqform-stepper">
          {steps.map((step, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === steps.length - 1;

            return (
              <div key={step.num} className="reqform-step-col">
                <div className="reqform-step-line-row">
                  <div className={`reqform-connector-line ${isFirst ? 'empty' : ''}`} />
                  <div className={`reqform-step-circle ${step.active ? 'active' : ''}`}>
                    {step.num}
                  </div>
                  <div className={`reqform-connector-line ${isLast ? 'empty' : ''}`} />
                </div>
                <div className={`reqform-step-title ${step.active ? 'active' : ''}`}>
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Form Card */}
      <form className="reqform-card" onSubmit={handleStep1Submit}>
        {/* Row 1: Họ và tên & Mã số sinh viên */}
        <div className="reqform-row">
          <div className="reqform-col">
            <div className="reqform-label-row">
              <span className="reqform-label">Họ và tên</span>
              <span className="reqform-required"> *</span>
            </div>
            <input
              type="text"
              className="reqform-input"
              placeholder="Nhập họ và tên"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              required
            />
          </div>

          <div className="reqform-col">
            <div className="reqform-label-row">
              <span className="reqform-label">Mã số sinh viên</span>
              <span className="reqform-required"> *</span>
            </div>
            <input
              type="text"
              className="reqform-input"
              placeholder="Nhập MSSV"
              value={formData.mssv}
              onChange={(e) => handleChange('mssv', e.target.value)}
              required
            />
          </div>
        </div>

        {/* Row 2: Lớp & Khóa */}
        <div className="reqform-row">
          <div className="reqform-col">
            <div className="reqform-label-row">
              <span className="reqform-label">Lớp</span>
              <span className="reqform-required"> *</span>
            </div>
            <input
              type="text"
              className="reqform-input"
              placeholder="Nhập lớp"
              value={formData.className}
              onChange={(e) => handleChange('className', e.target.value)}
              required
            />
          </div>

          <div className="reqform-col">
            <div className="reqform-label-row">
              <span className="reqform-label">Khóa</span>
              <span className="reqform-required"> *</span>
            </div>
            <div className="reqform-select-wrap">
              <select
                className="reqform-select"
                value={formData.cohort}
                onChange={(e) => handleChange('cohort', e.target.value)}
                required
              >
                <option value="" disabled>Chọn niên khóa</option>
                <option value="QH-2021">QH-2021</option>
                <option value="QH-2022">QH-2022</option>
                <option value="QH-2023">QH-2023</option>
                <option value="QH-2024">QH-2024</option>
                <option value="QH-2025">QH-2025</option>
              </select>
              <span className="reqform-select-arrow">▾</span>
            </div>
          </div>
        </div>

        {/* Row 3: Ngành & Email */}
        <div className="reqform-row">
          <div className="reqform-col">
            <div className="reqform-label-row">
              <span className="reqform-label">Ngành</span>
              <span className="reqform-required"> *</span>
            </div>
            <div className="reqform-select-wrap">
              <select
                className="reqform-select"
                value={formData.major}
                onChange={(e) => handleChange('major', e.target.value)}
                required
              >
                <option value="" disabled>Chọn ngành</option>
                <option value="Khoa học Máy tính">Khoa học Máy tính</option>
                <option value="Kỹ thuật Máy tính">Kỹ thuật Máy tính</option>
                <option value="Kỹ thuật Xây dựng">Kỹ thuật Xây dựng</option>
                <option value="Nông nghiệp Thông minh">Nông nghiệp Thông minh</option>
                <option value="Công nghệ Thực phẩm">Công nghệ Thực phẩm</option>
                <option value="Nhật Bản học">Nhật Bản học</option>
              </select>
              <span className="reqform-select-arrow">▾</span>
            </div>
          </div>

          <div className="reqform-col">
            <div className="reqform-label-row">
              <span className="reqform-label">Email</span>
              <span className="reqform-required"> *</span>
            </div>
            <input
              type="email"
              className="reqform-input"
              placeholder="Nhập email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
            />
          </div>
        </div>

        {/* Row 4: Mục đích sử dụng */}
        <div className="reqform-col full-width">
          <div className="reqform-label-row">
            <span className="reqform-label">Mục đích sử dụng</span>
            <span className="reqform-required"> *</span>
          </div>
          <input
            type="text"
            className="reqform-input"
            placeholder="Nhập mục đích sử dụng bảng điểm"
            value={formData.purpose}
            onChange={(e) => handleChange('purpose', e.target.value)}
            required
          />
        </div>

        {/* Row 5: Số bản (Stepper Counter) */}
        <div className="reqform-col full-width">
          <div className="reqform-label-row">
            <span className="reqform-label">Số bản</span>
            <span className="reqform-required"> *</span>
          </div>
          <div className="reqform-counter">
            <button
              type="button"
              className="reqform-counter-btn"
              onClick={() => handleQuantityChange(-1)}
            >
              −
            </button>
            <div className="reqform-counter-val">{formattedQuantity}</div>
            <button
              type="button"
              className="reqform-counter-btn"
              onClick={() => handleQuantityChange(1)}
            >
              +
            </button>
          </div>
        </div>

        {/* Row 6: Ngôn ngữ & Hình thức nhận */}
        <div className="reqform-row">
          <div className="reqform-col">
            <div className="reqform-label-row">
              <span className="reqform-label">Ngôn ngữ</span>
              <span className="reqform-required"> *</span>
            </div>
            <div className="reqform-select-wrap">
              <select
                className="reqform-select"
                value={formData.language}
                onChange={(e) => handleChange('language', e.target.value)}
                required
              >
                <option value="" disabled>Chọn ngôn ngữ</option>
                <option value="Tiếng Việt">Tiếng Việt</option>
                <option value="Tiếng Anh">Tiếng Anh</option>
                <option value="Song ngữ (Việt - Anh)">Song ngữ (Việt - Anh)</option>
              </select>
              <span className="reqform-select-arrow">▾</span>
            </div>
          </div>

          <div className="reqform-col">
            <div className="reqform-label-row">
              <span className="reqform-label">Hình thức nhận</span>
              <span className="reqform-required"> *</span>
            </div>
            <div className="reqform-select-wrap">
              <select
                className="reqform-select"
                value={formData.deliveryMethod}
                onChange={(e) => handleChange('deliveryMethod', e.target.value)}
                required
              >
                <option value="" disabled>Chọn hình thức nhận</option>
                <option value="Bản điện tử (PDF ký số)">Bản điện tử (PDF ký số)</option>
                <option value="Bản cứng tại phòng">Bản cứng tại phòng</option>
                <option value="Cả hai hình thức">Cả hai hình thức</option>
              </select>
              <span className="reqform-select-arrow">▾</span>
            </div>
          </div>
        </div>

        {/* Row 7: Ghi chú */}
        <div className="reqform-col full-width">
          <div className="reqform-label-row">
            <span className="reqform-label">Ghi chú</span>
          </div>
          <input
            type="text"
            className="reqform-input"
            placeholder="Nhập ghi chú (không bắt buộc)"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
          />
        </div>

        {/* Row 8: Hồ sơ đính kèm */}
        <div className="reqform-col full-width">
          <div className="reqform-label-row">
            <span className="reqform-label">Hồ sơ đính kèm</span>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            multiple
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
          />

          <div
            className={`reqform-dropzone ${isDragging ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="reqform-dropzone-text">Kéo thả tệp vào đây hoặc</div>
            <div className="reqform-dropzone-btn">
              <span>Chọn tệp ↑</span>
            </div>
            <div className="reqform-dropzone-hint">Chấp nhận PDF · Tối đa 5 MB</div>
          </div>

          {/* Uploaded files preview */}
          {files.length > 0 && (
            <div className="reqform-uploaded-list">
              {files.map((file, idx) => (
                <div key={idx} className="reqform-uploaded-item">
                  <span className="reqform-file-icon">📄</span>
                  <span className="reqform-file-name">{file.name}</span>
                  <span className="reqform-file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                  <button
                    type="button"
                    className="reqform-file-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(idx);
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Row 9: Buttons Footer */}
        <div className="reqform-actions-row">
          <button
            type="button"
            className="reqform-btn-back"
            onClick={() => navigate(-1)}
          >
            ← Quay lại
          </button>
          <button
            type="submit"
            className="reqform-btn-submit"
          >
            Gửi và thanh toán →
          </button>
        </div>
      </form>
    </div>
  );
}

export default RequestForm;
