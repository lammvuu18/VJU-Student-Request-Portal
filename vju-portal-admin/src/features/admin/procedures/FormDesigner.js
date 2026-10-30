import React, { useState } from 'react';
import Button from '../../../components/common/Button';
import Toggle from '../../../components/common/Toggle';
import { formFields, fieldTypeOptions } from '../../../data/mockData';
import './FormDesigner.css';

function FormDesigner() {
  const [fields, setFields] = useState(formFields);
  const [selectedId, setSelectedId] = useState(fields[0]?.id || 1);
  const selectedField = fields.find((f) => f.id === selectedId) || fields[0];

  const [editName, setEditName] = useState(selectedField?.name || '');
  const [editKey, setEditKey] = useState(selectedField?.key || '');
  const [editType, setEditType] = useState(selectedField?.type || 'Text');
  const [editRequired, setEditRequired] = useState(selectedField?.required ?? true);
  const [editValues, setEditValues] = useState(selectedField?.values || ['Lựa chọn 1', 'Lựa chọn 2']);
  const [editPlaceholder, setEditPlaceholder] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleSelectField = (field) => {
    setSelectedId(field.id);
    setEditName(field.name);
    setEditKey(field.key);
    setEditType(field.type);
    setEditRequired(field.required);
    setEditValues(field.values || ['Lựa chọn 1', 'Lựa chọn 2']);
    setEditPlaceholder(field.placeholder || '');
  };

  const handleAddField = () => {
    const newId = Date.now();
    const newField = {
      id: newId,
      name: 'Trường thông tin mới',
      key: `field_${newId.toString().slice(-4)}`,
      type: 'Text',
      required: false,
      placeholder: 'Nhập thông tin...',
      values: [],
    };
    setFields([...fields, newField]);
    handleSelectField(newField);
    showToast('Đã thêm một trường mới vào biểu mẫu!');
  };

  const handleDeleteField = (e, fieldId) => {
    e.stopPropagation();
    if (fields.length <= 1) {
      alert('Biểu mẫu phải có ít nhất 1 trường dữ liệu!');
      return;
    }
    const remaining = fields.filter((f) => f.id !== fieldId);
    setFields(remaining);
    if (selectedId === fieldId) {
      handleSelectField(remaining[0]);
    }
    showToast('Đã xóa trường khỏi biểu mẫu!');
  };

  const handleSaveField = () => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id === selectedId) {
          return {
            ...f,
            name: editName,
            key: editKey,
            type: editType.includes('Dropdown') ? 'Dropdown' : editType.includes('Radio') ? 'Radio' : editType.includes('Textarea') ? 'Textarea' : editType.includes('File') ? 'File upload' : editType.includes('Number') ? 'Number' : 'Text',
            required: editRequired,
            values: editValues,
            placeholder: editPlaceholder,
          };
        }
        return f;
      })
    );
    showToast(`Đã lưu cấu hình trường "${editName}" thành công!`);
  };

  const handleRemoveValue = (index) => {
    setEditValues((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddValue = () => {
    setEditValues((prev) => [...prev, `Lựa chọn ${prev.length + 1}`]);
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
    <div>
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

      <div className="form-designer">
        {/* Left: Field list */}
        <div className="fd-left">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 className="fd-section-title" style={{ margin: 0 }}>Các trường trong biểu mẫu ({fields.length})</h3>
          </div>

          <div className="fd-field-list">
            {fields.map((field) => (
              <div
                key={field.id}
                className={`fd-field-card ${field.id === selectedId ? 'selected' : ''}`}
                onClick={() => handleSelectField(field)}
              >
                <div className="fd-field-drag" title="Kéo thả để sắp xếp">
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
                  <button
                    type="button"
                    className="fd-icon-btn"
                    title="Xóa trường này"
                    onClick={(e) => handleDeleteField(e, field.id)}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="fd-add-field"
            onClick={handleAddField}
          >
            + Thêm trường mới
          </button>
        </div>

        {/* Right: Field config */}
        <div className="fd-right">
          <h3 className="fd-section-title">Cấu hình trường đang chọn</h3>
          {selectedField ? (
            <div className="fd-config-form">
              <div className="fd-config-field">
                <label>Tên trường hiển thị</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    setEditKey(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_'));
                  }}
                />
              </div>

              <div className="fd-config-field">
                <label>Khóa biến (Key)</label>
                <input type="text" value={editKey} className="input-muted" readOnly />
              </div>

              <div className="fd-config-field">
                <label>Loại trường dữ liệu</label>
                <select value={editType} onChange={(e) => setEditType(e.target.value)}>
                  {fieldTypeOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  <option value="Dropdown">Danh sách chọn (Dropdown)</option>
                  <option value="Text">Nhập văn bản (Text)</option>
                  <option value="Number">Số (Number)</option>
                  <option value="Radio">Chọn một (Radio)</option>
                  <option value="Textarea">Văn bản dài (Textarea)</option>
                  <option value="File upload">Tải tệp (File upload)</option>
                </select>
              </div>

              {/* Value list for dropdown / radio */}
              {(editType.includes('Dropdown') || editType.includes('Radio') || editType === 'Dropdown' || editType === 'Radio') && (
                <div className="fd-config-field">
                  <label>Danh sách tùy chọn lựa chọn</label>
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
                        <button
                          type="button"
                          className="fd-value-remove"
                          onClick={() => handleRemoveValue(i)}
                          title="Xóa lựa chọn này"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M4 4l6 6M10 4l-6 6" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="fd-add-value" onClick={handleAddValue}>+ Thêm lựa chọn</button>
                </div>
              )}

              <div className="fd-config-toggle-row">
                <label>Bắt buộc nhập</label>
                <Toggle checked={editRequired} onChange={setEditRequired} />
              </div>

              <div className="fd-config-field">
                <label>Gợi ý nhập (Placeholder)</label>
                <input
                  type="text"
                  value={editPlaceholder}
                  onChange={(e) => setEditPlaceholder(e.target.value)}
                  placeholder="Ví dụ: Vui lòng nhập chi tiết lý do..."
                />
              </div>

              <div className="fd-config-actions">
                <Button variant="secondary" onClick={() => handleSelectField(selectedField)}>Hủy</Button>
                <Button variant="primary" onClick={handleSaveField}>Lưu trường</Button>
              </div>
            </div>
          ) : (
            <p style={{ color: '#9CA3AF' }}>Vui lòng chọn hoặc thêm một trường để cấu hình.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default FormDesigner;
