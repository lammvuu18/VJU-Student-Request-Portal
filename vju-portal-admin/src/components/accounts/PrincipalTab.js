import React, { useState } from 'react';
import Button from '../common/Button';
import AssignPrincipalModal from '../modals/AssignPrincipalModal';
import { principal } from '../../data/mockData';
import './PrincipalTab.css';

function PrincipalTab() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="principal-tab">
      <div className="principal-header">
        <div style={{ flex: 1 }} />
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          + Gán Hiệu trưởng
        </Button>
      </div>

      <div className="principal-card">
        <div className="principal-avatar">
          <span className="principal-initials">{principal.initials}</span>
        </div>
        <div className="principal-info">
          <div className="principal-name">{principal.name}</div>
          <div className="principal-email">{principal.email}</div>
        </div>
        <div className="principal-actions">
          <span className="principal-status">Đang hoạt động</span>
          <Button variant="outline-red" size="sm">Sửa</Button>
        </div>
      </div>

      <AssignPrincipalModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

export default PrincipalTab;
