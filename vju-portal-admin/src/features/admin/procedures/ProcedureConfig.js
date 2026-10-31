import React, { useState, useRef } from 'react';
import {
  procedureConfig,
  departmentOptions,
  approvalLevelOptions,
  resultFormatOptions,
} from '../../../data/mockData';
import './ProcedureConfig.css';

function ProcedureConfig() {
  const [config, setConfig] = useState({
    name: 'Cấp bảng điểm',
    isActive: true,
    description: 'Cấp bảng điểm chính quy cho sinh viên theo yêu cầu...',
    department: 'Phòng Đào tạo',
    approvalLevel: '3 cấp (CV → TP → HT)',
    slaTotal: 5,
    subSla: 'CV: 2 ngày → TP: 2 ngày → HT: 1 ngày',
    resultFormat: 'PDF ký số + Bản cứng',
    template: 'bang_diem_v2.1.docx',
    hasFee: true,
    feeAmount: '30.000',
  });

  const [toastMessage, setToastMessage] = useState('');
  const fileInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    showToast('Đã lưu cấu hình thủ tục thành công!');
  };

  const handleReset = () => {
    setConfig({
      name: procedureConfig.name || 'Cấp bảng điểm',
      isActive: true,
      description: 'Cấp bảng điểm chính quy cho sinh viên theo yêu cầu...',
      department: 'Phòng Đào tạo',
      approvalLevel: '3 cấp (CV → TP → HT)',
      slaTotal: 5,
      subSla: 'CV: 2 ngày → TP: 2 ngày → HT: 1 ngày',
      resultFormat: 'PDF ký số + Bản cứng',
      template: 'bang_diem_v2.1.docx',
      hasFee: true,
      feeAmount: '30.000',
    });
    showToast('Đã khôi phục cài đặt mặc định');
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      handleChange('template', file.name);
      showToast(`Đã chọn template mới: ${file.name}`);
    }
  };

  return (
    <div className="procedure-config-container">
      {toastMessage && (
        <div className="pc-toast-banner">
          <span className="pc-toast-icon">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Configuration Card */}
      <div className="pc-card">
        {/* Header row: Procedure Name & Active Status Switch */}
        <div className="pc-header-row">
          <div className="pc-title">{config.name}</div>
          <div className="pc-status-group">
            <span
              className="pc-status-label"
              style={{ color: config.isActive ? '#168039' : '#6B7280' }}
            >
              {config.isActive ? 'Hoạt động' : 'Tạm dừng'}
            </span>
            <div
              className={`pc-toggle-pill ${config.isActive ? 'pc-toggle-on' : 'pc-toggle-off'}`}
              onClick={() => handleChange('isActive', !config.isActive)}
              role="button"
              tabIndex={0}
              aria-label="Chuyển trạng thái hoạt động"
            >
              <div className="pc-toggle-knob" />
            </div>
          </div>
        </div>

        {/* Field 1: Tên thủ tục */}
        <div className="pc-field-block">
          <label className="pc-label">Tên thủ tục</label>
          <div className="pc-input-box">
            <input
              type="text"
              className="pc-input"
              value={config.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Nhập tên thủ tục..."
            />
          </div>
        </div>

        {/* Field 2: Mô tả */}
        <div className="pc-field-block">
          <label className="pc-label">Mô tả</label>
          <div className="pc-textarea-box">
            <textarea
              className="pc-textarea"
              rows={3}
              value={config.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Cấp bảng điểm chính quy cho sinh viên theo yêu cầu..."
            />
          </div>
        </div>

        {/* Row 3: Phòng ban & Cấp duyệt */}
        <div className="pc-two-col-row">
          <div className="pc-col">
            <label className="pc-label">Phòng ban</label>
            <div className="pc-select-box">
              <select
                className="pc-select"
                value={config.department}
                onChange={(e) => handleChange('department', e.target.value)}
              >
                {departmentOptions.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <span className="pc-select-arrow">▾</span>
            </div>
          </div>

          <div className="pc-col">
            <label className="pc-label">Cấp duyệt</label>
            <div className="pc-select-box">
              <select
                className="pc-select"
                value={config.approvalLevel}
                onChange={(e) => handleChange('approvalLevel', e.target.value)}
              >
                {approvalLevelOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
                <option value="3 cấp (CV → TP → HT)">3 cấp (CV → TP → HT)</option>
                <option value="2 cấp (CV → TP)">2 cấp (CV → TP)</option>
                <option value="1 cấp (CV duyệt)">1 cấp (CV duyệt)</option>
              </select>
              <span className="pc-select-arrow">▾</span>
            </div>
          </div>
        </div>

        {/* Row 4: SLA tổng & Sub-SLA */}
        <div className="pc-two-col-row">
          <div className="pc-col">
            <label className="pc-label">SLA tổng (ngày)</label>
            <div className="pc-input-box">
              <input
                type="number"
                className="pc-input"
                value={config.slaTotal}
                onChange={(e) =>
                  handleChange('slaTotal', parseInt(e.target.value, 10) || 0)
                }
              />
            </div>
          </div>

          <div className="pc-col">
            <label className="pc-label">Sub-SLA</label>
            <div className="pc-input-box">
              <input
                type="text"
                className="pc-input"
                value={config.subSla}
                onChange={(e) => handleChange('subSla', e.target.value)}
                placeholder="CV: 2 ngày → TP: 2 ngày → HT: 1 ngày"
              />
            </div>
          </div>
        </div>

        {/* Row 5: Hình thức trả kết quả & Template phôi */}
        <div className="pc-two-col-row">
          <div className="pc-col">
            <label className="pc-label">Hình thức trả kết quả</label>
            <div className="pc-select-box">
              <select
                className="pc-select"
                value={config.resultFormat}
                onChange={(e) => handleChange('resultFormat', e.target.value)}
              >
                {resultFormatOptions.map((res) => (
                  <option key={res} value={res}>
                    {res}
                  </option>
                ))}
                <option value="PDF ký số + Bản cứng">PDF ký số + Bản cứng</option>
                <option value="Bản cứng tại trường">Bản cứng tại trường</option>
                <option value="PDF ký số qua email/portal">PDF ký số qua email/portal</option>
              </select>
              <span className="pc-select-arrow">▾</span>
            </div>
          </div>

          <div className="pc-col">
            <label className="pc-label">Template phôi</label>
            <div className="pc-template-box">
              <span className="pc-template-name">{config.template}</span>
              <button
                type="button"
                className="pc-template-action"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                Thay đổi
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".docx,.doc,.pdf"
                onChange={handleFileChange}
              />
            </div>
          </div>
        </div>

        {/* Row 6: Trả phí & Lệ phí */}
        <div className="pc-two-col-row">
          <div className="pc-col">
            <label className="pc-label">Trả phí</label>
            <div className="pc-radio-group">
              {/* Option Có */}
              <div
                className="pc-radio-item"
                onClick={() => handleChange('hasFee', true)}
                role="button"
                tabIndex={0}
              >
                <div
                  className={`pc-custom-radio ${
                    config.hasFee ? 'pc-custom-radio--selected' : 'pc-custom-radio--unselected'
                  }`}
                >
                  {config.hasFee && <div className="pc-radio-dot" />}
                </div>
                <span
                  className="pc-radio-text"
                  style={{
                    color: config.hasFee ? '#1F2937' : '#6B7280',
                    fontWeight: config.hasFee ? 500 : 400,
                  }}
                >
                  Có
                </span>
              </div>

              {/* Option Không */}
              <div
                className="pc-radio-item"
                onClick={() => handleChange('hasFee', false)}
                role="button"
                tabIndex={0}
              >
                <div
                  className={`pc-custom-radio ${
                    !config.hasFee ? 'pc-custom-radio--selected' : 'pc-custom-radio--unselected'
                  }`}
                >
                  {!config.hasFee && <div className="pc-radio-dot" />}
                </div>
                <span
                  className="pc-radio-text"
                  style={{
                    color: !config.hasFee ? '#1F2937' : '#6B7280',
                    fontWeight: !config.hasFee ? 500 : 400,
                  }}
                >
                  Không
                </span>
              </div>
            </div>
          </div>

          <div className="pc-col">
            <label className="pc-label">Lệ phí (VNĐ)</label>
            <div className="pc-input-box">
              <input
                type="text"
                className="pc-input"
                disabled={!config.hasFee}
                value={config.hasFee ? config.feeAmount : '0'}
                onChange={(e) => handleChange('feeAmount', e.target.value)}
                placeholder="30.000"
              />
            </div>
          </div>
        </div>

        {/* Spacers & Divider */}
        <div style={{ height: 8, width: '100%' }} />
        <div className="pc-divider" />
        <div style={{ height: 4, width: '100%' }} />

        {/* Bottom Actions */}
        <div className="pc-actions-row">
          <button type="button" className="pc-btn-cancel" onClick={handleReset}>
            Hủy
          </button>
          <button type="button" className="pc-btn-save" onClick={handleSave}>
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProcedureConfig;