import React, { useState, useEffect } from 'react';
import './EditStaffModal.css';

function EditStaffModal({ isOpen, onClose, staff, onSave }) {
  const [name, setName] = useState('Lê Hoàng Nam');
  const [email, setEmail] = useState('nam.lh@vju.ac.vn');
  const [dept, setDept] = useState('PĐT');
  const [level, setLevel] = useState('Chuyên viên');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (staff) {
      setName(staff.name || 'Lê Hoàng Nam');
      setEmail(staff.email || 'nam.lh@vju.ac.vn');
      setDept(staff.department || 'PĐT');
      setLevel(staff.level || 'Chuyên viên');
      setIsActive(staff.status === 'active');
    }
  }, [staff]);

  if (!isOpen || !staff) return null;

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (onSave) {
      onSave({
        ...staff,
        name: name.trim(),
        email: email.trim(),
        department: dept,
        level: level.includes('Trưởng phòng') ? 'Trưởng phòng' : 'Chuyên viên',
        status: isActive ? 'active' : 'locked',
      });
    }
    onClose();
  };

  return (
    <div className="edit-staff-modal-overlay" onClick={onClose}>
      <div
        className="edit-staff-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header Row */}
        <div className="est-header-row">
          <h2 className="est-title">Chỉnh sửa thông tin cán bộ</h2>
          <button
            type="button"
            className="est-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Divider 1 */}
        <div className="est-divider" />

        {/* Field 1: Họ tên */}
        <div className="est-field-group">
          <label className="est-field-label">Họ tên</label>
          <div className="est-input-box">
            <input
              type="text"
              className="est-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Lê Hoàng Nam"
            />
          </div>
        </div>

        {/* Field 2: Email */}
        <div className="est-field-group">
          <label className="est-field-label">Email</label>
          <div className="est-input-box">
            <input
              type="email"
              className="est-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nam.lh@vju.ac.vn"
            />
          </div>
        </div>

        {/* Field 3: Phòng ban */}
        <div className="est-field-group">
          <label className="est-field-label">Phòng ban</label>
          <div className="est-select-box">
            <select
              className="est-select"
              value={dept}
              onChange={(e) => setDept(e.target.value)}
            >
              <option value="PĐT">Phòng Đào tạo</option>
              <option value="PCTSV">Phòng Công tác Sinh viên</option>
              <option value="PKHTC">Phòng Kế hoạch Tài chính</option>
            </select>
            <span className="est-select-arrow">▾</span>
          </div>
        </div>

        {/* Field 4: Cấp */}
        <div className="est-field-group">
          <label className="est-field-label">Cấp</label>
          <div className="est-select-box">
            <select
              className="est-select"
              value={level.includes('Trưởng phòng') ? 'Trưởng phòng — Cấp 2' : 'Chuyên viên — Cấp 1'}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option value="Chuyên viên — Cấp 1">Chuyên viên — Cấp 1</option>
              <option value="Trưởng phòng — Cấp 2">Trưởng phòng — Cấp 2</option>
            </select>
            <span className="est-select-arrow">▾</span>
          </div>
        </div>

        {/* Field 5: Trạng thái (Toggle Switch Row) */}
        <div className="est-status-row">
          <span className="est-status-label">Trạng thái</span>
          <span
            className="est-status-text"
            style={{ color: isActive ? '#168039' : '#6B7280' }}
          >
            {isActive ? 'Hoạt động' : 'Vô hiệu'}
          </span>
          <div
            className={`est-toggle-pill ${isActive ? 'est-toggle-on' : 'est-toggle-off'}`}
            onClick={() => setIsActive(!isActive)}
            role="button"
            tabIndex={0}
            aria-label="Chuyển trạng thái hoạt động"
          >
            <div className="est-toggle-knob" />
          </div>
        </div>

        {/* Divider 2 */}
        <div className="est-divider" />
        <div style={{ height: 4, width: '100%' }} />

        {/* Action Buttons */}
        <div className="est-actions-row">
          <button
            type="button"
            className="est-btn-cancel"
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="button"
            className="est-btn-save"
            onClick={handleSubmit}
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditStaffModal;