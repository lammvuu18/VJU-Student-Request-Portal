import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './GoogleChooserPage.css';

const REGISTERED_STUDENTS = [
  {
    name: 'Nguyễn Minh Anh',
    email: 'minhanh@st.vju.ac.vn',
    avatar: 'MA',
    color: '#0284C7',
  },
  {
    name: 'Sinh viên mẫu 01',
    email: 'student01@st.vju.ac.vn',
    avatar: 'SV',
    color: '#16A34A',
  },
  {
    name: 'Trần Quốc Anh',
    email: 'quocanh@st.vju.ac.vn',
    avatar: 'QA',
    color: '#7C3AED',
  },
  {
    name: 'Lê Xuân Hậu',
    email: 'xuanhau@st.vju.ac.vn',
    avatar: 'XH',
    color: '#D97706',
  },
  {
    name: 'Quốc Anh (Gmail)',
    email: 'guenkokuain020411@gmail.com',
    avatar: 'QA',
    color: '#DB2777',
  },
];

function GoogleChooserPage() {
  const navigate = useNavigate();
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customEmail, setCustomEmail] = useState('');

  const handleSelectAccount = (email) => {
    // Redirect về trang callback của hệ thống kèm email đã chọn
    navigate(`/auth/callback?email=${encodeURIComponent(email)}`, { replace: true });
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    handleSelectAccount(customEmail.trim().toLowerCase());
  };

  return (
    <div className="google-chooser-bg">
      <div className="google-chooser-card">
        {/* Google Official Multi-colored Logo */}
        <div className="google-official-logo">
          <svg viewBox="0 0 74 24" width="74" height="24">
            <path fill="#4285F4" d="M12.5 10.2v3.7h5.9c-.3 1.7-2 4.9-5.9 4.9-3.5 0-6.4-2.9-6.4-6.5s2.9-6.5 6.4-6.5c2 0 3.3.9 4.1 1.6l2.8-2.7C17.6 3.1 15.3 2 12.5 2 6.8 2 2.2 6.6 2.2 12.3s4.6 10.3 10.3 10.3c6 0 9.9-4.2 9.9-10.1 0-.7-.1-1.4-.2-2.3H12.5z"/>
            <path fill="#EA4335" d="M31.2 12.5c0 3.6-2.8 6.2-6.2 6.2s-6.2-2.6-6.2-6.2c0-3.6 2.8-6.2 6.2-6.2 3.4 0 6.2 2.6 6.2 6.2zm-2.7 0c0-2.3-1.6-3.9-3.5-3.9-1.9 0-3.5 1.6-3.5 3.9 0 2.3 1.6 3.9 3.5 3.9 1.9 0 3.5-1.6 3.5-3.9z"/>
            <path fill="#FBBC05" d="M44.5 12.5c0 3.6-2.8 6.2-6.2 6.2s-6.2-2.6-6.2-6.2c0-3.6 2.8-6.2 6.2-6.2 3.4 0 6.2 2.6 6.2 6.2zm-2.7 0c0-2.3-1.6-3.9-3.5-3.9-1.9 0-3.5 1.6-3.5 3.9 0 2.3 1.6 3.9 3.5 3.9 1.9 0 3.5-1.6 3.5-3.9z"/>
            <path fill="#4285F4" d="M56.8 6.6v11.5c0 4.7-2.8 6.7-6.1 6.7-3.1 0-5-2.1-5.7-3.8l2.4-1c.5 1.1 1.7 2.4 3.3 2.4 2.2 0 3.5-1.3 3.5-3.8v-.9h-.1c-.7.9-2 1.6-3.6 1.6-3.4 0-6.2-2.8-6.2-6.3 0-3.6 2.8-6.3 6.2-6.3 1.6 0 2.9.7 3.6 1.6h.1V6.6h2.6zm-2.5 5.9c0-2.3-1.5-3.9-3.4-3.9-1.9 0-3.4 1.6-3.4 3.9 0 2.3 1.5 3.9 3.4 3.9 1.9 0 3.4-1.6 3.4-3.9z"/>
            <path fill="#34A853" d="M60.4 2v16.7h-2.7V2h2.7z"/>
            <path fill="#EA4335" d="M69.8 14.5l2.2 1.4c-.7 1-2.4 2.8-5.4 2.8-4 0-6.3-3.1-6.3-6.2 0-3.8 2.8-6.2 6-6.2 3.7 0 5.4 2.7 5.7 4.1l.3.8-8.8 3.6c.7 1.3 1.7 2 3.2 2 1.5 0 2.5-.8 3.1-1.7zm-4.6-2.2l5.8-2.4c-.3-.8-1.3-1.4-2.3-1.4-1.4 0-3.3 1.2-3.5 3.8z"/>
          </svg>
        </div>

        <h1 className="google-chooser-title">Chọn một tài khoản</h1>
        <p className="google-chooser-subtitle">
          để tiếp tục tới <strong>VJU PORTAL</strong>
        </p>

        {!showCustomInput ? (
          <>
            {/* Account List */}
            <div className="google-accounts-container">
              {REGISTERED_STUDENTS.map((acc) => (
                <div
                  key={acc.email}
                  className="google-account-row"
                  onClick={() => handleSelectAccount(acc.email)}
                >
                  <div
                    className="google-avatar-circle"
                    style={{ backgroundColor: acc.color }}
                  >
                    {acc.avatar}
                  </div>
                  <div className="google-account-details">
                    <span className="google-acc-name">{acc.name}</span>
                    <span className="google-acc-email">{acc.email}</span>
                  </div>
                </div>
              ))}

              {/* Use another account */}
              <div
                className="google-account-row"
                onClick={() => setShowCustomInput(true)}
              >
                <div className="google-avatar-circle google-avatar-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5F6368" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div className="google-account-details">
                  <span className="google-acc-name" style={{ color: '#1A73E8', fontWeight: 500 }}>
                    Sử dụng một tài khoản khác
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <form className="google-custom-form" onSubmit={handleCustomSubmit}>
            <div className="google-input-group">
              <input
                type="email"
                className="google-text-input"
                placeholder="Email hoặc số điện thoại"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="google-form-actions">
              <button
                type="button"
                className="google-back-btn"
                onClick={() => setShowCustomInput(false)}
              >
                Quay lại
              </button>
              <button
                type="submit"
                className="google-next-btn"
              >
                Tiếp theo
              </button>
            </div>
          </form>
        )}

        <div className="google-chooser-notice">
          Để tiếp tục, Google sẽ chia sẻ tên, địa chỉ email, tùy chọn ngôn ngữ và ảnh hồ sơ của bạn với VJU Portal.
        </div>
      </div>

      {/* Google Footer */}
      <div className="google-chooser-footer">
        <div className="google-footer-left">Tiếng Việt</div>
        <div className="google-footer-right">
          <a href="#help" onClick={(e) => e.preventDefault()}>Trợ giúp</a>
          <a href="#privacy" onClick={(e) => e.preventDefault()}>Bảo mật</a>
          <a href="#terms" onClick={(e) => e.preventDefault()}>Điều khoản</a>
        </div>
      </div>
    </div>
  );
}

export default GoogleChooserPage;
