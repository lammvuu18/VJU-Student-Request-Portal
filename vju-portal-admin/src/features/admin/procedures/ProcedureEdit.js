import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SegmentedTabs from '../../../components/common/SegmentedTabs';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import ProcedureConfig from './ProcedureConfig';
import FormDesigner from './FormDesigner';
import { formFields, procedureConfig } from '../../../data/mockData';
import './ProcedureEdit.css';

const tabs = [
  { key: 'config', label: 'Cấu hình thủ tục' },
  { key: 'form', label: 'Thiết kế form' },
];

function ProcedureEdit() {
  const [activeTab, setActiveTab] = useState('config');
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
    <div className="procedure-edit-page">
      <div className="procedure-edit-header">
        <div>
          <h1 className="page-title">Chỉnh sửa thủ tục: {procedureConfig.name}</h1>
          <p className="page-subtitle">Thiết lập quy trình phê duyệt và các trường thông tin trong đơn</p>
        </div>
        <div className="procedure-edit-links">
          {activeTab === 'form' && (
            <button
              type="button"
              className="link-btn"
              style={{ fontWeight: 600, color: '#2563EB' }}
              onClick={() => setIsPreviewOpen(true)}
            >
              👁 Xem trước biểu mẫu
            </button>
          )}
          <button className="link-btn" onClick={() => navigate('/admin/procedures')}>
            ← Quay lại danh mục thủ tục
          </button>
        </div>
      </div>

      <div className="procedure-edit-tabs">
        <SegmentedTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <div className="procedure-edit-content">
        {activeTab === 'config' ? <ProcedureConfig /> : <FormDesigner />}
      </div>

      {/* Modal Preview Form */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={`Xem trước biểu mẫu: ${procedureConfig.name}`}
        subtitle="Mô phỏng giao diện sinh viên sẽ điền khi nộp hồ sơ trực tuyến"
      >
        {previewSuccess ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{
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
            }}>
              ✓
            </div>
            <h3 style={{ fontSize: 18, color: '#111827', marginBottom: 8 }}>Kiểm tra biểu mẫu thành công!</h3>
            <p style={{ fontSize: 14, color: '#6B7280' }}>Tất cả các trường đã được điền và hợp lệ theo cấu hình.</p>
          </div>
        ) : (
          <form onSubmit={handlePreviewSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {formFields.map((field) => (
                <div key={field.id} className="modal-field">
                  <label>
                    {field.name} {field.required && <span style={{ color: '#DC2626' }}>*</span>}
                  </label>
                  {field.type === 'Textarea' ? (
                    <textarea
                      rows={3}
                      placeholder={field.placeholder || `Nhập ${field.name.toLowerCase()}...`}
                      required={field.required}
                      value={previewData[field.key] || ''}
                      onChange={(e) => setPreviewData({ ...previewData, [field.key]: e.target.value })}
                    />
                  ) : field.type === 'Dropdown' ? (
                    <select
                      required={field.required}
                      value={previewData[field.key] || ''}
                      onChange={(e) => setPreviewData({ ...previewData, [field.key]: e.target.value })}
                    >
                      <option value="">-- Chọn {field.name.toLowerCase()} --</option>
                      {(field.values || []).map((val, idx) => (
                        <option key={idx} value={val}>{val}</option>
                      ))}
                    </select>
                  ) : field.type === 'Radio' ? (
                    <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                      {(field.values || []).map((val, idx) => (
                        <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name={field.key}
                            value={val}
                            checked={previewData[field.key] === val}
                            onChange={(e) => setPreviewData({ ...previewData, [field.key]: e.target.value })}
                            required={field.required}
                          />
                          <span>{val}</span>
                        </label>
                      ))}
                    </div>
                  ) : field.type === 'File upload' ? (
                    <input
                      type="file"
                      required={field.required}
                      onChange={(e) => setPreviewData({ ...previewData, [field.key]: e.target.files[0]?.name })}
                    />
                  ) : (
                    <input
                      type={field.type === 'Number' ? 'number' : 'text'}
                      placeholder={field.placeholder || `Nhập ${field.name.toLowerCase()}...`}
                      required={field.required}
                      value={previewData[field.key] || ''}
                      onChange={(e) => setPreviewData({ ...previewData, [field.key]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="modal-footer" style={{ marginTop: 24 }}>
              <Button variant="secondary" type="button" onClick={() => setIsPreviewOpen(false)}>Đóng</Button>
              <Button variant="primary" type="submit">Thử nghiệm gửi đơn</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export default ProcedureEdit;
