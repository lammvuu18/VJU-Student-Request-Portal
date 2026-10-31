import React, { useState, useEffect } from 'react';
import './EditPrincipalModal.css';

function EditPrincipalModal({ isOpen, onClose, currentPrincipal, onSave }) {
  const [name, setName] = useState('PGS.TS Nguyễn Văn Bình');
  const [email, setEmail] = useState('binh.nv@vju.ac.vn');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (currentPrincipal) {
      setName(currentPrincipal.name || 'PGS.TS Nguyễn Văn Bình');
      setEmail(currentPrincipal.email || 'binh.nv@vju.ac.vn');
      setIsActive(currentPrincipal.status !== 'inactive' && currentPrincipal.status !== 'locked');
    }
  }, [currentPrincipal, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const words = name.trim().split(' ').filter(Boolean);
    let initials = 'NVB';
    if (words.length >= 3) {
      initials = `${words[0][0]}${words[1][0]}${words[words.length - 1][0]}`.toUpperCase();
    } else if (words.length >= 2) {
      initials = `${words[0][0]}${words[1][0]}`.toUpperCase();
    } else if (words.length === 1) {
      initials = words[0].slice(0, 3).toUpperCase();
    }

    if (onSave) {
      onSave({
        ...currentPrincipal,
        name: name.trim(),
        email: email.trim(),
        initials: currentPrincipal?.initials || initials,
        status: isActive ? 'active' : 'inactive',
      });
    }
    onClose();
  };

  return (
    <div className="edit-principal-modal-overlay" onClick={onClose}>
      <div
        className="edit-principal-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header Row */}
        <div className="epm-header-row">
          <h2 className="epm-title">Chỉnh sửa thông tin Hiệu trưởng</h2>
          <button
            type="button"
            className="epm-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Divider 1 */}
        <div className="epm-divider" />

        {/* Field 1: Họ tên */}
        <div className="epm-field-group">
          <label className="epm-field-label">Họ tên Hiệu trưởng</label>
          <div className="epm-input-box">
            <input
              type="text"
              className="epm-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="PGS.TS Nguyễn Văn Bình"
            />
          </div>
        </div>

        {/* Field 2: Email VJU */}
        <div className="epm-field-group">
          <label className="epm-field-label">Email VJU</label>
          <div className="epm-input-box">
            <input
              type="email"
              className="epm-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="binh.nv@vju.ac.vn"
            />
          </div>
        </div>

        {/* Field 3: Trạng thái (Toggle Switch Row) */}
        <div className="epm-status-row">
          <span className="epm-status-label">Trạng thái</span>
          <span
            className="epm-status-text"
            style={{ color: isActive ? '#168039' : '#6B7280' }}
          >
            {isActive ? 'Đang hoạt động' : 'Vô hiệu'}
          </span>
          <div
            className={`epm-toggle-pill ${isActive ? 'epm-toggle-on' : 'epm-toggle-off'}`}
            onClick={() => setIsActive(!isActive)}
            role="button"
            tabIndex={0}
            aria-label="Chuyển trạng thái hoạt động"
          >
            <div className="epm-toggle-knob" />
          </div>
        </div>

        {/* Divider 2 */}
        <div className="epm-divider" />
        <div style={{ height: 4, width: '100%' }} />

        {/* Action Buttons */}
        <div className="epm-actions-row">
          <button
            type="button"
            className="epm-btn-cancel"
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="button"
            className="epm-btn-save"
            onClick={handleSubmit}
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditPrincipalModal;

