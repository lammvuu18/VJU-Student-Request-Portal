import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProcedureConfig from './ProcedureConfig';
import FormDesigner, { initialFormFields } from './FormDesigner';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import './ProcedureEdit.css';

function ProcedureEdit() {
  const [activeTab, setActiveTab] = useState('config'); // Active "Cấu hình thủ tục" per user's prompt
  const [fields, setFields] = useState(initialFormFields);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState({});
  const [previewSuccess, setPreviewSuccess] = useState(false);
  const navigate = useNavigate();

  const handlePreviewSubmit = (e) => {
    e.preventDefault();
    setPreviewSuccess(true);
    setTimeout(() => {
      setPreviewSuccess(false);
      setIsPreviewOpen(false);
    }, 2000);
  };

  return (
    <div className="procedure-edit-container">
      {/* Top Header Bar */}
      <div className="procedure-edit-topbar">
        <h1 className="procedure-edit-title">Chỉnh sửa thủ tục</h1>
        <div className="procedure-edit-actions">
          {activeTab === 'form' && (
            <button
              type="button"
              className="procedure-btn-secondary"
              onClick={() => setIsPreviewOpen(true)}
            >
              Xem trước biểu mẫu
            </button>
          )}
          <button
            type="button"
            className="procedure-btn-back"
            onClick={() => navigate('/admin/procedures')}
          >
            ← Quản lý thủ tục
          </button>
        </div>
      </div>

      {/* Pill Tab Switcher */}
      <div className="procedure-tabs-pill">
        <button
          type="button"
          className={`procedure-tab-item ${activeTab === 'config' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          Cấu hình thủ tục
        </button>
        <button
          type="button"
          className={`procedure-tab-item ${activeTab === 'form' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('form')}
        >
          Thiết kế form
        </button>
      </div>

      {/* Tab Content Area */}
      <div className="procedure-content-area">
        {activeTab === 'config' ? (
          <ProcedureConfig />
        ) : (
          <FormDesigner fields={fields} setFields={setFields} />
        )}
      </div>

      {/* Interactive Modal: Xem trước biểu mẫu */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Xem trước biểu mẫu: Cấp bảng điểm"
        subtitle="Mô phỏng giao diện sinh viên sẽ điền khi nộp hồ sơ trực tuyến"
      >
        {previewSuccess ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: 28,
              }}
            >
              ✓
            </div>
            <h3 style={{ fontSize: 18, color: '#111827', marginBottom: 8, fontWeight: 600 }}>
              Kiểm tra biểu mẫu thành công!
            </h3>
            <p style={{ fontSize: 14, color: '#6B7280' }}>
              Tất cả các trường đã được điền và hợp lệ theo cấu hình đã thiết lập.
            </p>
          </div>
        ) : (
          <form onSubmit={handlePreviewSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {fields.map((field) => (
                <div key={field.id} className="modal-field">
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 6,
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#374151',
                    }}
                  >
                    {field.name} {field.required && <span style={{ color: '#AA2327' }}>*</span>}
                  </label>

                  {field.type === 'Textarea' ? (
                    <textarea
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #E2E5EA',
                        borderRadius: 6,
                        fontSize: 13,
                        boxSizing: 'border-box',
                      }}
                      placeholder={field.placeholder || `Nhập ${field.name.toLowerCase()}...`}
                      required={field.required}
                      value={previewData[field.key] || ''}
                      onChange={(e) =>
                        setPreviewData({ ...previewData, [field.key]: e.target.value })
                      }
                    />
                  ) : field.type === 'Dropdown' ? (
                    <select
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #E2E5EA',
                        borderRadius: 6,
                        fontSize: 13,
                        boxSizing: 'border-box',
                      }}
                      required={field.required}
                      value={previewData[field.key] || ''}
                      onChange={(e) =>
                        setPreviewData({ ...previewData, [field.key]: e.target.value })
                      }
                    >
                      <option value="">-- Chọn {field.name.toLowerCase()} --</option>
                      {(field.values || []).map((val, idx) => (
                        <option key={idx} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'Radio' ? (
                    <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
                      {(field.values || []).map((val, idx) => (
                        <label
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 13,
                            cursor: 'pointer',
                            color: '#374151',
                          }}
                        >
                          <input
                            type="radio"
                            name={field.key}
                            value={val}
                            checked={previewData[field.key] === val}
                            onChange={(e) =>
                              setPreviewData({ ...previewData, [field.key]: e.target.value })
                            }
                            required={field.required}
                          />
                          <span>{val}</span>
                        </label>
                      ))}
                    </div>
                  ) : field.type === 'File upload' ? (
                    <input
                      type="file"
                      style={{ fontSize: 13 }}
                      required={field.required}
                      onChange={(e) =>
                        setPreviewData({
                          ...previewData,
                          [field.key]: e.target.files[0]?.name,
                        })
                      }
                    />
                  ) : (
                    <input
                      type={field.type === 'Number' ? 'number' : 'text'}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #E2E5EA',
                        borderRadius: 6,
                        fontSize: 13,
                        boxSizing: 'border-box',
                      }}
                      placeholder={field.placeholder || `Nhập ${field.name.toLowerCase()}...`}
                      required={field.required}
                      value={previewData[field.key] || ''}
                      onChange={(e) =>
                        setPreviewData({ ...previewData, [field.key]: e.target.value })
                      }
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="modal-footer" style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button variant="secondary" type="button" onClick={() => setIsPreviewOpen(false)}>
                Đóng
              </Button>
              <Button variant="primary" type="submit">
                Thử nghiệm gửi đơn
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export default ProcedureEdit;