import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';

function AssignPrincipalModal({ isOpen, onClose }) {
  const [searchValue, setSearchValue] = useState('');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gán Hiệu trưởng"
    >
      <div className="modal-field">
        <label>Tìm hoặc nhập email</label>
        <input
          type="text"
          placeholder="Tìm theo tên hoặc email..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      </div>

      <div className="modal-footer">
        <Button variant="secondary" onClick={onClose}>Hủy</Button>
        <Button variant="primary" onClick={onClose}>Lưu</Button>
      </div>
    </Modal>
  );
}

export default AssignPrincipalModal;
