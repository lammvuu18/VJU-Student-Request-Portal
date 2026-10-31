import React, { useState } from 'react';
import './FormDesigner.css';

export const initialFormFields = [
  {
    id: 1,
    name: 'Họ và tên',
    key: 'ho_va_ten',
    type: 'Text',
    required: true,
    placeholder: 'Nhập họ và tên sinh viên...',
    values: [],
  },
  {
    id: 2,
    name: 'Mã số sinh viên',
    key: 'ma_so_sinh_vien',
    type: 'Text',
    required: true,
    placeholder: 'Nhập mã số sinh viên...',
    values: [],
  },
  {
    id: 3,
    name: 'Mục đích sử dụng',
    key: 'muc_dich',
    type: 'Dropdown',
    required: true,
    placeholder: 'Nhập mục đích xin cấp bảng điểm...',
    values: ['Xin việc', 'Du học', 'Lưu trữ cá nhân'],
  },
  {
    id: 4,
    name: 'Số bản',
    key: 'so_ban',
    type: 'Number',
    required: true,
    placeholder: 'Nhập số lượng bản in...',
    values: [],
  },
  {
    id: 5,
    name: 'Ngôn ngữ',
    key: 'ngon_ngu',
    type: 'Radio',
    required: true,
    placeholder: '',
    values: ['Tiếng Việt', 'Tiếng Anh', 'Song ngữ'],
  },
  {
    id: 6,
    name: 'Ghi chú',
    key: 'ghi_chu',
    type: 'Textarea',
    required: false,
    placeholder: 'Nhập ghi chú nếu có...',
    values: [],
  },
  {
    id: 7,
    name: 'Hồ sơ đính kèm',
    key: 'ho_so_dinh_kem',
    type: 'File upload',
    required: false,
    placeholder: '',
    values: [],
  },
];

const typeOptions = [
  { value: 'Dropdown', label: 'Danh sách chọn (Dropdown)' },
  { value: 'Text', label: 'Nhập văn bản (Text)' },
  { value: 'Number', label: 'Số (Number)' },
  { value: 'Radio', label: 'Chọn một (Radio)' },
  { value: 'Textarea', label: 'Văn bản dài (Textarea)' },
  { value: 'File upload', label: 'Tải tệp (File upload)' },
];

