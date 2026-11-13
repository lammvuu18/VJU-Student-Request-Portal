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
    'academic_ms.gpa': user.gpa ?? '3.2',
    'academic_ms.grade': user.current_grade ?? '6.0',
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

  // Payment State (Step 2) — Tích hợp cổng thanh toán PayOS thật
  const [paymentData, setPaymentData] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [checkingManual, setCheckingManual] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(null);

  const unitFee = (procedure && procedure.is_fee_required && procedure.fee_amount) || 0;
  const formData = { quantity: 1 };
  const totalAmount = unitFee * formData.quantity;
  const formattedUnitPrice = unitFee === 0 ? 'Miễn phí' : `${unitFee.toLocaleString('vi-VN')} VNĐ`;
  const formattedTotalPrice = unitFee === 0 ? 'Miễn phí' : `${totalAmount.toLocaleString('vi-VN')} VNĐ`;
  const orderCode = createdRequest ? createdRequest.request_code : '';

  // Khi chuyển sang Step 2, tự động khởi tạo link thanh toán PayOS
  const targetRequestId = createdRequest?.request_id;
  useEffect(() => {
    let active = true;
    if (currentStep === 2 && targetRequestId && !paymentData) {
      setPaymentLoading(true);
      setPaymentError('');
      api.payments.createForRequest(targetRequestId)
        .then((res) => {
          if (active) {
            setPaymentData(res.data);
            setPaymentLoading(false);
          }
        })
        .catch((err) => {
          if (active) {
            setPaymentError(err.message || 'Không thể tạo link thanh toán PayOS.');
            setPaymentLoading(false);
          }
        });
    }
    return () => { active = false; };
  }, [currentStep, targetRequestId, paymentData]);

  // Đếm ngược thời gian hiệu lực của mã QR
  useEffect(() => {
    if (!paymentData?.expires_at) {
      setRemainingSeconds(null);
      return;
    }

    const calcRemaining = () => {
      const expTime = new Date(paymentData.expires_at).getTime();
      return Math.max(0, Math.floor((expTime - Date.now()) / 1000));
    };

    setRemainingSeconds(calcRemaining());

    const timer = setInterval(() => {
      const diff = calcRemaining();
      setRemainingSeconds(diff);
      if (diff <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [paymentData?.expires_at]);

  const isExpired = remainingSeconds !== null && remainingSeconds <= 0;

  const formatCountdown = (totalSec) => {
    if (totalSec === null || totalSec === undefined) return '--:--';
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleRefreshPayment = () => {
    if (!createdRequest) return;
    setPaymentLoading(true);
    setPaymentError('');
    api.payments.createForRequest(createdRequest.request_id)
      .then((res) => {
        setPaymentData(res.data);
        setPaymentLoading(false);
      })
      .catch((err) => {
        setPaymentError(err.message || 'Không thể làm mới mã thanh toán.');
        setPaymentLoading(false);
      });
  };

  // Polling tự động kiểm tra trạng thái thanh toán mỗi 2.5s (tạm dừng khi mã QR đã hết hạn)
  useEffect(() => {
    if (currentStep !== 2 || !createdRequest || paymentSuccess || isExpired) return;

    let isSubscribed = true;
    const intervalId = setInterval(async () => {
      try {
        const res = await api.payments.getStatus(createdRequest.request_id);
        const latest = res?.data?.latest_payment;
        const reqStatus = res?.data?.request_status;

        if (latest?.status === 'completed' || reqStatus === 'Đã gửi') {
          if (isSubscribed) {
            setPaymentSuccess(true);
            setTimeout(() => {
              navigate('/student/request/success', {
                state: {
                  procedure,
                  request: { ...createdRequest, status: 'Đã gửi', internal_status: 'Chờ phân công' },
                  message: 'Thanh toán lệ phí thành công! Hồ sơ đã được chuyển cán bộ thẩm định.',
                },
              });
            }, 1200);
          }
        }
      } catch (err) {
        // Polling âm thầm
      }
    }, 2500);

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
    };
  }, [currentStep, createdRequest, paymentSuccess, navigate, procedure]);

  // Kiểm tra trạng thái chủ động khi người dùng bấm nút
  const handleCheckPaymentManual = async () => {
    if (!createdRequest) return;
    setCheckingManual(true);
    try {
      const res = await api.payments.getStatus(createdRequest.request_id);
      const latest = res?.data?.latest_payment;
      const reqStatus = res?.data?.request_status;

      if (latest?.status === 'completed' || reqStatus === 'Đã gửi') {
        setPaymentSuccess(true);
        setTimeout(() => {
          navigate('/student/request/success', {
            state: {
              procedure,
              request: { ...createdRequest, status: 'Đã gửi', internal_status: 'Chờ phân công' },
              message: 'Thanh toán lệ phí thành công! Hồ sơ đã được chuyển cán bộ thẩm định.',
            },
          });
        }, 1000);
      } else {
        alert('Hệ thống chưa nhận được tiền từ ngân hàng. Vui lòng kiểm tra lại sau giây lát.');
      }
    } catch (err) {
      alert(err.message || 'Lỗi khi kiểm tra thanh toán.');
    } finally {
      setCheckingManual(false);
    }
  };

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
        // Khởi tạo link thanh toán PayOS ngay lập tức
        setPaymentLoading(true);
        setPaymentError('');
        api.payments.createForRequest(res.data.request_id)
          .then((payRes) => {
            setPaymentData(payRes.data);
            setPaymentLoading(false);
          })
          .catch((payErr) => {
            setPaymentError(payErr.message || 'Không thể tạo link thanh toán PayOS.');
            setPaymentLoading(false);
          });
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

          {/* Right Column: Phương thức thanh toán PayOS & VietQR Thật */}
          <div className="reqpayment-form-card">
            {paymentSuccess ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', background: '#DCFCE7',
                  color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, margin: '0 auto 16px', fontWeight: 'bold'
                }}>
                  ✓
                </div>
                <h3 style={{ color: '#15803D', margin: '0 0 8px 0', fontSize: 18, fontWeight: 700 }}>
                  Thanh toán thành công!
                </h3>
                <p style={{ color: '#4B5563', fontSize: 14, margin: 0 }}>
                  Đang chuyển tiếp về trang kết quả nộp hồ sơ...
                </p>
              </div>
            ) : paymentLoading ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', color: '#68717D' }}>
                <style>{`@keyframes spinPay { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                <div style={{
                  width: 40, height: 40, border: '3.5px solid #E5E7EB',
                  borderTopColor: '#AA2327', borderRadius: '50%',
                  animation: 'spinPay 0.9s linear infinite', margin: '0 auto 16px'
                }} />
                <p style={{ fontSize: 16, fontWeight: 600, color: '#1F2937', margin: '0 0 6px 0' }}>
                  Đang khởi tạo mã VietQR từ cổng PayOS...
                </p>
                <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
                  Hệ thống đang kết nối mạng Napas để sinh tài khoản thanh toán tự động (thường mất 2-3 giây)
                </p>
              </div>
            ) : paymentError ? (
              <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                <p style={{ color: '#B91C1C', marginBottom: 16 }}>{paymentError}</p>
                <button
                  type="button"
                  className="reqpayment-btn-submit"
                  onClick={() => {
                    setPaymentLoading(true);
                    setPaymentError('');
                    api.payments.createForRequest(createdRequest.request_id)
                      .then((res) => { setPaymentData(res.data); setPaymentLoading(false); })
                      .catch((err) => { setPaymentError(err.message || 'Lỗi khởi tạo PayOS'); setPaymentLoading(false); });
                  }}
                >
                  Thử lại →
                </button>
              </div>
            ) : (
              <div className="reqpayment-transfer-box">
                {/* VietQR Code Box */}
                <div className="reqpayment-qr-wrap" style={{ position: 'relative', width: 190, margin: '0 auto' }}>
                  {paymentData?.qr_code ? (
                    <div style={{ position: 'relative', width: 190, height: 190 }}>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(paymentData.qr_code)}`}
                        alt="VietQR PayOS"
                        className="reqpayment-qr-img"
                        style={{
                          width: 190,
                          height: 190,
                          borderRadius: 6,
                          border: '1px solid #E5E7EB',
                          opacity: isExpired ? 0.2 : 1,
                          display: 'block',
                        }}
                      />
                      {isExpired && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(255, 255, 255, 0.94)',
                          borderRadius: 6,
                          padding: 10,
                          textAlign: 'center',
                        }}>
                          <p style={{ margin: '0 0 8px 0', fontSize: 13, color: '#374151', fontWeight: 500 }}>
                            Mã QR đã hết hạn
                          </p>
                          <button
                            type="button"
                            onClick={handleRefreshPayment}
                            disabled={paymentLoading}
                            style={{
                              fontSize: 12,
                              padding: '6px 12px',
                              borderRadius: 4,
                              border: '1px solid #D1D5DB',
                              background: '#FFFFFF',
                              color: '#374151',
                              cursor: 'pointer',
                            }}
                          >
                            {paymentLoading ? 'Đang tạo...' : 'Làm mới mã QR'}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ width: 190, height: 190, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: 13, borderRadius: 6 }}>
                      Đang nạp QR...
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'center', margin: '10px 0 14px 0', fontSize: 13, color: '#4B5563' }}>
                  {isExpired ? (
                    <span>Mã QR đã hết thời gian hiệu lực</span>
                  ) : (
                    <span>Mã QR có hiệu lực trong: <strong style={{ color: '#1F2937', fontWeight: 600 }}>{formatCountdown(remainingSeconds)}</strong></span>
                  )}
                </div>

                {/* Transfer Info */}
                <div className="reqpayment-transfer-info">
                  <div className="reqpayment-transfer-row">
                    <span>Số tiền:</span> <strong>{formattedTotalPrice}</strong>
                  </div>
                  <div className="reqpayment-transfer-row">
                    <span>Ngân hàng:</span> <strong>{paymentData?.bin === '970422' ? 'MB Bank (Quân đội)' : (paymentData?.bin || 'Ngân hàng nội địa')}</strong>
                  </div>
                  <div className="reqpayment-transfer-row">
                    <span>Số tài khoản:</span> <strong>{paymentData?.account_number || '---'}</strong>
                  </div>
                  <div className="reqpayment-transfer-row">
                    <span>Chủ tài khoản:</span> <strong>{paymentData?.account_name || 'VJU ONESTOP'}</strong>
                  </div>
                  <div className="reqpayment-transfer-row">
                    <span>Mã giao dịch / Nội dung:</span> <strong>{paymentData?.txn_id || orderCode}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16, width: '100%' }}>
                  {paymentData?.payment_url && (
                    <a
                      href={paymentData.payment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="reqpayment-btn-submit"
                      style={{ textAlign: 'center', textDecoration: 'none', background: '#AA2327', color: '#FFFFFF' }}
                    >
                      Mở cổng thanh toán PayOS →
                    </a>
                  )}

                  <button
                    type="button"
                    className="reqpayment-btn-submit"
                    style={{ background: '#FFFFFF', color: '#374151', border: '1px solid #D1D5DB' }}
                    onClick={handleCheckPaymentManual}
                    disabled={checkingManual}
                  >
                    {checkingManual ? 'Đang kiểm tra...' : 'Kiểm tra trạng thái thanh toán'}
                  </button>
                </div>
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
        {procedure.type_id === 2 && (
          <div className="reqform-col full-width">
            <div className="reqform-label-row">
              <span className="reqform-label">Hình thức nhận kết quả</span>
            </div>
            <input
              type="text"
              className="reqform-input"
              value="Bản cứng (Bắt buộc — Nhận trực tiếp bản gốc có dấu đỏ tại Phòng CTSV)"
              readOnly
              disabled
            />
          </div>
        )}
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
