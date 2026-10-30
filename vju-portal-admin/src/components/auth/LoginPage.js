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
      <div className="login-logo">
        <svg viewBox="0 0 60 60" width="60" height="60">
          <circle cx="30" cy="30" r="27" fill="none" stroke="#AA2327" strokeWidth="2.5"/>
          <circle cx="30" cy="30" r="21" fill="none" stroke="#AA2327" strokeWidth="2"/>
          <text x="30" y="37" textAnchor="middle" fill="#AA2327" fontSize="16" fontWeight="700">VJU</text>
        </svg>
        <span className="login-brand">VJU PORTAL</span>
      </div>

      <div className="login-card">
        <h1 className="login-title">Đăng nhập</h1>
        <p className="login-subtitle">Sử dụng tài khoản VJU của bạn</p>

        <form onSubmit={handleLogin}>
          <div className="login-field">
            <label>Email</label>
            <input
              type="email"
              placeholder="email@vju.ac.vn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          <div className="login-field">
            <label>Mật khẩu</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

          <div className="login-options">
            <label className="remember-me">
              <input type="checkbox" />
              <span>Ghi nhớ đăng nhập</span>
            </label>
            <a href="#forgot" className="forgot-link">Quên mật khẩu?</a>
          </div>

          <button type="submit" className="login-btn">Đăng nhập</button>
        </form>

        <div className="login-divider">
          <span>hoặc</span>
        </div>

        <button className="google-btn" onClick={() => selectRoleAndGo('student', '/student')}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Đăng nhập bằng Google
        </button>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #E5E7EB' }}>
          <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 10, textAlign: 'center', fontWeight: 500 }}>
            Truy cập nhanh theo vai trò (Demo Mode):
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              type="button"
              style={{
                padding: '8px 10px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid #D1D5DB',
                backgroundColor: '#F9FAFB',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              onClick={() => selectRoleAndGo('student', '/student')}
            >
              🧑‍🎓 Sinh viên
            </button>
            <button
              type="button"
              style={{
                padding: '8px 10px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid #D1D5DB',
                backgroundColor: '#F9FAFB',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              onClick={() => selectRoleAndGo('admin', '/admin')}
            >
              ⚙️ Quản trị (Admin)
            </button>
            <button
              type="button"
              style={{
                padding: '8px 10px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid #D1D5DB',
                backgroundColor: '#F9FAFB',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              onClick={() => selectRoleAndGo('deptHead', '/dept-head')}
            >
              👔 Trưởng phòng
            </button>
            <button
              type="button"
              style={{
                padding: '8px 10px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid #D1D5DB',
                backgroundColor: '#F9FAFB',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              onClick={() => selectRoleAndGo('staff', '/staff')}
            >
              💼 Chuyên viên
            </button>
            <button
              type="button"
              style={{
                padding: '8px 10px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid #D1D5DB',
                backgroundColor: '#F9FAFB',
                cursor: 'pointer',
                textAlign: 'left',
                gridColumn: 'span 2'
              }}
              onClick={() => selectRoleAndGo('principal', '/principal')}
            >
              🎓 Ban Giám hiệu (Hiệu trưởng)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