function FormDesigner({ fields, setFields }) {
  const [selectedId, setSelectedId] = useState(3); // Field "Mục đích sử dụng" selected by default
  const selectedField = fields.find((f) => f.id === selectedId) || fields[0];

  // Config state for the selected field
  const [editName, setEditName] = useState(selectedField?.name || 'Mục đích sử dụng');
  const [editKey, setEditKey] = useState(selectedField?.key || 'muc_dich');
  const [editType, setEditType] = useState(selectedField?.type || 'Dropdown');
  const [editRequired, setEditRequired] = useState(selectedField?.required ?? true);
  const [editValues, setEditValues] = useState(selectedField?.values || ['Xin việc', 'Du học', 'Lưu trữ cá nhân']);
  const [editPlaceholder, setEditPlaceholder] = useState(selectedField?.placeholder || 'Nhập mục đích xin cấp bảng điểm...');
  const [toastMessage, setToastMessage] = useState('');

  // Drag-and-drop ordering state
  const [draggedIndex, setDraggedIndex] = useState(null);

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
    setEditValues(field.values && field.values.length > 0 ? [...field.values] : ['Lựa chọn 1', 'Lựa chọn 2']);
    setEditPlaceholder(field.placeholder || '');
  };

  const handleAddField = () => {
    const newId = Date.now();
    const newField = {
      id: newId,
      name: 'Trường thông tin mới',
      key: `truong_${newId.toString().slice(-4)}`,
      type: 'Text',
      required: false,
      placeholder: 'Nhập thông tin...',
      values: [],
    };
    const updated = [...fields, newField];
    setFields(updated);
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
            type: editType,
            required: editRequired,
            values: editType === 'Dropdown' || editType === 'Radio' ? editValues : [],
            placeholder: editPlaceholder,
          };
        }
        return f;
      })
    );
    showToast(`Đã lưu cấu hình trường "${editName}" thành công!`);
  };

  const handleCancelEdit = () => {
    if (selectedField) {
      handleSelectField(selectedField);
      showToast('Đã khôi phục cài đặt trường');
    }
  };

  const handleRemoveValue = (index) => {
    setEditValues((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddValue = () => {
    setEditValues((prev) => [...prev, `Lựa chọn ${prev.length + 1}`]);
  };

  const handleValueChange = (index, value) => {
    setEditValues((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  // Reorder handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const items = [...fields];
    const [draggedItem] = items.splice(draggedIndex, 1);
    items.splice(index, 0, draggedItem);
    setFields(items);
    setDraggedIndex(null);
  };

  return (
    <div className="form-designer-wrapper">
      {toastMessage && (
        <div className="fd-toast-banner">
          <span className="fd-toast-icon">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="form-designer-container">
        {/* Left Column: Form Fields List (620px) */}
        <div className="fd-left-column">
          <div className="fd-column-header">
            <h2 className="fd-column-title">Các trường trong biểu mẫu</h2>
          </div>

          <div className="fd-fields-list">
            {fields.map((field, index) => {
              const isSelected = field.id === selectedId;
              return (
                <div
                  key={field.id}
                  className={`fd-field-card ${isSelected ? 'active-card' : ''}`}
                  onClick={() => handleSelectField(field)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <div className="fd-drag-grip" title="Kéo để sắp xếp">
                    ⠿
                  </div>

                  <div className="fd-field-content">
                    <div className="fd-field-name">{field.name}</div>
                    <div className="fd-badges-group">
                      <span className="fd-badge fd-badge--type">{field.type}</span>
                      <span
                        className={`fd-badge ${
                          field.required ? 'fd-badge--required' : 'fd-badge--optional'
                        }`}
                      >
                        {field.required ? 'Bắt buộc' : 'Tùy chọn'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="fd-action-btn"
                    title="Chỉnh sửa trường"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectField(field);
                    }}
                  >
                    ✎
                  </button>

                  <button
                    type="button"
                    className="fd-action-btn"
                    title="Xóa trường"
                    onClick={(e) => handleDeleteField(e, field.id)}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          <button type="button" className="fd-add-field-btn" onClick={handleAddField}>
            + Thêm trường mới
          </button>
        </div>

        {/* Right Column: Field Configuration (Flex 1) */}
        <div className="fd-right-column">
          <div className="fd-column-header">
            <h2 className="fd-column-title">Cấu hình trường</h2>
          </div>

          {selectedField ? (
            <div className="fd-config-body">
              {/* Tên trường */}
              <div className="fd-form-group">
                <label className="fd-input-label">Tên trường</label>
                <div className="fd-input-wrapper">
                  <input
                    type="text"
                    className="fd-input-text"
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value);
                      setEditKey(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_'));
                    }}
                    placeholder="Nhập tên trường..."
                  />
                </div>
              </div>

              {/* Khóa trường */}
              <div className="fd-form-group">
                <label className="fd-input-label">Khóa trường</label>
                <div className="fd-input-wrapper">
                  <input
                    type="text"
                    className="fd-input-text"
                    value={editKey}
                    onChange={(e) => setEditKey(e.target.value)}
                    placeholder="field_key"
                  />
                </div>
              </div>

              {/* Loại trường */}
              <div className="fd-form-group">
                <label className="fd-input-label">Loại trường</label>
                <div className="fd-select-wrapper">
                  <select
                    className="fd-select"
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                  >
                    {typeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="fd-select-arrow">▾</span>
                </div>
              </div>

              {/* Danh sách giá trị (for Dropdown & Radio) */}
              {(editType === 'Dropdown' || editType === 'Radio') && (
                <div className="fd-form-group">
                  <label className="fd-input-label">Danh sách giá trị</label>
                  <div className="fd-values-list">
                    {editValues.map((val, idx) => (
                      <div key={idx} className="fd-value-row">
                        <input
                          type="text"
                          className="fd-value-input"
                          value={val}
                          onChange={(e) => handleValueChange(idx, e.target.value)}
                          placeholder={`Lựa chọn ${idx + 1}`}
                        />
                        <button
                          type="button"
                          className="fd-value-del-btn"
                          onClick={() => handleRemoveValue(idx)}
                          title="Xóa lựa chọn này"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="fd-add-value-btn"
                    onClick={handleAddValue}
                  >
                    + Thêm giá trị
                  </button>
                </div>
              )}

              {/* Bắt buộc toggle */}
              <div className="fd-toggle-row">
                <span className="fd-input-label">Bắt buộc</span>
                <div
                  className={`fd-switch-pill ${editRequired ? 'switch-on' : 'switch-off'}`}
                  onClick={() => setEditRequired(!editRequired)}
                  role="button"
                  tabIndex={0}
                  aria-label="Chuyển trạng thái bắt buộc"
                >
                  <div className="fd-switch-knob" />
                </div>
              </div>

              {/* Placeholder */}
              <div className="fd-form-group">
                <label className="fd-input-label">Placeholder</label>
                <div className="fd-input-wrapper">
                  <input
                    type="text"
                    className="fd-input-text fd-input-placeholder"
                    value={editPlaceholder}
                    onChange={(e) => setEditPlaceholder(e.target.value)}
                    placeholder="Nhập mục đích xin cấp bảng điểm..."
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="fd-divider" />

              {/* Bottom Buttons */}
              <div className="fd-actions-row">
                <button
                  type="button"
                  className="fd-btn-cancel"
                  onClick={handleCancelEdit}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="fd-btn-save"
                  onClick={handleSaveField}
                >
                  Lưu trường
                </button>
              </div>
            </div>
          ) : (
            <p className="fd-empty-text">Vui lòng chọn một trường để cấu hình.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default FormDesigner;