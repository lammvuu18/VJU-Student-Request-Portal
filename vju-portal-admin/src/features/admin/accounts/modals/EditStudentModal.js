import React, { useState, useEffect } from 'react';
import Modal from '../../../../components/common/Modal';
import Button from '../../../../components/common/Button';

function EditStudentModal({ isOpen, onClose, student, onSave }) {
  const [lop, setLop] = useState('');
  const [khoa, setKhoa] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (student) {
      setLop(student.classGroup || 'QH-2022-I/CQ-M');
      setKhoa(student.classGroup?.split('-')[1] ? `QH-${student.classGroup.split('-')[1]}` : 'QH-2022');
      setStatus(student.status || 'studying');
    }
  }, [student]);

  if (!student) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) {
      onSave({
        ...student,
        classGroup: lop,
        status,
      });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chỉnh sửa thông tin sinh viên"
      subtitle={`${student.name} — ${student.mssv}`}
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-field">
          <label>MSSV</label>
          <div className="input-with-lock">
            <input type="text" value={student.mssv} readOnly className="readonly" />
            <span className="lock-icon">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="3" y="6" width="8" height="6" rx="1.5" stroke="#9CA3AF" strokeWidth="1.2"/>
                <path d="M5 6V4a2 2 0 114 0v2" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </span>
          </div>
        </div>

        <div className="modal-field">
          <label>Email VNU</label>
          <div className="input-with-lock">
            <input type="text" value={student.email} readOnly className="readonly" />
            <span className="lock-icon">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="3" y="6" width="8" height="6" rx="1.5" stroke="#9CA3AF" strokeWidth="1.2"/>
                <path d="M5 6V4a2 2 0 114 0v2" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </span>
          </div>
        </div>

        <div className="modal-field">
          <label>Lớp hành chính</label>
          <select value={lop} onChange={(e) => setLop(e.target.value)}>
            <option value="QH-2023-I/CQ-M-CLC">QH-2023-I/CQ-M-CLC</option>
            <option value="QH-2023-I/CQ-M">QH-2023-I/CQ-M</option>
            <option value="QH-2022-I/CQ-M-CLC">QH-2022-I/CQ-M-CLC</option>
            <option value="QH-2022-I/CQ-M">QH-2022-I/CQ-M</option>
            <option value="QH-2021-I/CQ-M">QH-2021-I/CQ-M</option>
          </select>
        </div>

        <div className="modal-field">
          <label>Khóa tuyển sinh</label>
          <select value={khoa} onChange={(e) => setKhoa(e.target.value)}>
            <option value="QH-2024">QH-2024</option>
            <option value="QH-2023">QH-2023</option>
            <option value="QH-2022">QH-2022</option>
            <option value="QH-2021">QH-2021</option>
          </select>
        </div>

        <div className="modal-field">
          <label>Trạng thái học tập</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="studying">Đang học</option>
            <option value="reserved">Bảo lưu</option>
            <option value="quit">Đã tốt nghiệp</option>
          </select>
        </div>

        <div className="modal-footer">
          <Button variant="secondary" type="button" onClick={onClose}>Hủy</Button>
          <Button variant="primary" type="submit">Lưu thông tin</Button>
        </div>
      </form>
    </Modal>
  );
}

export default EditStudentModal;
