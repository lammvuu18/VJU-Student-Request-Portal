import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setSavedRole, setAuthToken } from '../../services/api';
import './LoginPage.css';

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const selectRoleAndGo = (role, path) => {
    setSavedRole(role);
    setAuthToken(`mock-jwt-token-${role}-${Date.now()}`);
    navigate(path);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (email.includes('admin')) selectRoleAndGo('admin', '/admin');
    else if (email.includes('truongphong') || email.includes('thuha')) selectRoleAndGo('deptHead', '/dept-head');
    else if (email.includes('chuyenvien') || email.includes('hoangnam')) selectRoleAndGo('staff', '/staff');
    else if (email.includes('hieutruong') || email.includes('vanbinh')) selectRoleAndGo('principal', '/principal');
    else selectRoleAndGo('student', '/student');
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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8B1D24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </div>

          {/* Heading */}
          <h1 className="login-title">Chào mừng bạn trở lại</h1>

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
                  placeholder="Nhập mật khẩu"
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
              <a href="#forgot" className="forgot-password-link" onClick={(e) => { e.preventDefault(); alert('Vui lòng liên hệ Phòng Đào tạo / CTSV hoặc IT Support để cấp lại mật khẩu.'); }}>
                Forgot password?
              </a>
            </div>

            {/* Login Button */}
            <button type="submit" className="login-submit-btn">
              Đăng nhập
            </button>
          </form>

          {/* Divider */}
          <div className="login-divider">
            <span>or sign in with</span>
          </div>

          {/* Google Button */}
          <button
            type="button"
            className="google-sign-in-btn"
            onClick={() => selectRoleAndGo('student', '/student')}
            aria-label="Đăng nhập bằng Google"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
