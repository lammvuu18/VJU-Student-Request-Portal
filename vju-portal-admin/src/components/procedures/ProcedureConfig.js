import React, { useState } from 'react';
import Button from '../common/Button';
import Toggle from '../common/Toggle';
import { procedureConfig, departmentOptions, approvalLevelOptions, resultFormatOptions } from '../../data/mockData';
import './ProcedureConfig.css';

function ProcedureConfig() {
  const [config, setConfig] = useState(procedureConfig);

  const handleChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="procedure-config">
      <div className="config-card">
        <div className="config-card-header">
          <h2 className="config-card-title">{config.name}</h2>
          <Toggle
            checked={config.isActive}
            onChange={(val) => handleChange('isActive', val)}
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
            <label>Mô tả</label>
            <textarea
              rows={3}
              value={config.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Cấp bảng điểm chính quy cho sinh viên theo yêu cầu..."
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

          {/* SLA + Sub-SLA */}
          <div className="form-row">
            <div className="form-field">
              <label>SLA tổng (ngày)</label>
              <input
                type="number"
                value={config.slaTotal}
                onChange={(e) => handleChange('slaTotal', e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Sub-SLA</label>
              <input
                type="text"
                value={config.subSla}
                readOnly
                className="input-readonly"
              />
            </div>
          </div>

          {/* Hình thức + Template */}
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
              <label>Template phôi</label>
              <div className="template-field">
                <span className="template-name">{config.template}</span>
                <button className="template-change">Thay đổi</button>
              </div>
            </div>
          </div>

          {/* Trả phí + Lệ phí */}
          <div className="form-row">
            <div className="form-field">
              <label>Trả phí</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="hasFee"
                    checked={config.hasFee}
                    onChange={() => handleChange('hasFee', true)}
                  />
                  <span>Có</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="hasFee"
                    checked={!config.hasFee}
                    onChange={() => handleChange('hasFee', false)}
                  />
                  <span>Không</span>
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
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="form-actions">
            <Button variant="secondary">Hủy</Button>
            <Button variant="primary">Lưu thay đổi</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProcedureConfig;
