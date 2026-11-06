import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { fetchFileUrl } from '../../services/api';
import { formatDate, formatDateTime } from '../../utils/format';
import './StudentPages.css';

function ReceiveResult() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [request, setRequest] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const previewUrlRef = useRef('');

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (!id) {
      setLoadError('Thiếu mã yêu cầu.');
      return undefined;
    }
    api.requests.getDetail(id)
      .then(res => setRequest(res.data))
      .catch(err => setLoadError(err.message || 'Không tải được yêu cầu.'));
    // Giải phóng bản xem trước khi rời trang
    return () => { if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current); };
  }, [id]);

  const result = request?.result;
  const student = request?.student || {};
  const preference = request?.form_data?.result_preference;
  const wantsHardCopy = preference === 'Bản cứng' || preference === 'Cả hai';
  const fileName = `${result?.verification_code || request?.request_code || 'ket-qua'}.pdf`;

  // Lần tải đầu tiên với hình thức "Bản điện tử" sẽ chuyển đơn sang "Đã xử lý" ở backend
  const handlePreview = async () => {
    setBusy(true);
    try {
      const url = await fetchFileUrl(result.pdf_download_url);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadPdf = async () => {
    setBusy(true);
    try {
      await api.results.download(result.pdf_download_url, fileName);
      showToast('Đã tải xuống file PDF kết quả.');
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setBusy(false);
    }
  };

  const handleBack = () => navigate(id ? `/student/request/${id}` : '/student/dashboard');

  if (loadError || (request && !result)) {
    return (
      <div className="receive-result-container">
        <div className="receive-result-header">
          <h1 className="receive-result-title">Nhận kết quả</h1>
          <button type="button" className="btn-back-request-detail" onClick={handleBack}>← Chi tiết yêu cầu</button>
        </div>
        <p style={{ color: loadError ? '#B91C1C' : '#68717D' }}>
          {loadError || 'Yêu cầu này chưa có kết quả.'}
        </p>
      </div>
    );
  }

  if (!request) {
    return <div className="receive-result-container"><p style={{ color: '#68717D' }}>Đang tải kết quả...</p></div>;
  }

  return (
    <div className="receive-result-container">
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
      <div className="receive-result-header">
        <h1 className="receive-result-title">Nhận kết quả</h1>
        <button type="button" className="btn-back-request-detail" onClick={handleBack}>
          ← Chi tiết yêu cầu
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div className="receive-result-columns">
        {/* Left Column: xem trước PDF thật do backend sinh */}
        <div className="doc-preview-card">
          {previewUrl ? (
            <iframe
              title="Xem trước kết quả"
              src={previewUrl}
              style={{ width: '100%', height: 760, border: 'none', borderRadius: 8, background: '#FFFFFF' }}
            />
          ) : (
            <div style={{
              height: 480, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 12, color: '#68717D', fontSize: 14,
            }}>
              <span>{request.type_name} — {student.full_name}</span>
              <button type="button" className="btn-download-pdf-red" onClick={handlePreview} disabled={busy}>
                {busy ? 'Đang tải...' : 'Xem trước PDF'}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Info Cards */}
        <div className="receive-result-info-col">
          <div className="receive-result-card">
            <h2 className="receive-result-card-title">Thông tin giấy tờ</h2>
            <div style={{ alignSelf: 'stretch', height: 14 }} />
            <div className="req-detail-divider" />

            {[
              ['Mã sinh viên', student.mssv],
              ['Tên thủ tục', request.type_name],
              ['Ngày cấp', formatDate(result.signed_at)],
              ['Mã xác minh', result.verification_code],
            ].map(([label, value]) => (
              <React.Fragment key={label}>
                <div className="receive-result-row">
                  <div className="receive-result-row-content">
                    <div className="receive-result-label">{label}</div>
                    <div className="receive-result-value">{value || '—'}</div>
                  </div>
                </div>
                <div className="req-detail-divider" />
              </React.Fragment>
            ))}

            <div className="receive-result-row">
              <div className="receive-result-row-content">
                <div className="receive-result-label">Tải kết quả</div>
              </div>
              <button type="button" className="btn-download-pdf-red" onClick={handleDownloadPdf} disabled={busy}>
                Tải PDF ↓
              </button>
            </div>

            <div style={{ alignSelf: 'stretch', height: 8 }} />

            <div className="receive-result-alert-box">
              <span className="receive-result-alert-icon">⚠</span>
              <div className="receive-result-alert-text">
                Bản điện tử lưu giữ 30 ngày. Sau đó chuyển cold storage.
              </div>
            </div>
          </div>

          {wantsHardCopy && (
            <div className="receive-result-card">
              <h2 className="receive-result-card-title">Thời gian và địa điểm nhận bản cứng</h2>
              <div style={{ alignSelf: 'stretch', height: 14 }} />
              <div className="req-detail-divider" />

              {result.pickup_date ? (
                [
                  ['Thời gian nhận', formatDateTime(result.pickup_date)],
                  ['Địa điểm', result.pickup_location],
                  ['Ghi chú', result.pickup_note],
                  ['Trạng thái', result.handover_confirmed_at
                    ? `Đã nhận lúc ${formatDateTime(result.handover_confirmed_at)}`
                    : 'Chưa nhận'],
                ].map(([label, value]) => (
                  <React.Fragment key={label}>
                    <div className="receive-result-row">
                      <div className="receive-result-row-content">
                        <div className="receive-result-label">{label}</div>
                        <div className="receive-result-value">{value || '—'}</div>
                      </div>
                    </div>
                    <div className="req-detail-divider" />
                  </React.Fragment>
                ))
              ) : (
                <div className="receive-result-row">
                  <div className="receive-result-row-content">
                    <div className="receive-result-value">Phòng ban chưa hẹn lịch nhận bản cứng.</div>
                  </div>
                </div>
              )}

              <div style={{ alignSelf: 'stretch', height: 8 }} />
              <div className="receive-result-alert-box">
                <span className="receive-result-alert-icon">⚠</span>
                <div className="receive-result-alert-text">
                  Bản cứng được lưu giữ 30 ngày kể từ ngày cấp.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReceiveResult;
