import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, loginWithRole, findAccountByEmail, ROLE_ACCOUNTS } from '../../services/api';
import './LoginPage.css';

// Danh sách sinh viên mẫu đã đăng ký trước trong Database (StudentRegistry)
const SAMPLE_STUDENTS = [
  {
    name: 'Nguyễn Minh Anh',
    mssv: '21CS001',
    email: 'minhanh@st.vju.ac.vn',
    dept: 'Khóa K2021 - CNTT',
  },
  {
    name: 'Sinh viên mẫu 01',
    mssv: 'SEED0001',
    email: 'student01@st.vju.ac.vn',
    dept: 'Khóa K2021',
  },
  {
    name: 'Trần Quốc Anh',
    mssv: '21CS002',
    email: 'quocanh@st.vju.ac.vn',
    dept: 'Khóa K2021 - CNTT',
  },
  {
    name: 'Lê Xuân Hậu',
    mssv: '21CS003',
    email: 'xuanhau@st.vju.ac.vn',
    dept: 'Khóa K2021 - CNTT',
  },
];

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');

  // 1. Đăng nhập Email + Mật khẩu (Dành cho Cán bộ / Giảng viên / Admin)
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Vui lòng nhập email.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      // Thử gọi API backend trước
      const res = await authApi.login(email.trim(), password);
      if (res && res.data && res.data.user) {
        const redirectUrl = res.data.user.redirect_url || (ROLE_ACCOUNTS[res.data.user.role]?.homePath) || '/staff';
        navigate(redirectUrl);
        return;
      }
    } catch (err) {
      // Nếu là lỗi nghiệp vụ từ backend (sai mật khẩu, sinh viên cố đăng nhập mật khẩu,...)
      if (err.status) {
        setErrorMsg(err.message || 'Đăng nhập không thành công.');
        setLoading(false);
        return;
      }
      // Nếu backend chưa chạy, fallback sang mock login theo role
      console.warn('Backend not reachable, falling back to mock login:', err.message);
    }

    // Fallback mock nếu backend offline
    const matchedAccount = findAccountByEmail(email);
    if (matchedAccount) {
      const acc = loginWithRole(matchedAccount.role);
      navigate(acc.homePath);
    } else {
      const lower = email.toLowerCase();
      if (lower.includes('admin') || lower.includes('quantri')) {
        const acc = loginWithRole('admin');
        navigate(acc.homePath);
      } else if (lower.includes('truongphong') || lower.includes('thuha') || lower.includes('depthead') || lower.includes('ha.tt')) {
        const acc = loginWithRole('deptHead');
        navigate(acc.homePath);
      } else if (lower.includes('chuyenvien') || lower.includes('hoangnam') || lower.includes('staff') || lower.includes('nam.lh')) {
        const acc = loginWithRole('staff');
        navigate(acc.homePath);
      } else if (lower.includes('hieutruong') || lower.includes('vanbinh') || lower.includes('principal') || lower.includes('binh.nv')) {
        const acc = loginWithRole('principal');
        navigate(acc.homePath);
      } else {
        const acc = loginWithRole('student');
        navigate(acc.homePath);
      }
    }
    setLoading(false);
  };

  // 2. Đăng nhập Google (Dành cho Sinh viên có trong StudentRegistry)
  const executeGoogleLogin = async (targetEmail) => {
    const cleanEmail = (targetEmail || '').trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Vui lòng nhập địa chỉ email Google.');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    setShowGoogleModal(false);

    try {
      // Gửi token/email lên API backend POST /api/auth/google
      const res = await authApi.loginGoogle(cleanEmail, cleanEmail);
      if (res && res.data && res.data.user) {
        const redirectUrl = res.data.user.redirect_url || '/student/dashboard';
        navigate(redirectUrl);
        return;
      }
    } catch (err) {
      // Backend phản hồi lỗi (ví dụ 403 EMAIL_NOT_REGISTERED)
      if (err.status) {
        setErrorMsg(err.message || 'Đăng nhập Google thất bại.');
        setLoading(false);
        return;
      }
      console.warn('Backend offline, using mock student login:', err.message);
    }

    // Fallback nếu backend offline
    const acc = loginWithRole('student');
    navigate(acc.homePath);
    setLoading(false);
  };

  return (
    <div className="login-page">
      {/* Top Left Brand Header */}
      <div className="login-header" onClick={() => navigate('/login')}>
        <img
          src="/vju-logo.png"
          alt="Vietnam Japan University"
          className="login-header-logo"
        />
        <div className="login-header-text">
          <span className="login-header-title">VJU PORTAL</span>
          <span className="login-header-subtitle">Trường Đại học Việt Nhật</span>
        </div>
      </div>

      {/* Main Centered Content */}
      <div className="login-container">
        <div className="login-card">
          {/* Top Entrance Icon Badge */}
          <div className="login-icon-badge">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#AA2327" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </div>

          {/* Heading */}
          <div className="login-title-box">
            <h1 className="login-title">Chào mừng bạn trở lại</h1>
          </div>

          {/* Error Alert Box */}
          {errorMsg && (
            <div className="login-error-alert" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form className="login-form" onSubmit={handleLogin}>
            {/* Email Box */}
            <div className="input-box">
              <label className="input-label" htmlFor="email-input">EMAIL</label>
              <input
                id="email-input"
                className="input-control"
                type="email"
                placeholder="Nhập email của bạn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </div>

            {/* Password Box */}
            <div className="input-box">
              <label className="input-label" htmlFor="password-input">MẬT KHẨU</label>
              <div className="password-input-wrapper">
                <input
                  id="password-input"
                  className="input-control"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu (dành cho cán bộ/quản trị)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Hiện mật khẩu"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="forgot-password-row">
              <a
                href="#forgot"
                className="forgot-password-link"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Vui lòng liên hệ Phòng Đào tạo / CTSV hoặc IT Support để cấp lại mật khẩu.');
                }}
              >
                Forgot password?
              </a>
            </div>

            {/* Login Button */}
            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? 'Đang xác thực...' : 'Đăng nhập'}
            </button>
          </form>

          {/* Divider */}
          <div className="login-divider">
            <div className="login-divider-line" />
            <span className="login-divider-text">hoặc đăng nhập bằng Google</span>
            <div className="login-divider-line" />
          </div>

          {/* Google Button */}
          <button
            type="button"
            className="google-sign-in-btn"
            onClick={() => setShowGoogleModal(true)}
            aria-label="Đăng nhập bằng Google"
            disabled={loading}
          >
            <svg width="22" height="22" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
              Đăng nhập bằng tài khoản Google VJU
            </span>
          </button>
        </div>
      </div>

      {/* Modal Chọn tài khoản Google (Dành cho Sinh viên VJU) */}
      {showGoogleModal && (
        <div className="google-modal-overlay" onClick={() => setShowGoogleModal(false)}>
          <div className="google-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="google-modal-head">
              <div className="google-modal-title">
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Đăng nhập Google Workspace VJU</span>
              </div>
              <button
                type="button"
                className="google-modal-close"
                onClick={() => setShowGoogleModal(false)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            <p className="google-modal-desc">
              Hệ thống sẽ đối chiếu email của bạn với <strong>Danh mục sinh viên (StudentRegistry)</strong> của trường. Vui lòng chọn tài khoản sinh viên đã đăng ký:
            </p>

            {/* Quick List sinh viên đã đăng ký trong DB */}
            <div className="google-quick-list">
              {SAMPLE_STUDENTS.map((st) => (
                <button
                  key={st.email}
                  type="button"
                  className="google-user-item"
                  onClick={() => executeGoogleLogin(st.email)}
                  disabled={loading}
                >
                  <div className="google-user-avatar">
                    {st.name.split(' ').pop()?.[0] || 'S'}
                  </div>
                  <div className="google-user-info">
                    <span className="google-user-name">{st.name} — {st.mssv}</span>
                    <span className="google-user-email">{st.email}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Hoặc nhập email để test trường hợp email không có trong danh sách */}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6, fontWeight: 500 }}>
                Hoặc nhập email khác để kiểm tra tính năng bảo mật:
              </div>
              <div className="google-custom-input-box">
                <input
                  type="email"
                  className="google-custom-input"
                  placeholder="vidu: email_chua_dang_ky@st.vju.ac.vn"
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      executeGoogleLogin(customGoogleEmail);
                    }
                  }}
                />
                <button
                  type="button"
                  className="google-submit-custom-btn"
                  onClick={() => executeGoogleLogin(customGoogleEmail)}
                  disabled={loading}
                >
                  Thử
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPage;
