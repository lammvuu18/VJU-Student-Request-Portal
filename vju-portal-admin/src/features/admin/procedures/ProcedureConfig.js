import React, { useState } from 'react';
import Button from '../../../components/common/Button';
import Toggle from '../../../components/common/Toggle';
import { procedureConfig, departmentOptions, approvalLevelOptions, resultFormatOptions } from '../../../data/mockData';
import './ProcedureConfig.css';

function ProcedureConfig() {
  const [config, setConfig] = useState(procedureConfig);
  const [toastMessage, setToastMessage] = useState('');

  const handleChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setToastMessage('Đã lưu cấu hình thủ tục thành công!');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleReset = () => {
    setConfig(procedureConfig);
    setToastMessage('Đã khôi phục cài đặt mặc định');
    setTimeout(() => setToastMessage(''), 3000);
  };

  return (
    <div className="procedure-config">
      {toastMessage && (
        <div style={{
          backgroundColor: '#ECFDF5',
          color: '#059669',
          border: '1px solid #A7F3D0',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 16,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="config-card">
        <div className="config-card-header">
          <h2 className="config-card-title">{config.name}</h2>
          <Toggle
            checked={config.isActive}
            onChange={(val) => handleChange('isActive', val)}
            label="Trạng thái mở nhận hồ sơ:"
          />
        </div>

        <div className="config-form">
          {/* Tên thủ tục */}
          <div className="form-field form-field--full">
            <label>Tên thủ tục</label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </div>

          {/* Mô tả */}
          <div className="form-field form-field--full">
            <label>Mô tả thủ tục</label>
            <textarea
              rows={3}
              value={config.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Nhập mô tả quy trình tiếp nhận và hướng dẫn hồ sơ..."
            />
          </div>

          {/* Phòng ban + Cấp duyệt */}
          <div className="form-row">
            <div className="form-field">
              <label>Phòng ban</label>
              <select value={config.department} onChange={(e) => handleChange('department', e.target.value)}>
                {departmentOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Cấp duyệt</label>
              <select value={config.approvalLevel} onChange={(e) => handleChange('approvalLevel', e.target.value)}>
                {approvalLevelOptions.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* SLA Tổng + Phân rã */}
          <div className="form-row">
            <div className="form-field">
              <label>SLA Tổng (ngày)</label>
              <input
                type="number"
                value={config.slaTotal}
                onChange={(e) => handleChange('slaTotal', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="form-field">
              <label>Phân rã SLA</label>
              <input
                type="text"
                value={config.subSla}
                onChange={(e) => handleChange('subSla', e.target.value)}
                placeholder="CV: 2 ngày → TP: 2 ngày → HT: 1 ngày"
              />
            </div>
          </div>

          {/* Hình thức trả kết quả */}
          <div className="form-row">
            <div className="form-field">
              <label>Hình thức trả kết quả</label>
              <select value={config.resultFormat} onChange={(e) => handleChange('resultFormat', e.target.value)}>
                {resultFormatOptions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Mẫu quyết định / kết quả</label>
              <div className="template-field">
                <span className="template-name">{config.template}</span>
                <button
                  type="button"
                  className="template-change"
                  onClick={() => {
                    const newTpl = prompt('Nhập tên tệp mẫu mới:', config.template);
                    if (newTpl) handleChange('template', newTpl);
                  }}
                >
                  Thay đổi
                </button>
              </div>
            </div>
          </div>

          {/* Lệ phí */}
          <div className="form-row">
            <div className="form-field">
              <label>Lệ phí</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="hasFee"
                    checked={config.hasFee}
                    onChange={() => handleChange('hasFee', true)}
                  />
                  <span>Có thu phí</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="hasFee"
                    checked={!config.hasFee}
                    onChange={() => handleChange('hasFee', false)}
                  />
                  <span>Miễn phí</span>
                </label>
              </div>
            </div>
            {config.hasFee && (
              <div className="form-field">
                <label>Lệ phí (VND)</label>
                <input
                  type="text"
                  value={config.feeAmount}
                  onChange={(e) => handleChange('feeAmount', e.target.value)}
                  placeholder="Ví dụ: 30.000"
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="form-actions">
            <Button variant="secondary" onClick={handleReset}>Khôi phục</Button>
            <Button variant="primary" onClick={handleSave}>Lưu thay đổi</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProcedureConfig;
