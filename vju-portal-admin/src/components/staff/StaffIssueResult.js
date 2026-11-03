import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { fetchFileUrl, getCurrentUser } from '../../services/api';
import { formatDateTime, STATUS_COLORS } from '../../utils/format';
import './StaffPages.css';

const APPROVED = 'Đã duyệt — Đang chuẩn bị kết quả';

const LOCATION_OPTIONS = [
  'Văn phòng Một cửa (P.102 Nhà A)',
  'Phòng Đào tạo (P.301 Nhà A)',
  'Phòng Công tác Sinh viên (P.205 Nhà B)',
];

// Ngày theo giờ máy (không dùng toISOString vì lệch ngày trước 7h sáng giờ Việt Nam)
const toIsoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const isoToVn = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

// "dd/mm/yyyy" hợp lệ thì trả "yyyy-mm-dd", ngược lại trả ''
const vnToIso = (text) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!m) return '';
  const [, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (d.getDate() !== Number(dd) || d.getMonth() !== Number(mm) - 1) return '';
  return `${yyyy}-${mm}-${dd}`;
};

// Tự chèn dấu "/" khi gõ: 10112026 -> 10/11/2026
const maskVnDate = (raw) => {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

/**
 * Ô ngày hiển thị dd/mm/yyyy (input type="date" của trình duyệt hiển thị theo ngôn ngữ máy, không ép được định dạng).
 * Gõ tay hoặc bấm biểu tượng lịch để mở bộ chọn ngày của trình duyệt. value/onChange dùng dạng yyyy-mm-dd.
 */
function VnDateInput({ value, min, onChange, style }) {
  const [text, setText] = useState(isoToVn(value));
  const pickerRef = useRef(null);

  useEffect(() => { setText(isoToVn(value)); }, [value]);

  const handleText = (e) => {
    const masked = maskVnDate(e.target.value);
    setText(masked);
    onChange(vnToIso(masked));
  };

  const openPicker = () => {
    const el = pickerRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') el.showPicker();
    else el.focus();
  };

  return (
    <div style={{ position: 'relative', marginTop: 6 }}>
      <input
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        style={{ ...style, paddingRight: 40 }}
        value={text}
        onChange={handleText}
      />
      <button
        type="button"
        onClick={openPicker}
        aria-label="Chọn ngày"
        style={{
          position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
          border: 'none', background: 'none', cursor: 'pointer', padding: 6, display: 'flex',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
      {/* Bộ chọn ngày gốc, ẩn đi và chỉ mở qua nút lịch */}
      <input
        ref={pickerRef}
        type="date"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: 'absolute', right: 0, bottom: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none', border: 0 }}
      />
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 12px', border: '1px solid #E2E5EA', borderRadius: 8,
  fontSize: 14, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
};

/**
 * Cấp kết quả bản cứng: hẹn lịch nhận (assign-pickup) rồi xác nhận đã bàn giao (confirm-handover).
 * Chỉ áp dụng cho đơn chọn "Bản cứng" hoặc "Cả hai" và đã được duyệt.
 */
function StaffIssueResult({ basePath = '/staff' }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const user = getCurrentUser() || {};

  const [request, setRequest] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const previewUrlRef = useRef('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const [pickupDay, setPickupDay] = useState('');
  const [timeFrom, setTimeFrom] = useState('08:00');
  const [timeTo, setTimeTo] = useState('11:30');
  const [location, setLocation] = useState(LOCATION_OPTIONS[0]);
  const [contactPerson, setContactPerson] = useState(user.full_name || '');

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4500);
  };

  const load = useCallback(async () => {
    try {
      const res = await api.requests.getDetail(id);
      setRequest(res.data);
    } catch (err) {
      setLoadError(err.message || 'Không tải được hồ sơ.');
    }
  }, [id]);

  useEffect(() => {
    load();
    return () => { if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current); };
  }, [load]);

  const result = request?.result;

  // Tải PDF kết quả để xem trước khi bàn giao
  useEffect(() => {
    if (!result?.pdf_download_url) return;
    fetchFileUrl(result.pdf_download_url)
      .then((url) => {
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = url;
        setPreviewUrl(url);
      })
      .catch(() => {});
  }, [result?.pdf_download_url]);

  const handleAssignPickup = async (e) => {
    e.preventDefault();
    if (!pickupDay) {
      showToast('Vui lòng nhập ngày nhận hợp lệ (dd/mm/yyyy).', true);
      return;
    }
    if (pickupDay < toIsoDate(new Date())) {
      showToast('Ngày nhận không được trước hôm nay.', true);
      return;
    }
    if (timeTo <= timeFrom) {
      showToast('Giờ kết thúc phải sau giờ bắt đầu.', true);
      return;
    }
    setBusy(true);
    try {
      // Backend lưu một thời điểm hẹn, khung giờ và người liên hệ đưa vào ghi chú
      const pickupDate = new Date(`${pickupDay}T${timeFrom}:00`).toISOString();
      const pickupNote = `Khung giờ ${timeFrom}–${timeTo}${contactPerson ? `. Liên hệ: ${contactPerson}` : ''}`;
      const res = await api.staff.assignPickup(request.request_id, {
        pickup_date: pickupDate,
        pickup_location: location,
        pickup_note: pickupNote,
      });
      showToast(res.message || 'Đã hẹn lịch nhận bản cứng.');
      await load();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmHandover = async () => {
    setBusy(true);
    try {
      const res = await api.staff.confirmHandover(request.request_id);
      showToast(res.message || 'Đã xác nhận bàn giao bản cứng.');
      await load();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setBusy(false);
    }
  };

  const backToDetail = () => navigate(`${basePath}/request/${id}`);

  if (loadError || !request) {
    return (
      <div className="staff-detail-container">
        <div className="staff-detail-topbar">
          <h1 className="staff-detail-title">Cấp kết quả cho sinh viên</h1>
          <button type="button" className="staff-detail-btn-back" onClick={backToDetail}>← Chi tiết hồ sơ</button>
        </div>
        <p style={{ color: loadError ? '#B91C1C' : '#6B7280' }}>{loadError || 'Đang tải hồ sơ...'}</p>
      </div>
    );
  }

  const student = request.student || {};
  const isApproved = request.internal_status === APPROVED;
  const today = toIsoDate(new Date());

  return (
    <div className="staff-detail-container">
      {toast && (
        <div className="depthead-toast-card" style={toast.isError ? { background: '#FEF2F2', borderColor: '#FCA5A5' } : undefined}>
          <div className="depthead-toast-icon-circle" style={toast.isError ? { background: '#B91C1C' } : undefined}>
            <span className="depthead-toast-icon-check">{toast.isError ? '!' : '✓'}</span>
          </div>
          <span className="depthead-toast-text" style={toast.isError ? { color: '#B91C1C' } : undefined}>{toast.message}</span>
        </div>
      )}

      <div className="staff-detail-topbar">
        <h1 className="staff-detail-title">Cấp kết quả cho sinh viên</h1>
        <button type="button" className="staff-detail-btn-back" onClick={backToDetail}>← Chi tiết hồ sơ</button>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Xem trước PDF kết quả */}
        <div className="staff-detail-card" style={{ flex: '1 1 520px', minWidth: 320 }}>
          <h2 className="staff-detail-section-title">Kết quả {result ? `(${result.verification_code})` : ''}</h2>
          <div style={{ height: 12 }} />
          {result ? (
            previewUrl ? (
              <iframe title="Kết quả" src={previewUrl} style={{ width: '100%', height: 640, border: '1px solid #E2E5EA', borderRadius: 8 }} />
            ) : (
              <p style={{ color: '#6B7280', fontSize: 14 }}>Đang tải PDF kết quả...</p>
            )
          ) : (
            <p style={{ color: '#6B7280', fontSize: 14 }}>Hồ sơ chưa có kết quả. Cần phê duyệt trước khi cấp kết quả.</p>
          )}
        </div>

        {/* Thông tin và lịch hẹn */}
        <div style={{ flex: '1 1 360px', minWidth: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="staff-detail-card">
            <h2 className="staff-detail-section-title">Thông tin hồ sơ</h2>
            <div style={{ height: 12 }} />
            <div className="staff-detail-divider" />
            {[
              ['Mã yêu cầu', request.request_code],
              ['Thủ tục', request.type_name],
              ['Sinh viên', `${student.full_name || ''} — ${student.mssv || ''}`],
              ['Hình thức nhận', request.form_data?.result_preference],
            ].map(([label, value]) => (
              <React.Fragment key={label}>
                <div className="staff-detail-row">
                  <div className="staff-detail-label">{label}</div>
                  <div className="staff-detail-value">{value || '—'}</div>
                </div>
                <div className="staff-detail-divider" />
              </React.Fragment>
            ))}
            <div className="staff-detail-row">
              <div className="staff-detail-label">Trạng thái</div>
              <div className="staff-detail-value" style={{ minWidth: 0 }}>
                {/* Chỉ tô màu chữ theo trạng thái, không dùng nền badge */}
                <span style={{ color: (STATUS_COLORS[request.internal_status] || {}).color || '#1F2937', fontWeight: 600 }}>
                  {request.internal_status}
                </span>
              </div>
            </div>
          </div>

          <div className="staff-detail-card">
            <h2 className="staff-detail-section-title">Lịch nhận bản cứng</h2>
            <div style={{ height: 12 }} />

            {result?.pickup_date && (
              <div style={{ fontSize: 14, color: '#1F2937', marginBottom: 12, lineHeight: 1.6 }}>
                Đã hẹn: <strong>{formatDateTime(result.pickup_date)}</strong> tại <strong>{result.pickup_location}</strong>
                {result.pickup_note ? <div style={{ color: '#6B7280' }}>{result.pickup_note}</div> : null}
                {result.handover_confirmed_at && (
                  <div style={{ color: '#047857', fontWeight: 600 }}>
                    Đã bàn giao lúc {formatDateTime(result.handover_confirmed_at)}
                  </div>
                )}
              </div>
            )}

            {isApproved && result && !result.handover_confirmed_at && (
              <form onSubmit={handleAssignPickup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  Địa điểm
                  <select style={{ ...inputStyle, marginTop: 6 }} value={location} onChange={(e) => setLocation(e.target.value)}>
                    {LOCATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </label>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  Ngày nhận
                  <VnDateInput value={pickupDay} min={today} onChange={setPickupDay} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <label style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    Từ
                    <input type="time" style={{ ...inputStyle, marginTop: 6 }} value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} required />
                  </label>
                  <label style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    Đến
                    <input type="time" style={{ ...inputStyle, marginTop: 6 }} value={timeTo} onChange={(e) => setTimeTo(e.target.value)} required />
                  </label>
                </div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  Người liên hệ
                  <input type="text" style={{ ...inputStyle, marginTop: 6 }} value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
                </label>
                <button type="submit" className="staff-btn-action-primary" disabled={busy}>
                  {result.pickup_date ? 'Cập nhật lịch hẹn' : 'Gửi lịch hẹn cho sinh viên'}
                </button>
              </form>
            )}

            {isApproved && result?.pickup_date && !result.handover_confirmed_at && (
              <button
                type="button"
                className="staff-btn-action-primary"
                style={{ marginTop: 12, width: '100%' }}
                disabled={busy}
                onClick={handleConfirmHandover}
              >
                Xác nhận đã bàn giao bản cứng →
              </button>
            )}

            {!isApproved && !result?.handover_confirmed_at && (
              <p style={{ fontSize: 14, color: '#6B7280' }}>Hồ sơ không ở trạng thái chuẩn bị kết quả.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StaffIssueResult;
