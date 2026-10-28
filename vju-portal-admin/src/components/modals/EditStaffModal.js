import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Toggle from '../common/Toggle';

function EditStaffModal({ isOpen, onClose, staff }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dept, setDept] = useState('');
  const [level, setLevel] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (staff) {
      setName(staff.name || '');
      setEmail(staff.email || '');
      setDept(staff.department || '');
      setLevel(staff.level || '');
      setIsActive(staff.status === 'active');
    }
  }, [staff]);

  if (!staff) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chỉnh sửa thông tin cán bộ"
    >
      <div className="modal-field">
        <label>Họ tên</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="modal-field">
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div className="modal-field">
        <label>Phòng ban</label>
        <select value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="PĐT">Phòng Đào tạo</option>
          <option value="PCTSV">Phòng CTSV</option>
          <option value="PKHTC">Phòng KHTC</option>
        </select>
      </div>

      <div className="modal-field">
        <label>Cấp</label>
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="Chuyên viên">Chuyên viên — Cấp 1</option>
          <option value="Trưởng phòng">Trưởng phòng</option>
        </select>
      </div>

      <div className="modal-toggle-row">
        <label>Trạng thái</label>
        <Toggle checked={isActive} onChange={setIsActive} />
      </div>

      <div className="modal-footer">
        <Button variant="secondary" onClick={onClose}>Hủy</Button>
        <Button variant="primary" onClick={onClose}>Lưu</Button>
      </div>
    </Modal>
  );
}

export default EditStaffModal;
