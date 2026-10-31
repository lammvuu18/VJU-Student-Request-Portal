import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import './LoginPage.css';

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Xử lý đăng nhập bằng tài khoản và mật khẩu (cho Cán bộ, Giảng viên, Hiệu trưởng, Admin)
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.login(email.trim(), password);
      const user = res.data?.user;
      const redirectUrl = user?.redirect_url || (
        user?.role === 'student' ? '/student' :
        user?.role === 'dept_head' ? '/dept-head' :
        user?.role === 'staff' ? '/staff' :
        user?.role === 'principal' ? '/principal' :
        user?.role === 'admin' ? '/admin' : '/student'
      );
      navigate(redirectUrl);
    } catch (err) {
      setErrorMessage(err.message || 'Email hoặc mật khẩu không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý đăng nhập bằng Google (Sinh viên, Cán bộ, Hiệu trưởng, Admin)
  const handleGoogleLogin = async () => {
    setErrorMessage('');
    let targetEmail = email.trim();

    // Nếu ô email đang trống, yêu cầu nhập email Google VJU để đăng nhập
    if (!targetEmail) {
      targetEmail = window.prompt('Nhập email Google VJU (@st.vju.ac.vn hoặc @vju.ac.vn):', 'minhanh@st.vju.ac.vn');
      if (!targetEmail) return;
      targetEmail = targetEmail.trim();
      setEmail(targetEmail);
    }

    setLoading(true);
    try {
      const res = await authApi.loginGoogle(targetEmail, targetEmail);
      const user = res.data?.user;
      const redirectUrl = user?.redirect_url || (
        user?.role === 'student' ? '/student' :
        user?.role === 'dept_head' ? '/dept-head' :
        user?.role === 'staff' ? '/staff' :
        user?.role === 'principal' ? '/principal' :
        user?.role === 'admin' ? '/admin' : '/student'
      );
      navigate(redirectUrl);
    } catch (err) {
      setErrorMessage(err.message || 'Không thể đăng nhập bằng tài khoản Google này.');
    } finally {
      setLoading(false);
    }
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
          <span className="login-header-subtitle">Trường Đại học Việt Nhật — VNU</span>
        </div>
      </div>

      {/* Main Centered Content */}
      <div className="login-container">
        <div className="login-card">
          {/* Top Entrance Icon Badge */}
          <div className="login-icon-badge">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8B1D24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </div>

          {/* Heading */}
          <h1 className="login-title">Đăng nhập hệ thống</h1>
          <p className="login-subtitle-desc">
            Cổng tiếp nhận và xử lý giấy tờ cho sinh viên VJU
          </p>

          {/* Error Alert Box */}
          {errorMessage && (
            <div className="login-error-banner" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div className="login-error-text">{errorMessage}</div>
              <button
                type="button"
                className="login-error-close"
                onClick={() => setErrorMessage('')}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
          )}

          {/* Form */}
          <form className="login-form" onSubmit={handleLogin}>
            {/* Email Box */}
            <div className="input-box">
              <label className="input-label" htmlFor="email-input">EMAIL TÀI KHOẢN</label>
              <input
                id="email-input"
                className="input-control"
                type="email"
                placeholder="Nhập email (@vju.ac.vn hoặc @st.vju.ac.vn)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>

            {/* Password Box */}
            <div className="input-box">
              <label className="input-label" htmlFor="password-input">MẬT KHẨU (CÁN BỘ / ADMIN / HT)</label>
              <div className="password-input-wrapper">
                <input
                  id="password-input"
                  className="input-control"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Hiện mật khẩu"
                  tabIndex="-1"
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
              <a href="#forgot" className="forgot-password-link" onClick={(e) => { e.preventDefault(); alert('Vui lòng liên hệ Phòng Đào tạo / CTSV hoặc IT Support để cấp lại mật khẩu.'); }}>
                Quên mật khẩu?
              </a>
            </div>

            {/* Login Button */}
            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? 'Đang xác thực...' : 'Đăng nhập bằng Mật khẩu'}
            </button>
          </form>

          {/* Divider */}
          <div className="login-divider">
            <span>hoặc đăng nhập bằng Google</span>
          </div>

          {/* Google Button */}
          <button
            type="button"
            className="google-sign-in-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
            aria-label="Đăng nhập bằng Google"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="google-btn-text">Đăng nhập tài khoản Google VJU</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
