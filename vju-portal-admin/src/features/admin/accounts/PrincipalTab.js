import React, { useState } from 'react';
import AssignPrincipalModal from './modals/AssignPrincipalModal';
import EditPrincipalModal from './modals/EditPrincipalModal';
import { principal } from '../../../data/mockData';
import './PrincipalTab.css';

function PrincipalTab() {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentPrincipal, setCurrentPrincipal] = useState(principal || {
    name: 'PGS.TS Nguyễn Văn Bình',
    email: 'binh.nv@vju.ac.vn',
    initials: 'NVB',
    status: 'active',
  });
  const [toastMessage, setToastMessage] = useState('');

  const handleAssign = (assigned) => {
    setCurrentPrincipal(assigned);
    setToastMessage(`Đã gán thành công Hiệu trưởng mới: ${assigned.name}!`);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleSave = (updated) => {
    setCurrentPrincipal(updated);
    setToastMessage(`Đã cập nhật thông tin Hiệu trưởng: ${updated.name}!`);
    setTimeout(() => setToastMessage(''), 3500);
  };

  return (
    <div className="principal-tab-container">
      {toastMessage && (
        <div className="principal-toast">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="principal-top-bar">
        <button
          type="button"
          className="principal-btn-assign"
          onClick={() => setIsAssignModalOpen(true)}
        >
          + Gán Hiệu trưởng
        </button>
      </div>

      {/* Principal Profile Card */}
      <div className="principal-profile-card">
        <div className="principal-avatar-circle">
          <span className="principal-avatar-text">{currentPrincipal.initials || 'NVB'}</span>
        </div>

        <div className="principal-info-col">
          <div className="principal-name-text">{currentPrincipal.name || 'PGS.TS Nguyễn Văn Bình'}</div>
          <div className="principal-email-text">{currentPrincipal.email || 'binh.nv@vju.ac.vn'}</div>
        </div>

        <div className={`principal-status-badge ${currentPrincipal.status === 'inactive' ? 'status-inactive' : 'status-active'}`}>
          {currentPrincipal.status === 'inactive' ? 'Vô hiệu' : 'Đang hoạt động'}
        </div>

        <button
          type="button"
          className="principal-btn-edit"
          onClick={() => setIsEditModalOpen(true)}
        >
          Sửa
        </button>
      </div>

      {/* Modal 1: Gán Hiệu trưởng */}
      <AssignPrincipalModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onAssign={handleAssign}
      />

      {/* Modal 2: Chỉnh sửa thông tin Hiệu trưởng */}
      <EditPrincipalModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentPrincipal={currentPrincipal}
        onSave={handleSave}
      />
    </div>
  );
}

export default PrincipalTab;
