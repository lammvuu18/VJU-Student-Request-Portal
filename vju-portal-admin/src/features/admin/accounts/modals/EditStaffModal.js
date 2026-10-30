import React, { useState, useEffect } from 'react';
import Modal from '../../../../components/common/Modal';
import Button from '../../../../components/common/Button';
import Toggle from '../../../../components/common/Toggle';

function EditStaffModal({ isOpen, onClose, staff, onSave }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dept, setDept] = useState('');
  const [level, setLevel] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (staff) {
      setName(staff.name || '');
      setEmail(staff.email || '');
      setDept(staff.department || 'PĐT');
      setLevel(staff.level || 'Chuyên viên');
      setIsActive(staff.status === 'active');
    }
  }, [staff]);

  if (!staff) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) {
      onSave({
        ...staff,
        name: name.trim(),
        email: email.trim(),
        department: dept,
        level,
        status: isActive ? 'active' : 'locked',
      });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chỉnh sửa thông tin cán bộ"
      subtitle={`${staff.name} — ${staff.department}`}
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-field">
          <label>Họ tên <span style={{ color: '#DC2626' }}>*</span></label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="modal-field">
          <label>Email VJU <span style={{ color: '#DC2626' }}>*</span></label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div className="modal-field">
          <label>Phòng ban</label>
          <select value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="PĐT">Phòng Đào tạo (PĐT)</option>
            <option value="PCTSV">Phòng Công tác sinh viên (PCTSV)</option>
            <option value="PKHTC">Phòng Kế hoạch tài chính (PKHTC)</option>
          </select>
        </div>

        <div className="modal-field">
          <label>Chức vụ / Cấp phê duyệt</label>
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="Chuyên viên">Chuyên viên — Cấp 1</option>
            <option value="Trưởng phòng">Trưởng phòng — Cấp 2</option>
          </select>
        </div>

        <div className="modal-toggle-row">
          <label>Trạng thái tài khoản</label>
          <Toggle checked={isActive} onChange={setIsActive} label={isActive ? 'Đang hoạt động' : 'Tạm khóa'} />
        </div>

        <div className="modal-footer">
          <Button variant="secondary" type="button" onClick={onClose}>Hủy</Button>
          <Button variant="primary" type="submit">Lưu thông tin</Button>
        </div>
      </form>
    </Modal>
  );
}

export default EditStaffModal;
