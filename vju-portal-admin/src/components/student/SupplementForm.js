import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { formatDateTime } from '../../utils/format';
import './StudentPages.css';

const parseFormats = (allowed) =>
  (allowed || 'PDF,JPG,PNG').split(',').map(f => f.trim().toLowerCase()).filter(Boolean);

function SupplementForm() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [request, setRequest] = useState(null);
  const [configs, setConfigs] = useState([]);
  const [supplementLog, setSupplementLog] = useState(null);
  const [loadError, setLoadError] = useState('');
  // { [config_id]: File[] }
  const [filesByConfig, setFilesByConfig] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoadError('Thiếu mã yêu cầu.');
      return;
    }
    const load = async () => {
      try {
        const [detailRes, timelineRes] = await Promise.all([
          api.requests.getDetail(id),
          api.requests.getTimeline(id),
        ]);
        const detail = detailRes.data;
        setRequest(detail);
        // Lần yêu cầu bổ sung gần nhất của chuyên viên
        const logs = (timelineRes.data || []).filter(l => l.action === 'request_supplement');
        setSupplementLog(logs[logs.length - 1] || null);
        const procRes = await api.procedures.getDetail(detail.type_id);
        setConfigs(procRes.data.attachment_configs || []);
      } catch (err) {
        setLoadError(err.message || 'Không tải được yêu cầu.');
      }
    };
    load();
  }, [id]);

  const addFiles = (config, fileList) => {
    setError('');
    const formats = parseFormats(config.allowed_formats);
    const maxBytes = (config.max_size_mb || 5) * 1024 * 1024;
    const accepted = [];
    for (const file of Array.from(fileList || [])) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!formats.includes(ext === 'jpeg' ? 'jpg' : ext)) {
        setError(`"${file.name}": chỉ chấp nhận ${formats.join(', ').toUpperCase()}.`);
        continue;
      }
      if (file.size > maxBytes) {
        setError(`"${file.name}" vượt quá ${config.max_size_mb || 5} MB.`);
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length > 0) {
      setFilesByConfig(prev => ({ ...prev, [config.config_id]: [...(prev[config.config_id] || []), ...accepted] }));
    }
  };

  const removeFile = (configId, index) => {
    setFilesByConfig(prev => ({ ...prev, [configId]: (prev[configId] || []).filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const attachments = [];
    Object.entries(filesByConfig).forEach(([configId, files]) => {
      files.forEach(file => attachments.push({ config_id: configId, file }));
    });
    if (attachments.length === 0) {
      setError('Vui lòng đính kèm ít nhất một tài liệu bổ sung.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await api.requests.supplement(request.request_id, attachments);
      navigate(`/student/request/${request.request_id}/supplement/success`, {
        state: {
          requestId: request.request_id,
          requestCode: request.request_code,
          procedureName: request.type_name,
          submissionDate: formatDateTime(new Date().toISOString()),
          status: res.data?.status || 'Đang xử lý',
        },
      });
    } catch (err) {
      setError(err.message || 'Nộp bổ sung thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const backToDetail = () => navigate(id ? `/student/request/${id}` : '/student/dashboard');

  if (loadError || !request) {
    return (
      <div className="supplement-page-container">
        <div className="supplement-top-bar">
          <h1 className="supplement-title">Bổ sung hồ sơ</h1>
          <button type="button" className="btn-back-to-detail" onClick={backToDetail}>
            <span>← Chi tiết yêu cầu</span>
          </button>
        </div>
        <p style={{ color: loadError ? '#B91C1C' : '#68717D' }}>{loadError || 'Đang tải yêu cầu...'}</p>
      </div>
    );
  }

  const isWaitingSupplement = request.internal_status === 'Cần bổ sung';

  return (
    <div className="supplement-page-container">
      {/* Title Bar */}
      <div className="supplement-top-bar">
        <h1 className="supplement-title">Bổ sung hồ sơ {request.request_code}</h1>
        <button type="button" className="btn-back-to-detail" onClick={backToDetail}>
          <span>← Chi tiết yêu cầu</span>
        </button>
      </div>

      <form className="supplement-card" onSubmit={handleSubmit}>
        {/* Nội dung chuyên viên yêu cầu bổ sung */}
        <div className="supplement-form-col" style={{ width: '100%' }}>
          <label className="supplement-field-label">
            <span>Nội dung cần bổ sung</span>
          </label>
          <div style={{
            padding: '12px 14px', background: '#FFF7ED', border: '1px solid #FDBA74',
            borderRadius: 8, fontSize: 14, color: '#7C2D12', lineHeight: 1.5,
          }}>
            {supplementLog?.note || 'Chuyên viên chưa ghi chú nội dung cụ thể.'}
            {supplementLog && (
              <div style={{ fontSize: 12, color: '#9A3412', marginTop: 6 }}>
                {supplementLog.performed_by} · {formatDateTime(supplementLog.created_at)}
              </div>
            )}
          </div>
        </div>

        {!isWaitingSupplement && (
          <div style={{ fontSize: 14, color: '#B91C1C' }}>
            Yêu cầu không ở trạng thái cần bổ sung (hiện tại: {request.internal_status}).
          </div>
        )}

        {error && (
          <div role="alert" style={{
            padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5',
            borderRadius: 8, color: '#B91C1C', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Tải tài liệu bổ sung theo từng loại giấy tờ của thủ tục */}
        {configs.length === 0 && (
          <div style={{ fontSize: 14, color: '#68717D' }}>
            Thủ tục này không có cấu hình tài liệu đính kèm nên không thể nộp bổ sung trực tuyến.
            Vui lòng liên hệ {request.department_name}.
          </div>
        )}
        {configs.map(config => {
          const files = filesByConfig[config.config_id] || [];
          const formats = parseFormats(config.allowed_formats);
          const inputId = `supplement-input-${config.config_id}`;
          return (
            <div key={config.config_id} className="supplement-form-col" style={{ width: '100%' }}>
              <label className="supplement-field-label">
                <span>{config.item_name}</span>
              </label>
              <input
                id={inputId}
                type="file"
                multiple
                style={{ display: 'none' }}
                accept={formats.map(f => `.${f}`).join(',') + (formats.includes('jpg') ? ',.jpeg' : '')}
                onChange={(e) => {
                  addFiles(config, e.target.files);
                  e.target.value = '';
                }}
              />
              <div className="supplement-upload-zone">
                {files.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, background: '#ECFDF5',
                      border: '1px solid #10B981', padding: '8px 14px', borderRadius: 8, marginBottom: 8,
                    }}
                  >
                    <span style={{ color: '#059669', fontSize: 16 }}>✓</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#065F46' }}>
                      {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                    <button
                      type="button"
                      style={{ marginLeft: 12, background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
                      onClick={() => removeFile(config.config_id, idx)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className="supplement-upload-title">Kéo thả tệp vào đây hoặc</div>
                <button
                  type="button"
                  className="btn-upload-file"
                  onClick={() => document.getElementById(inputId)?.click()}
                >
                  <span>Chọn tệp ↑</span>
                </button>
                <div className="supplement-upload-subtext">
                  Chấp nhận {formats.join(', ').toUpperCase()} · Tối đa {config.max_size_mb || 5} MB
                </div>
              </div>
            </div>
          );
        })}

        {/* Bottom Actions */}
        <div className="supplement-bottom-actions">
          <button type="button" className="btn-supplement-back" onClick={backToDetail}>
            ← Quay lại
          </button>
          <button
            type="submit"
            className="btn-supplement-submit"
            disabled={submitting || !isWaitingSupplement || configs.length === 0}
          >
            <span>{submitting ? 'Đang gửi...' : 'Nộp bổ sung →'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default SupplementForm;
