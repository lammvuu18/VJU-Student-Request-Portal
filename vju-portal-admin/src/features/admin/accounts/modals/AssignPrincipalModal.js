import React, { useState } from 'react';
import './AssignPrincipalModal.css';

const CANDIDATES = [
  { id: 'furuta', name: 'GS.TS Furuta Motoo', email: 'furuta.m@vju.ac.vn', desc: 'Hiệu trưởng danh dự / Cố vấn cấp cao' },
  { id: 'binh', name: 'PGS.TS Nguyễn Văn Bình', email: 'binh.nv@vju.ac.vn', desc: 'Phó Hiệu trưởng phụ trách' },
  { id: 'ha', name: 'TS. Trần Thu Hà', email: 'ha.tt@vju.ac.vn', desc: 'Trưởng phòng Đào tạo' },
  { id: 'minh', name: 'ThS. Đặng Văn Minh', email: 'minh.dv@vju.ac.vn', desc: 'Trưởng phòng Công tác Sinh viên' },
  { id: 'nam', name: 'TS. Lê Hoàng Nam', email: 'nam.lh@vju.ac.vn', desc: 'Chuyên viên Phòng Đào tạo' },
];

function AssignPrincipalModal({ isOpen, onClose, onAssign }) {
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [decisionNo, setDecisionNo] = useState('');

  if (!isOpen) return null;

  const handleSelectCandidate = (val) => {
    setSelectedCandidate(val);
    if (val === 'custom') {
      setName('');
      setEmail('');
    } else {
      const found = CANDIDATES.find((c) => c.id === val);
      if (found) {
        setName(found.name);
        setEmail(found.email);
      }
    }
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const words = name.trim().split(' ').filter(Boolean);
    let initials = 'VJU';
    if (words.length >= 3) {
      initials = `${words[0][0]}${words[1][0]}${words[words.length - 1][0]}`.toUpperCase();
    } else if (words.length >= 2) {
      initials = `${words[0][0]}${words[1][0]}`.toUpperCase();
    } else if (words.length === 1) {
      initials = words[0].slice(0, 3).toUpperCase();
    }

    if (onAssign) {
      onAssign({
        name: name.trim(),
        email: email.trim(),
        initials,
        decisionNo: decisionNo.trim(),
        status: 'active',
      });
    }
    onClose();
  };

  return (
    <div className="assign-principal-modal-overlay" onClick={onClose}>
      <div
        className="assign-principal-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header Row */}
        <div className="apm-header-row">
          <h2 className="apm-title">Gán Hiệu trưởng</h2>
          <button
            type="button"
            className="apm-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Divider 1 */}
        <div className="apm-divider" />

        {/* Field 1: Chọn từ danh sách cán bộ */}
        <div className="apm-field-group">
          <label className="apm-field-label">Chọn cán bộ từ hệ thống</label>
          <div className="apm-select-box">
            <select
              className="apm-select"
              value={selectedCandidate}
              onChange={(e) => handleSelectCandidate(e.target.value)}
            >
              <option value="">-- Chọn cán bộ hoặc nhập mới bên dưới --</option>
              {CANDIDATES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email}) — {c.desc}
                </option>
              ))}
              <option value="custom">+ Cán bộ khác (Nhập thủ công)</option>
            </select>
            <span className="apm-select-arrow">▾</span>
          </div>
        </div>

        {/* Field 2: Họ và tên */}
        <div className="apm-field-group">
          <label className="apm-field-label">
            Họ tên Hiệu trưởng được gán <span className="apm-field-required">*</span>
          </label>
          <div className="apm-input-box">
            <input
              type="text"
              className="apm-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: GS.TS Furuta Motoo"
              required
            />
          </div>
        </div>

        {/* Field 3: Email VJU */}
        <div className="apm-field-group">
          <label className="apm-field-label">
            Email VJU <span className="apm-field-required">*</span>
          </label>
          <div className="apm-input-box">
            <input
              type="email"
              className="apm-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ví dụ: furuta.m@vju.ac.vn"
              required
            />
          </div>
        </div>

        {/* Field 4: Số quyết định bổ nhiệm */}
        <div className="apm-field-group">
          <label className="apm-field-label">Số quyết định bổ nhiệm (tuỳ chọn)</label>
          <div className="apm-input-box">
            <input
              type="text"
              className="apm-input"
              value={decisionNo}
              onChange={(e) => setDecisionNo(e.target.value)}
              placeholder="Ví dụ: 108/QĐ-ĐHQGHN"
            />
          </div>
        </div>

        {/* Warning / Notice Box */}
        <div className="apm-notice-box">
          <span className="apm-notice-icon">⚠️</span>
          <span className="apm-notice-text">
            <strong>Lưu ý:</strong> Khi hoàn tất gán quyền, tài khoản này sẽ nhận quyền phê duyệt cấp cao nhất và ký số các văn bản quyết định trong toàn trường.
          </span>
        </div>

        {/* Divider 2 */}
        <div className="apm-divider" />

        {/* Action Buttons */}
        <div className="apm-actions-row">
          <button
            type="button"
            className="apm-btn-cancel"
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="button"
            className="apm-btn-save"
            onClick={handleSubmit}
          >
            Gán Hiệu trưởng
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssignPrincipalModal;
