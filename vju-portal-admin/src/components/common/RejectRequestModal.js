import React, { useState, useEffect, useRef } from 'react';
import './RejectRequestModal.css';

const defaultReasons = [
  'Hồ sơ không đủ điều kiện xét duyệt',
  'Thông tin cung cấp không chính xác',
  'Hết thời hạn tiếp nhận hoặc xử lý',
  'Sinh viên không thuộc đối tượng áp dụng',
  'Lý do khác',
];

/**
 * Modal Từ chối yêu cầu
 * Built strictly according to Figma Dev Mode specifications.
 */
function RejectRequestModal({
  isOpen,
  onClose,
  requestCode = 'VJU-2026-0840',
  studentName = 'Nguyễn Minh Anh',
  initialReason = '',
  initialNotes = '',
  onSubmit,
}) {
  const [selectedReason, setSelectedReason] = useState(initialReason);
  const [notes, setNotes] = useState(initialNotes);
  const [openDropdown, setOpenDropdown] = useState(false);

  const dropdownRef = useRef(null);

  // Sync initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedReason(initialReason || '');
      setNotes(initialNotes || '');
      setOpenDropdown(false);
    }
  }, [isOpen, initialReason, initialNotes]);

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
        reason: selectedReason || 'Hồ sơ không đủ điều kiện xét duyệt',
        notes,
      });
    }
  };

  return (
    <div
      className="reject-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        className="reject-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="reject-modal-header">
          <div
            className="reject-modal-title"
            style={{
              width: '100%',
              color: '#1F2937',
              fontSize: 18,
              fontFamily: 'Inter',
              fontWeight: '600',
              wordWrap: 'break-word',
            }}
          >
            Từ chối yêu cầu
          </div>
          <button
            type="button"
            className="reject-modal-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Divider */}
        <div className="reject-modal-divider" />

        {/* Row: Đơn */}
        <div className="reject-modal-row-don">
          <div className="reject-modal-label">Đơn:</div>
          <div className="reject-modal-value">
            {requestCode} — {studentName}
          </div>
        </div>

        {/* Section 1: Chọn lý do từ chối */}
        <div className="reject-modal-field-label">Chọn lý do từ chối</div>
        <div className="reject-modal-select-wrapper" ref={dropdownRef}>
          <button
            type="button"
            className={`reject-modal-select-btn ${openDropdown ? 'reject-modal-select-btn--open' : ''}`}
            onClick={() => setOpenDropdown(!openDropdown)}
          >
            <span
              className={`reject-modal-select-text ${
                selectedReason
                  ? 'reject-modal-select-text--selected'
                  : 'reject-modal-select-text--placeholder'
              }`}
            >
              {selectedReason || 'Chọn lý do...'}
            </span>
            <span className="reject-modal-select-arrow">▾</span>
          </button>

          {openDropdown && (
            <div className="reject-modal-select-menu">
              {defaultReasons.map((reason) => (
                <div
                  key={reason}
                  className={`reject-modal-select-item ${
                    selectedReason === reason ? 'reject-modal-select-item--active' : ''
                  }`}
                  onClick={() => {
                    setSelectedReason(reason);
                    setOpenDropdown(false);
                  }}
                >
                  {reason}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Ghi chú thêm */}
        <div className="reject-modal-field-label">Ghi chú thêm</div>
        <div className="reject-modal-textarea-container">
          <textarea
            className="reject-modal-textarea"
            placeholder="Nhập ghi chú bổ sung (tối thiểu 20 ký tự)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Warning callout banner (Yellow / Amber) */}
        <div className="reject-modal-warning-box">
          <div className="reject-modal-warning-icon">⚠</div>
          <div className="reject-modal-warning-text">
            Nếu SV đã thanh toán lệ phí, hệ thống sẽ tự động hoàn tiền khi từ chối (BR-31).
          </div>
        </div>

        {/* Divider */}
        <div className="reject-modal-divider" />

        {/* Action Buttons */}
        <div className="reject-modal-actions">
          <button
            type="button"
            className="reject-modal-btn-cancel"
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="button"
            className="reject-modal-btn-confirm"
            onClick={handleSubmit}
          >
            Xác nhận từ chối
          </button>
        </div>
      </div>
    </div>
  );
}

export default RejectRequestModal;

