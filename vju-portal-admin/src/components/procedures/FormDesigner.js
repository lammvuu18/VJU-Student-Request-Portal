import React, { useState } from 'react';
import Button from '../common/Button';
import Toggle from '../common/Toggle';
import { formFields, fieldTypeOptions } from '../../data/mockData';
import './FormDesigner.css';

function FormDesigner() {
  const [fields, setFields] = useState(formFields);
  const [selectedId, setSelectedId] = useState(3); // "Mục đích sử dụng" selected
  const selectedField = fields.find((f) => f.id === selectedId);

  const [editName, setEditName] = useState(selectedField?.name || '');
  const [editKey, setEditKey] = useState(selectedField?.key || '');
  const [editType, setEditType] = useState(selectedField?.type || 'Text');
  const [editRequired, setEditRequired] = useState(selectedField?.required ?? true);
  const [editValues, setEditValues] = useState(selectedField?.values || []);
  const [editPlaceholder, setEditPlaceholder] = useState('');

  const handleSelectField = (field) => {
    setSelectedId(field.id);
    setEditName(field.name);
    setEditKey(field.key);
    setEditType(field.type);
    setEditRequired(field.required);
    setEditValues(field.values || []);
    setEditPlaceholder('');
  };

  const handleRemoveValue = (index) => {
    setEditValues((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddValue = () => {
    setEditValues((prev) => [...prev, '']);
  };

  const typeBadgeClass = (type) => {
    const map = {
      'Text': 'type-text',
      'Dropdown': 'type-dropdown',
      'Number': 'type-number',
      'Radio': 'type-radio',
      'Textarea': 'type-textarea',
      'File upload': 'type-file',
    };
    return map[type] || 'type-text';
  };

  return (
    <div className="form-designer">
      {/* Left: Field list */}
      <div className="fd-left">
        <h3 className="fd-section-title">Các trường trong biểu mẫu</h3>
        <div className="fd-field-list">
          {fields.map((field) => (
            <div
              key={field.id}
              className={`fd-field-card ${field.id === selectedId ? 'selected' : ''}`}
              onClick={() => handleSelectField(field)}
            >
              <div className="fd-field-drag">
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
                  <circle cx="2" cy="2" r="1.5" fill="#9CA3AF"/>
                  <circle cx="6" cy="2" r="1.5" fill="#9CA3AF"/>
                  <circle cx="2" cy="7" r="1.5" fill="#9CA3AF"/>
                  <circle cx="6" cy="7" r="1.5" fill="#9CA3AF"/>
                  <circle cx="2" cy="12" r="1.5" fill="#9CA3AF"/>
                  <circle cx="6" cy="12" r="1.5" fill="#9CA3AF"/>
                </svg>
              </div>
              <div className="fd-field-info">
                <span className="fd-field-name">{field.name}</span>
                <div className="fd-field-meta">
                  <span className={`fd-type-badge ${typeBadgeClass(field.type)}`}>{field.type}</span>
                  <span className={`fd-required-badge ${field.required ? 'required' : 'optional'}`}>
                    {field.required ? 'Bắt buộc' : 'Tùy chọn'}
                  </span>
                </div>
              </div>
              <div className="fd-field-actions">
                <button className="fd-icon-btn" title="Chỉnh sửa">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button className="fd-icon-btn" title="Xóa">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
        <button className="fd-add-field">+ Thêm trường mới</button>
      </div>

      {/* Right: Field config */}
      <div className="fd-right">
        <h3 className="fd-section-title">Cấu hình trường</h3>
        {selectedField && (
          <div className="fd-config-form">
            <div className="fd-config-field">
              <label>Tên trường</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>

            <div className="fd-config-field">
              <label>Khóa trường</label>
              <input type="text" value={editKey} className="input-muted" readOnly />
            </div>

            <div className="fd-config-field">
              <label>Loại trường</label>
              <select value={`${editType}`} onChange={(e) => setEditType(e.target.value)}>
                {fieldTypeOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
                <option value="Dropdown">Danh sách chọn (Dropdown)</option>
              </select>
            </div>

            {/* Value list for dropdown */}
            {(editType === 'Dropdown' || editType.includes('Dropdown')) && (
              <div className="fd-config-field">
                <label>Danh sách giá trị</label>
                <div className="fd-value-list">
                  {editValues.map((val, i) => (
                    <div key={i} className="fd-value-item">
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => {
                          const newVals = [...editValues];
                          newVals[i] = e.target.value;
                          setEditValues(newVals);
                        }}
                      />
                      <button className="fd-value-remove" onClick={() => handleRemoveValue(i)}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M4 4l6 6M10 4l-6 6" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <button className="fd-add-value" onClick={handleAddValue}>+ Thêm giá trị</button>
              </div>
            )}

            <div className="fd-config-toggle-row">
              <label>Bắt buộc</label>
              <Toggle checked={editRequired} onChange={setEditRequired} />
            </div>

            <div className="fd-config-field">
              <label>Placeholder</label>
              <input
                type="text"
                value={editPlaceholder}
                onChange={(e) => setEditPlaceholder(e.target.value)}
                placeholder={`Nhập mục đích xin cấp bằng điểm...`}
              />
            </div>

            <div className="fd-config-actions">
              <Button variant="secondary">Hủy</Button>
              <Button variant="primary">Lưu trường</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FormDesigner;
