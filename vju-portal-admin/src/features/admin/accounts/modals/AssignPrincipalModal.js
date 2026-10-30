import React, { useState } from 'react';
import Modal from '../../../../components/common/Modal';
import Button from '../../../../components/common/Button';

function AssignPrincipalModal({ isOpen, onClose, currentPrincipal, onSave }) {
  const [name, setName] = useState(currentPrincipal?.name || 'PGS.TS Nguyễn Văn Bình');
  const [email, setEmail] = useState(currentPrincipal?.email || 'vanbinh@vju.ac.vn');
  const [title, setTitle] = useState(currentPrincipal?.title || 'Hiệu trưởng Trường Đại học Việt Nhật');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const words = name.trim().split(' ');
    const initials = words.length >= 2
      ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();

    if (onSave) {
      onSave({
        name: name.trim(),
        email: email.trim(),
        title: title.trim(),
        initials,
        status: 'active',
      });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gán / Chỉnh sửa tài khoản Hiệu trưởng"
      subtitle="Thiết lập quyền phê duyệt cao nhất và ký số các văn bản quyết định"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-field">
          <label>Họ và tên Hiệu trưởng <span style={{ color: '#DC2626' }}>*</span></label>
          <input
            type="text"
            placeholder="Ví dụ: GS.TS Furuta Motoo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="modal-field">
          <label>Email VJU <span style={{ color: '#DC2626' }}>*</span></label>
          <input
            type="email"
            placeholder="Ví dụ: furuta@vju.ac.vn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="modal-field">
          <label>Chức danh hiển thị</label>
          <input
            type="text"
            placeholder="Ví dụ: Hiệu trưởng Trường Đại học Việt Nhật"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="modal-footer">
          <Button variant="secondary" type="button" onClick={onClose}>Hủy</Button>
          <Button variant="primary" type="submit">Lưu phân quyền</Button>
        </div>
      </form>
    </Modal>
  );
}

export default AssignPrincipalModal;
