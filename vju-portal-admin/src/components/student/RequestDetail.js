import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Modal from '../common/Modal';
import Button from '../common/Button';
import api from '../../services/api';
import {
  formatDate, formatDateTime, formatFileSize, statusStyle, FIELD_LABELS, TIMELINE_ACTION_LABELS,
} from '../../utils/format';
import './StudentPages.css';

const DONE_STATUS = 'Đã xử lý';

function RequestDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [request, setRequest] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [fieldLabels, setFieldLabels] = useState({});
  const [loadError, setLoadError] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3500);
  };

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
      if (diff <= 0) clearInterval(timer);
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
    if (!request) return;
    setPaymentLoading(true);
    setPaymentError('');
    api.payments.createForRequest(request.request_id)
      .then((res) => {
        setPaymentData(res.data);
        setPaymentLoading(false);
      })
      .catch((err) => {
        setPaymentError(err.message || 'Không thể làm mới mã thanh toán.');
        setPaymentLoading(false);
      });
  };

  const load = useCallback(async () => {
    try {
      const [detailRes, timelineRes] = await Promise.all([
        api.requests.getDetail(id),
        api.requests.getTimeline(id),
      ]);
      setRequest(detailRes.data);
      setTimeline(timelineRes.data || []);

      // Lấy tên hiển thị của các trường form theo cấu hình thủ tục
      api.procedures.getDetail(detailRes.data.type_id)
        .then((res) => {
          const labels = {};
          (res.data.form_fields || []).forEach(f => { labels[f.field_key] = f.field_name; });
          setFieldLabels(labels);
        })
        .catch(() => {});
    } catch (err) {
      setLoadError(err.message || 'Không tải được yêu cầu.');
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async () => {
    setBusy(true);
    try {
      const res = await api.requests.cancel(request.request_id);
      setShowCancelModal(false);
      showToast(res.message || 'Đã hủy yêu cầu.');
      await load();
    } catch (err) {
      setShowCancelModal(false);
      showToast(err.message, true);
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async (url, fileName) => {
    try {
      await api.attachments.download(url, fileName);
    } catch (err) {
      showToast(err.message, true);
    }
  };

  // Khởi tạo và kiểm tra thanh toán khi mở Modal
  useEffect(() => {
    if (!showPaymentModal || !request) return;

    let isMounted = true;
    setPaymentLoading(true);
    setPaymentError('');

    api.payments.createForRequest(request.request_id)
      .then((res) => {
        if (isMounted) {
          setPaymentData(res.data);
          setPaymentLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setPaymentError(err.message || 'Lỗi khi tạo link thanh toán.');
          setPaymentLoading(false);
        }
      });

    const intervalId = setInterval(async () => {
      try {
        const res = await api.payments.getStatus(request.request_id);
        const latest = res?.data?.latest_payment;
        if (latest?.status === 'completed' || res?.data?.request_status === 'Đã gửi') {
          clearInterval(intervalId);
          setShowPaymentModal(false);
          showToast('Thanh toán thành công! Hồ sơ đã được chuyển xử lý.');
          load();
        }
      } catch (err) {
        // ignore
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [showPaymentModal, request, load]);

  if (loadError) {
    return (
      <div className="req-detail-container">
        <div className="req-detail-top-bar">
          <h1 className="req-detail-title">Không tải được yêu cầu</h1>
          <button type="button" className="btn-back-to-requests" onClick={() => navigate('/student/dashboard')}>
            <span>← Yêu cầu của tôi</span>
          </button>
        </div>
        <div className="req-detail-card"><p style={{ color: '#B91C1C' }}>{loadError}</p></div>
      </div>
    );
  }

  if (!request) {
    return <div className="req-detail-container"><p style={{ color: '#68717D' }}>Đang tải yêu cầu...</p></div>;
  }

  const student = request.student || {};
  const result = request.result;
  const statusLabel = request.status === DONE_STATUS ? 'Hoàn thành' : request.status;
  const canCancel = request.internal_status === 'Chờ phân công';
  const needsSupplement = request.internal_status === 'Cần bổ sung';
  const canFeedback = request.status === DONE_STATUS;
  const isWaitingPayment = request.status === 'Chờ thanh toán' || request.internal_status === 'Chờ thanh toán';
  const formEntries = Object.entries(request.form_data || {}).filter(
    ([key, v]) => key !== 'review_data' && v !== '' && v !== null && v !== undefined && typeof v !== 'object'
  );

  const infoRows = [
    ['Tên sinh viên', student.full_name],
    ['Mã sinh viên', student.mssv],
    ['Mã yêu cầu', request.request_code],
    ['Tên thủ tục', request.type_name],
    ['Phòng ban xử lý', request.department_name],
    ...formEntries.map(([key, value]) => [fieldLabels[key] || FIELD_LABELS[key] || key, String(value)]),
    ['Ngày gửi', formatDateTime(request.created_at)],
    ['Hạn xử lý dự kiến', formatDate(request.sla_deadline)],
  ];

  return (
    <div className="req-detail-container">
      {toast && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 9999,
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: 12,
          paddingBottom: 12,
          background: 'white',
          boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.12)',
          overflow: 'hidden',
          borderRadius: 10,
          outline: toast.isError ? '1px #FEE2E2 solid' : '1px #DCFCE7 solid',
          outlineOffset: '-1px',
          justifyContent: 'flex-start',
          alignItems: 'center',
          gap: 8,
          display: 'inline-flex',
          maxWidth: 460,
          boxSizing: 'border-box',
          animation: 'globalToastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <div style={{
            width: 24,
            height: 24,
            background: toast.isError ? '#DC2626' : '#168039',
            overflow: 'hidden',
            borderRadius: 999,
            justifyContent: 'center',
            alignItems: 'center',
            display: 'flex',
            flexShrink: 0,
          }}>
            <div style={{ color: 'white', fontSize: 14, fontFamily: 'Inter, sans-serif', fontWeight: '600', wordWrap: 'break-word' }}>
              {toast.isError ? '✕' : '✓'}
            </div>
          </div>
          <div style={{ color: '#1F2937', fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: '500', wordWrap: 'break-word' }}>
            {toast.message}
          </div>
        </div>
      )}

      {/* Top Header Row */}
      <div className="req-detail-top-bar">
        <h1 className="req-detail-title">Yêu cầu {request.request_code}</h1>
        <button
          type="button"
          className="btn-back-to-requests"
          onClick={() => navigate('/student/dashboard')}
        >
          <span>← Yêu cầu của tôi</span>
        </button>
      </div>

      {/* Banner Chờ thanh toán */}
      {isWaitingPayment && (
        <div style={{
          background: '#FFF7ED', border: '1px solid #FDBA74', borderRadius: 8, padding: '16px 20px',
          marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12
        }}>
          <div>
            <div style={{ fontWeight: 700, color: '#C2410C', fontSize: 15, marginBottom: 4 }}>
              Đơn đang chờ thanh toán lệ phí
            </div>
            <div style={{ color: '#9A3412', fontSize: 13 }}>
              Vui lòng thanh toán trực tuyến qua PayOS (VietQR) để hồ sơ được chuyển tiếp cho cán bộ tiếp nhận và xử lý.
            </div>
          </div>
          <button
            type="button"
            className="btn-req-action-primary"
            style={{ background: '#AA2327', borderColor: '#AA2327', color: '#FFFFFF' }}
            onClick={() => setShowPaymentModal(true)}
          >
            <span>Thanh toán ngay →</span>
          </button>
        </div>
      )}

      {/* Main Card: Thông tin yêu cầu */}
      <div className="req-detail-card">
        <div className="req-detail-card-title">Thông tin yêu cầu</div>
        <div className="req-detail-divider" />

        {infoRows.map(([label, value]) => (
          <React.Fragment key={label}>
            <div className="req-detail-row">
              <div className="req-detail-label">{label}</div>
              <div className="req-detail-value">{value || '—'}</div>
            </div>
            <div className="req-detail-divider" />
          </React.Fragment>
        ))}

        <div className="req-detail-row">
          <div className="req-detail-label">Trạng thái</div>
          <div className="req-detail-value">
            <span style={statusStyle(request.status)}>{statusLabel}</span>
          </div>
        </div>
        <div className="req-detail-divider" />

        <div className="req-detail-row">
          <div className="req-detail-label">Người phụ trách</div>
          <div className="req-detail-value">{request.assigned_staff?.full_name || 'Chưa phân công'}</div>
        </div>
        <div className="req-detail-divider" />

        <div className="req-detail-row">
          <div className="req-detail-label">Tài liệu đã gửi</div>
          <div className="req-detail-value" style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
            {(request.attachments || []).length === 0 && <span>Không có tài liệu đính kèm</span>}
            {(request.attachments || []).map(att => (
              <button
                key={att.attachment_id}
                type="button"
                className="btn-view-document"
                onClick={() => handleDownload(att.download_url, att.file_name)}
                title={att.item_name || ''}
              >
                <span>
                  {att.is_supplement ? '[Bổ sung] ' : ''}{att.file_name} ({formatFileSize(att.file_size)}) ↓
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="req-detail-divider" />
      </div>

      {/* Kết quả */}
      {result && (
        <div className="req-detail-card" style={{ marginTop: 16 }}>
          <div className="req-detail-card-title">Kết quả</div>
          <div className="req-detail-divider" />
          <div className="req-detail-row">
            <div className="req-detail-label">Mã xác minh</div>
            <div className="req-detail-value">{result.verification_code}</div>
          </div>
          <div className="req-detail-divider" />
          <div className="req-detail-row">
            <div className="req-detail-label">Người duyệt</div>
            <div className="req-detail-value">{result.signed_by || '—'} · {formatDateTime(result.signed_at)}</div>
          </div>
          <div className="req-detail-divider" />
          {result.pickup_date && (
            <>
              <div className="req-detail-row">
                <div className="req-detail-label">Lịch nhận bản cứng</div>
                <div className="req-detail-value">
                  {formatDateTime(result.pickup_date)} tại {result.pickup_location}
                  {result.pickup_note ? ` (${result.pickup_note})` : ''}
                </div>
              </div>
              <div className="req-detail-divider" />
            </>
          )}
          {result.handover_confirmed_at && (
            <>
              <div className="req-detail-row">
                <div className="req-detail-label">Đã nhận bản cứng</div>
                <div className="req-detail-value">{formatDateTime(result.handover_confirmed_at)}</div>
              </div>
              <div className="req-detail-divider" />
            </>
          )}
        </div>
      )}

      {/* Lịch sử xử lý */}
      <div className="req-detail-card" style={{ marginTop: 16 }}>
        <div className="req-detail-card-title">Lịch sử xử lý</div>
        <div className="req-detail-divider" />
        {timeline.map((log, idx) => (
          <React.Fragment key={`${log.created_at}-${idx}`}>
            <div className="req-detail-row">
              <div className="req-detail-label">{formatDateTime(log.created_at)}</div>
              <div className="req-detail-value">
                <strong>{TIMELINE_ACTION_LABELS[log.action] || log.action}</strong> · {log.performed_by}
                {log.note ? <div style={{ fontSize: 13, color: '#68717D', marginTop: 2 }}>{log.note}</div> : null}
              </div>
            </div>
            <div className="req-detail-divider" />
          </React.Fragment>
        ))}
      </div>

      {/* Action Buttons Row: chỉ hiện thao tác hợp lệ với trạng thái hiện tại */}
      <div className="req-detail-actions">
        {isWaitingPayment && (
          <button
            type="button"
            className="btn-req-action-primary"
            style={{ background: '#AA2327', borderColor: '#AA2327', color: '#FFFFFF' }}
            onClick={() => setShowPaymentModal(true)}
          >
            <span>Thanh toán ngay →</span>
          </button>
        )}
        {canCancel && (
          <button type="button" className="btn-req-action-outline" onClick={() => setShowCancelModal(true)}>
            Hủy yêu cầu
          </button>
        )}
        {needsSupplement && (
          <button
            type="button"
            className="btn-req-action-outline"
            onClick={() => navigate(`/student/request/${request.request_id}/supplement`)}
          >
            Bổ sung hồ sơ
          </button>
        )}
        {canFeedback && (
          <button
            type="button"
            className="btn-req-action-outline"
            onClick={() => navigate(`/student/request/${request.request_id}/feedback`, {
              state: { requestCode: request.request_code, procedureName: request.type_name, department: request.department_name },
            })}
          >
            Đánh giá
          </button>
        )}
        {result && (
          <button
            type="button"
            className="btn-req-action-primary"
            onClick={() => navigate(`/student/request/${request.request_id}/receive`)}
          >
            <span>Nhận kết quả →</span>
          </button>
        )}
      </div>

      {/* Xác nhận hủy */}
      <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title="Hủy yêu cầu">
        <p style={{ fontSize: 14, color: '#202630', fontFamily: 'Inter, sans-serif' }}>
          Bạn chắc chắn muốn hủy yêu cầu <strong>{request.request_code}</strong>? Thao tác này không hoàn tác được.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <Button variant="secondary" onClick={() => setShowCancelModal(false)}>Đóng</Button>
          <Button variant="primary" onClick={handleCancel} disabled={busy}>
            {busy ? 'Đang hủy...' : 'Hủy yêu cầu'}
          </Button>
        </div>
      </Modal>

      {/* Modal Thanh toán PayOS */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Thanh toán lệ phí qua PayOS (VietQR)">
        {paymentLoading ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: '#68717D' }}>
            <p>Đang kết nối cổng PayOS và khởi tạo mã VietQR...</p>
          </div>
        ) : paymentError ? (
          <div style={{ textAlign: 'center', padding: '20px 10px' }}>
            <p style={{ color: '#B91C1C', marginBottom: 16 }}>{paymentError}</p>
            <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>Đóng</Button>
          </div>
        ) : paymentData ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto 10px', background: '#FFFFFF', padding: 8, borderRadius: 6, border: '1px solid #E5E7EB' }}>
              {paymentData.qr_code && (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentData.qr_code)}`}
                  alt="VietQR PayOS"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: isExpired ? 0.2 : 1 }}
                />
              )}
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

            <div style={{ textAlign: 'center', margin: '4px 0 12px 0', fontSize: 13, color: '#4B5563' }}>
              {isExpired ? (
                <span>Mã QR đã hết thời gian hiệu lực</span>
              ) : (
                <span>Mã QR có hiệu lực trong: <strong style={{ color: '#1F2937', fontWeight: 600 }}>{formatCountdown(remainingSeconds)}</strong></span>
              )}
            </div>

            <div style={{ width: '100%', textAlign: 'left', background: '#F9FAFB', padding: '12px 16px', borderRadius: 6, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              <div><span>Số tiền:</span> <strong>{Number(paymentData.amount).toLocaleString('vi-VN')} VNĐ</strong></div>
              <div><span>Ngân hàng:</span> <strong>{paymentData.bin === '970422' ? 'MB Bank (Quân đội)' : (paymentData.bin || 'Ngân hàng nội địa')}</strong></div>
              <div><span>Số tài khoản:</span> <strong>{paymentData.account_number}</strong></div>
              <div><span>Chủ tài khoản:</span> <strong>{paymentData.account_name}</strong></div>
              <div><span>Mã giao dịch / Nội dung:</span> <strong>{paymentData.txn_id}</strong></div>
            </div>

            <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>Đóng</Button>
              {paymentData.payment_url && (
                <a
                  href={paymentData.payment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-req-action-primary"
                  style={{ textDecoration: 'none', padding: '8px 16px' }}
                >
                  Mở cổng PayOS →
                </a>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export default RequestDetail;
