import React, { useState, useEffect, useRef } from 'react';
import './TransferRequestModal.css';

const defaultDepartmentOptions = [
  'Phòng Công tác Sinh viên (Student Affairs)',
  'Phòng Đào tạo (Academic Affairs)',
  'Phòng Kế hoạch - Tài chính (Finance & Planning)',
  'Văn phòng Viện / Khoa (Faculty Office)',
  'Trung tâm Khảo thí (Testing Center)',
];

/**
 * Modal Chuyển yêu cầu sang phòng ban khác
 * Built strictly according to Figma Dev Mode specifications.
 */
function TransferRequestModal({
  isOpen,
  onClose,
  requestCode = 'VJU-2026-0840',
  studentName = 'Nguyễn Minh Anh',
  procedureName = 'Cấp bảng điểm',
  departmentList,
  initialDepartment = '',
  initialNotes = '',
  onSubmit,
}) {
  const departments = departmentList && departmentList.length > 0 ? departmentList : defaultDepartmentOptions;

  const [selectedDept, setSelectedDept] = useState(initialDepartment);
  const [notes, setNotes] = useState(initialNotes);
  const [openDropdown, setOpenDropdown] = useState(false);

  const dropdownRef = useRef(null);

  // Sync initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDept(initialDepartment || '');
      setNotes(initialNotes || '');
      setOpenDropdown(false);
    }
  }, [isOpen, initialDepartment, initialNotes]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(false);
      }
    }
    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (onSubmit) {
      onSubmit({
        department: selectedDept || departments[0],
        notes,
      });
    }
  };

  return (
    <div
      className="transfer-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        className="transfer-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="transfer-modal-header">
          <div
            className="transfer-modal-title"
            style={{
              width: '100%',
              color: '#1F2937',
              fontSize: 18,
              fontFamily: 'Inter',
              fontWeight: '600',
              wordWrap: 'break-word',
            }}
          >
            Chuyển yêu cầu sang phòng ban khác
          </div>
          <button
            type="button"
            className="transfer-modal-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Divider */}
        <div className="transfer-modal-divider" />

        {/* Row: Đơn */}
        <div className="transfer-modal-row-don">
          <div className="transfer-modal-label">Đơn:</div>
          <div className="transfer-modal-value">
            {requestCode} — {studentName} — {procedureName}
          </div>
        </div>

        {/* Section 1: Chọn phòng ban */}
        <div className="transfer-modal-field-label">Chọn phòng ban</div>
        <div className="transfer-modal-select-wrapper" ref={dropdownRef}>
          <button
            type="button"
            className={`transfer-modal-select-btn ${openDropdown ? 'transfer-modal-select-btn--open' : ''}`}
            onClick={() => setOpenDropdown(!openDropdown)}
          >
            <span
              className={`transfer-modal-select-text ${
                selectedDept
                  ? 'transfer-modal-select-text--selected'
                  : 'transfer-modal-select-text--placeholder'
              }`}
            >
              {selectedDept || 'Chọn phòng ban...'}
            </span>
            <span className="transfer-modal-select-arrow">▾</span>
          </button>

          {openDropdown && (
            <div className="transfer-modal-select-menu">
              {departments.map((dept) => {
                const deptName = typeof dept === 'string' ? dept : dept.department_name;
                const isSelected = selectedDept === deptName;
                return (
                  <div
                    key={deptName}
                    className={`transfer-modal-select-item ${
                      isSelected ? 'transfer-modal-select-item--active' : ''
                    }`}
                    onClick={() => {
                      setSelectedDept(deptName);
                      setOpenDropdown(false);
                    }}
                  >
                    {deptName}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: Ghi chú chuyển * */}
        <div className="transfer-modal-field-label">Ghi chú chuyển *</div>
        <div className="transfer-modal-textarea-container">
          <textarea
            className="transfer-modal-textarea"
            placeholder="Mô tả phần việc đã hoàn thành và lý do chuyển..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Divider */}
        <div className="transfer-modal-divider" />

        {/* Action Buttons */}
        <div className="transfer-modal-actions">
          <button
            type="button"
            className="transfer-modal-btn-cancel"
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="button"
            className="transfer-modal-btn-confirm"
            onClick={handleSubmit}
          >
            Xác nhận chuyển
          </button>
        </div>
      </div>
    </div>
  );
}

export default TransferRequestModal;

