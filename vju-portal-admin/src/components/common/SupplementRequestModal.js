import React from 'react';
import './SupplementRequestModal.css';

/**
 * Modal Yêu cầu sinh viên bổ sung hồ sơ
 * Built strictly according to Figma Dev Mode specifications.
 */
function SupplementRequestModal({
  isOpen,
  onClose,
  requestCode = 'VJU-2026-0840',
  studentName = 'Nguyễn Minh Anh',
  supplementCount = '1/2',
  value = '',
  onChange,
  onSubmit,
}) {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (onSubmit) onSubmit(e);
  };

  return (
    <div
      className="supplement-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        className="supplement-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="supplement-modal-header">
          <div className="supplement-modal-title">
            Yêu cầu sinh viên bổ sung hồ sơ
          </div>
          <button
            type="button"
            className="supplement-modal-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Divider */}
        <div className="supplement-modal-divider" />

        {/* Row 1: Đơn */}
        <div className="supplement-modal-row-don">
          <div className="supplement-modal-label">Đơn:</div>
          <div className="supplement-modal-value">
            {requestCode} — {studentName}
          </div>
        </div>

        {/* Row 2: Lần bổ sung */}
        <div className="supplement-modal-row-lan">
          <div className="supplement-modal-label">Lần bổ sung:</div>
          <div className="supplement-modal-value-bold">
            {supplementCount}
          </div>
        </div>

        {/* Section title: Nội dung cần bổ sung */}
        <div className="supplement-modal-field-label">
          Nội dung cần bổ sung
        </div>

        {/* Input box */}
        <div className="supplement-modal-textarea-container">
          <textarea
            className="supplement-modal-textarea"
            value={value}
            onChange={onChange}
            placeholder="Mô tả cụ thể những giấy tờ hoặc thông tin SV cần nộp thêm..."
            rows={4}
            autoFocus
          />
        </div>

        {/* Divider */}
        <div className="supplement-modal-divider" />

        {/* Actions */}
        <div className="supplement-modal-actions">
          <button
            type="button"
            className="supplement-modal-btn-cancel"
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="button"
            className="supplement-modal-btn-submit"
            onClick={handleSubmit}
          >
            Gửi yêu cầu bổ sung
          </button>
        </div>
      </div>
    </div>
  );
}

export default SupplementRequestModal;

