import React, { useState, useEffect } from 'react';
import './EditStudentModal.css';

function EditStudentModal({ isOpen, onClose, student, onSave }) {
  const [lop, setLop] = useState('QH-2023-I/CQ-M-CLC');
  const [khoa, setKhoa] = useState('QH-2023');
  const [status, setStatus] = useState('studying');

  useEffect(() => {
    if (student) {
      setLop(student.classGroup || 'QH-2023-I/CQ-M-CLC');
      const detectedKhoa = student.cohort
        ? student.cohort
        : student.classGroup?.split('-')[1]
        ? `QH-${student.classGroup.split('-')[1]}`
        : 'QH-2023';
      setKhoa(detectedKhoa);
      setStatus(student.status || 'studying');
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (onSave) {
      onSave({
        ...student,
        classGroup: lop,
        cohort: khoa,
        status,
      });
    }
    onClose();
  };

  return (
    <div className="edit-student-modal-overlay" onClick={onClose}>
      <div
        className="edit-student-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header Row */}
        <div className="esm-header-row">
          <h2 className="esm-title">Chỉnh sửa thông tin sinh viên</h2>
          <button
            type="button"
            className="esm-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Divider 1 */}
        <div className="esm-divider" />

        {/* Subtitle Row */}
        <div className="esm-subtitle-row">
          <div className="esm-sub-name">{student.name || 'Nguyễn Minh Anh'}</div>
          <div className="esm-sub-mssv">— {student.mssv || '23110150'}</div>
        </div>

        {/* Field 1: MSSV (Locked) */}
        <div className="esm-field-group">
          <label className="esm-field-label">MSSV</label>
          <div className="esm-locked-box">
            <span className="esm-locked-text">{student.mssv || '23110150'}</span>
            <span className="esm-lock-icon">🔒</span>
          </div>
        </div>

        {/* Field 2: Email (Locked) */}
        <div className="esm-field-group">
          <label className="esm-field-label">Email</label>
          <div className="esm-locked-box">
            <span className="esm-locked-text">{student.email || '23110150@vnu.edu.vn'}</span>
            <span className="esm-lock-icon">🔒</span>
          </div>
        </div>

        {/* Field 3: Lớp */}
        <div className="esm-field-group">
          <label className="esm-field-label">Lớp</label>
          <div className="esm-select-box">
            <select
              className="esm-select"
              value={lop}
              onChange={(e) => setLop(e.target.value)}
            >
              <option value="QH-2023-I/CQ-M-CLC">QH-2023-I/CQ-M-CLC</option>
              <option value="QH-2023-I/CQ-M">QH-2023-I/CQ-M</option>
              <option value="QH-2022-I/CQ-M-CLC">QH-2022-I/CQ-M-CLC</option>
              <option value="QH-2022-I/CQ-M">QH-2022-I/CQ-M</option>
              <option value="QH-2021-I/CQ-M">QH-2021-I/CQ-M</option>
              <option value="CS2021A">CS2021A</option>
            </select>
            <span className="esm-select-arrow">▾</span>
          </div>
        </div>

        {/* Field 4: Khóa */}
        <div className="esm-field-group">
          <label className="esm-field-label">Khóa</label>
          <div className="esm-select-box">
            <select
              className="esm-select"
              value={khoa}
              onChange={(e) => setKhoa(e.target.value)}
            >
              <option value="QH-2024">QH-2024</option>
              <option value="QH-2023">QH-2023</option>
              <option value="QH-2022">QH-2022</option>
              <option value="QH-2021">QH-2021</option>
              <option value="K2021">K2021</option>
            </select>
            <span className="esm-select-arrow">▾</span>
          </div>
        </div>

        {/* Field 5: Trạng thái học tập */}
        <div className="esm-field-group">
          <label className="esm-field-label">Trạng thái học tập</label>
          <div className="esm-select-box">
            <select
              className="esm-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="studying">Đang học</option>
              <option value="reserved">Bảo lưu</option>
              <option value="graduated">Đã TN</option>
              <option value="quit">Đã TN</option>
            </select>
            <span className="esm-select-arrow">▾</span>
          </div>
        </div>

        {/* Divider 2 */}
        <div className="esm-divider" />
        <div style={{ height: 4, width: '100%' }} />

        {/* Action Buttons */}
        <div className="esm-actions-row">
          <button
            type="button"
            className="esm-btn-cancel"
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="button"
            className="esm-btn-save"
            onClick={handleSubmit}
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditStudentModal;