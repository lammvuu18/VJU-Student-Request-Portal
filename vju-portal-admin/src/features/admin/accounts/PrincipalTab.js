import React, { useState } from 'react';
import Button from '../../../components/common/Button';
import AssignPrincipalModal from './modals/AssignPrincipalModal';
import { principal } from '../../../data/mockData';
import './PrincipalTab.css';

function PrincipalTab() {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPrincipal, setCurrentPrincipal] = useState(principal);
  const [toastMessage, setToastMessage] = useState('');

  const handleSave = (updated) => {
    setCurrentPrincipal(updated);
    setToastMessage(`Đã cập nhật thông tin Hiệu trưởng: ${updated.name}!`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  return (
    <div className="principal-tab">
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

      <div className="principal-header">
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>Tài khoản Ban Giám hiệu</h3>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0 0' }}>Có thẩm quyền cao nhất phê duyệt các quyết định và chứng chỉ</p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          + Gán Hiệu trưởng
        </Button>
      </div>

      <div className="principal-card" style={{ marginTop: 16 }}>
        <div className="principal-avatar">
          <span className="principal-initials">{currentPrincipal.initials}</span>
        </div>
        <div className="principal-info">
          <div className="principal-name">{currentPrincipal.name}</div>
          <div className="principal-email">{currentPrincipal.email}</div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{currentPrincipal.title || 'Hiệu trưởng Trường Đại học Việt Nhật'}</div>
        </div>
        <div className="principal-actions">
          <span className="principal-status">Đang hoạt động</span>
          <Button variant="outline-red" size="sm" onClick={() => setModalOpen(true)}>
            Chỉnh sửa
          </Button>
        </div>
      </div>

      <AssignPrincipalModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        currentPrincipal={currentPrincipal}
        onSave={handleSave}
      />
    </div>
  );
}

export default PrincipalTab;
