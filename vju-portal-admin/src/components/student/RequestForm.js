import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api, { getCurrentUser } from '../../services/api';
import './StudentPages.css';

// Giá trị tự điền lấy từ hồ sơ người dùng (backend vẫn ghi đè lại khi lưu)
const resolveAutoFill = (key, user) => {
  const mapping = {
    'student.full_name': user.full_name || user.name,
    'student.mssv': user.mssv,
    'student.class_name': user.class_name,
    'student.cohort': user.cohort,
    'student.major': user.major,
    'student.email': user.email,
  };
  if (key in mapping) return mapping[key] || '';
  return null;
};

// required_if dạng { field_key, value } hoặc { <field_key>: <value>, ... }
const matchesCondition = (requiredIf, values) => {
  if (!requiredIf || typeof requiredIf !== 'object') return false;
  if ('field_key' in requiredIf && 'value' in requiredIf) {
    return values[requiredIf.field_key] === requiredIf.value;
  }
  return Object.entries(requiredIf).every(([k, v]) => values[k] === v);
};

const parseFormats = (allowed) =>
  (allowed || 'PDF,JPG,PNG').split(',').map(f => f.trim().toLowerCase()).filter(Boolean);

function RequestForm({ initialStep }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { procedureId } = useParams();
  const searchParams = new URLSearchParams(location.search);
  const stepFromQuery = searchParams.get('step');
  const student = getCurrentUser() || {};

  const [procedure, setProcedure] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [values, setValues] = useState({});
  // { [config_id]: File[] }
  const [filesByConfig, setFilesByConfig] = useState({});
  const [dragConfigId, setDragConfigId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdRequest, setCreatedRequest] = useState(null);

  // Current Step: 1 = Điền thông tin, 2 = Thanh toán lệ phí
  const [currentStep, setCurrentStep] = useState(
    initialStep || (stepFromQuery === '2' ? 2 : 1)
  );

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!procedureId) {
        setLoadError('Chưa chọn thủ tục. Vui lòng chọn thủ tục từ danh mục.');
        return;
      }
      try {
        const res = await api.procedures.getDetail(procedureId);
        if (!isMounted) return;
        const detail = res.data;
        const initialValues = {};
        (detail.form_fields || []).forEach((field) => {
          const auto = field.auto_fill_field ? resolveAutoFill(field.auto_fill_field, student) : null;
          initialValues[field.field_key] = auto !== null ? auto : '';
        });
        setProcedure(detail);
        setValues(initialValues);
      } catch (err) {
        if (isMounted) setLoadError(err.message || 'Không tải được thông tin thủ tục.');
      }
    };
    load();
    return () => { isMounted = false; };
  }, [procedureId]);

  // Payment State (Step 2) — backend chưa có cổng thanh toán, màn hình này chỉ mô phỏng
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'transfer' | 'wallet'
  const [cardData, setCardData] = useState({
    cardHolder: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });

  const unitFee = (procedure && procedure.is_fee_required && procedure.fee_amount) || 0;
  const formData = { quantity: 1 };
  const totalAmount = unitFee * formData.quantity;
  const formattedUnitPrice = unitFee === 0 ? 'Miễn phí' : `${unitFee.toLocaleString('vi-VN')} VNĐ`;
  const formattedTotalPrice = unitFee === 0 ? 'Miễn phí' : `${totalAmount.toLocaleString('vi-VN')} VNĐ`;
  const orderCode = createdRequest ? createdRequest.request_code : '';

  const handleChange = (key, value) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const addFiles = (config, fileList) => {
    const formats = parseFormats(config.allowed_formats);
    const maxBytes = (config.max_size_mb || 5) * 1024 * 1024;
    const accepted = [];
    for (const file of Array.from(fileList || [])) {
      const ext = file.name.split('.').pop().toLowerCase();
      const normalizedExt = ext === 'jpeg' ? 'jpg' : ext;
      if (!formats.includes(normalizedExt)) {
        setSubmitError(`"${file.name}": chỉ chấp nhận ${formats.join(', ').toUpperCase()}.`);
        continue;
      }
      if (file.size > maxBytes) {
        setSubmitError(`"${file.name}" vượt quá ${config.max_size_mb || 5} MB.`);
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length > 0) {
      setFilesByConfig(prev => ({ ...prev, [config.config_id]: [...(prev[config.config_id] || []), ...accepted] }));
    }
  };

  const handleRemoveFile = (configId, index) => {
    setFilesByConfig(prev => ({ ...prev, [configId]: (prev[configId] || []).filter((_, i) => i !== index) }));
  };

  const isFieldVisible = (field) => !field.required_if || matchesCondition(field.required_if, values);
  const isFieldRequired = (field) => field.is_required || matchesCondition(field.required_if, values);

  // Gửi yêu cầu lên backend
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    const missingAttachment = (procedure.attachment_configs || []).find(
      c => c.is_required && !(filesByConfig[c.config_id] || []).length
    );
    if (missingAttachment) {
      setSubmitError(`Vui lòng đính kèm: ${missingAttachment.item_name}.`);
      return;
    }

    // Chỉ gửi các trường đang hiển thị, trường tự điền do backend tự lấy
    const formPayload = {};
    (procedure.form_fields || []).forEach((field) => {
      if (field.auto_fill_field || !isFieldVisible(field)) return;
      const val = values[field.field_key];
      if (val === '' || val === undefined || val === null) return;
      formPayload[field.field_key] = field.data_type === 'number' ? Number(val) : val;
    });

    const attachments = [];
    Object.entries(filesByConfig).forEach(([configId, files]) => {
      files.forEach(file => attachments.push({ config_id: configId, file }));
    });

    setSubmitting(true);
    try {
      const res = await api.requests.create({
        type_id: procedure.type_id,
        form_data: formPayload,
        attachments,
      });
      setCreatedRequest(res.data);
      if (procedure.is_fee_required) {
        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        navigate('/student/request/success', {
          state: { procedure, request: res.data, message: res.message },
        });
      }
    } catch (err) {
      setSubmitError(err.message || 'Gửi yêu cầu thất bại.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  // Backend chưa có cổng thanh toán: đơn đã được tạo ở trạng thái "Chờ thanh toán"
  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    navigate('/student/request/success', {
      state: {
        procedure,
        request: createdRequest,
        message: 'Đơn đã được tạo và đang chờ thanh toán. Cổng thanh toán trực tuyến chưa được tích hợp.',
      },
    });
  };

  if (loadError) {
    return (
      <div className="reqform-container">
        <div className="reqform-card">
          <p style={{ color: '#B91C1C', margin: 0 }}>{loadError}</p>
          <div className="reqform-actions-row">
            <button type="button" className="reqform-btn-back" onClick={() => navigate('/student/procedures')}>
              ← Về danh mục thủ tục
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!procedure) {
    return (
      <div className="reqform-container">
        <p style={{ textAlign: 'center', color: '#68717D' }}>Đang tải thông tin thủ tục...</p>
      </div>
    );
  }

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
  const steps = procedure.is_fee_required
    ? [
      { num: 1, label: 'Điền thông tin', active: true },
      { num: 2, label: 'Xác nhận & thanh toán', active: false },
      { num: 3, label: 'Xử lý', active: false },
      { num: 4, label: 'Nhận kết quả', active: false },
    ]
    : [
      { num: 1, label: 'Điền thông tin', active: true },
      { num: 2, label: 'Xử lý', active: false },
      { num: 3, label: 'Nhận kết quả', active: false },
    ];

  const renderInput = (field) => {
    const value = values[field.field_key] ?? '';
    const required = isFieldRequired(field);

    if (field.auto_fill_field) {
      const autoValue = resolveAutoFill(field.auto_fill_field, student);
      return (
        <input
          type="text"
          className="reqform-input"
          value={autoValue !== null ? autoValue : ''}
          placeholder="Hệ thống tự động điền khi gửi"
          readOnly
          disabled
        />
      );
    }

    if (field.data_type === 'dropdown') {
      return (
        <div className="reqform-select-wrap">
          <select
            className="reqform-select"
            value={value}
            onChange={(e) => handleChange(field.field_key, e.target.value)}
            required={required}
          >
            <option value="" disabled>{field.placeholder || `Chọn ${field.field_name.toLowerCase()}`}</option>
            {(field.dropdown_options || []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <span className="reqform-select-arrow">▾</span>
        </div>
      );
    }

    if (field.data_type === 'radio') {
      return (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', paddingTop: 6 }}>
          {(field.dropdown_options || []).map(opt => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
              <input
                type="radio"
                name={field.field_key}
                value={opt}
                checked={value === opt}
                onChange={() => handleChange(field.field_key, opt)}
                required={required}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }

    if (field.data_type === 'textarea') {
      return (
        <textarea
          className="reqform-input"
          rows={4}
          style={{ height: 'auto', paddingTop: 10, resize: 'vertical' }}
          placeholder={field.placeholder || ''}
          value={value}
          onChange={(e) => handleChange(field.field_key, e.target.value)}
          required={required}
        />
      );
    }

    const inputType = { number: 'number', date: 'date' }[field.data_type] || 'text';
    return (
      <input
        type={inputType}
        className="reqform-input"
        placeholder={field.placeholder || ''}
        value={value}
        onChange={(e) => handleChange(field.field_key, e.target.value)}
        required={required}
      />
    );
  };

  const visibleFields = (procedure.form_fields || []).filter(isFieldVisible);

  return (
    <div className="reqform-container">
      {/* Centered Page Title */}
      <h1 className="reqform-main-title">Nộp yêu cầu {procedure.name.toLowerCase()}</h1>

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
        {submitError && (
          <div
            role="alert"
            style={{
              padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5',
              borderRadius: 8, color: '#B91C1C', fontSize: 13,
            }}
          >
            {submitError}
          </div>
        )}

        {/* Các trường form do admin cấu hình cho thủ tục */}
        {visibleFields.map(field => (
          <div key={field.field_id} className="reqform-col full-width">
            <div className="reqform-label-row">
              <span className="reqform-label">{field.field_name}</span>
              {isFieldRequired(field) && <span className="reqform-required"> *</span>}
            </div>
            {renderInput(field)}
          </div>
        ))}

        {/* Hồ sơ đính kèm theo từng cấu hình */}
        {(procedure.attachment_configs || []).map(config => {
          const files = filesByConfig[config.config_id] || [];
          const formats = parseFormats(config.allowed_formats);
          const inputId = `attachment-input-${config.config_id}`;
          return (
            <div key={config.config_id} className="reqform-col full-width">
              <div className="reqform-label-row">
                <span className="reqform-label">{config.item_name}</span>
                {config.is_required && <span className="reqform-required"> *</span>}
              </div>

              <input
                id={inputId}
                type="file"
                style={{ display: 'none' }}
                multiple
                accept={formats.map(f => `.${f}`).join(',') + (formats.includes('jpg') ? ',.jpeg' : '')}
                onChange={(e) => {
                  addFiles(config, e.target.files);
                  e.target.value = '';
                }}
              />

              <div
                className={`reqform-dropzone ${dragConfigId === config.config_id ? 'drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragConfigId(config.config_id); }}
                onDragLeave={() => setDragConfigId(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragConfigId(null);
                  addFiles(config, e.dataTransfer.files);
                }}
                onClick={() => document.getElementById(inputId)?.click()}
              >
                <div className="reqform-dropzone-text">Kéo thả tệp vào đây hoặc</div>
                <div className="reqform-dropzone-btn">
                  <span>Chọn tệp ↑</span>
                </div>
                <div className="reqform-dropzone-hint">
                  Chấp nhận {formats.join(', ').toUpperCase()} · Tối đa {config.max_size_mb || 5} MB
                </div>
              </div>

              {files.length > 0 && (
                <div className="reqform-uploaded-list">
                  {files.map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className="reqform-uploaded-item">
                      <span className="reqform-file-icon">📄</span>
                      <span className="reqform-file-name">{file.name}</span>
                      <span className="reqform-file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                      <button
                        type="button"
                        className="reqform-file-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(config.config_id, idx);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Buttons Footer */}
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
            disabled={submitting}
          >
            {submitting ? 'Đang gửi...' : (procedure.is_fee_required ? 'Gửi và thanh toán →' : 'Gửi yêu cầu →')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default RequestForm;
