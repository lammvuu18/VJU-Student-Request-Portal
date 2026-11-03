import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi, ROLE_ACCOUNTS } from '../../services/api';

function GoogleCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [statusText, setStatusText] = useState('Đang kết nối xác thực tài khoản Google với máy chủ VJU...');

  useEffect(() => {
    const processAuth = async () => {
      try {
        // 1. Lấy token hoặc email từ hash (#id_token=...&access_token=...) hoặc query param (?email=... hoặc ?token=...)
        let idToken = null;
        let email = null;

        if (location.hash) {
          const hashParams = new URLSearchParams(location.hash.substring(1));
          idToken = hashParams.get('id_token') || hashParams.get('access_token');
        }

        const queryParams = new URLSearchParams(location.search);
        email = queryParams.get('email');
        if (!idToken) {
          idToken = queryParams.get('token') || queryParams.get('id_token') || email;
        }

        if (!idToken && !email) {
          navigate('/login', { state: { error: 'Không nhận được thông tin xác thực từ Google.' } });
          return;
        }

        setStatusText('Đang kiểm tra tài khoản trong danh mục sinh viên VJU...');

        // 2. Gửi token / email lên Backend API: POST /api/auth/google
        const res = await authApi.loginGoogle(idToken, email);
        if (res && res.data && res.data.user) {
          const user = res.data.user;
          const redirectUrl = user.redirect_url || (ROLE_ACCOUNTS[user.role]?.homePath) || '/student/dashboard';
          navigate(redirectUrl, { replace: true });
        } else {
          navigate('/login', { state: { error: 'Phản hồi từ máy chủ không hợp lệ.' } });
        }
      } catch (err) {
        console.error('Lỗi callback Google:', err);
        const errMsg = err.message || 'Email của bạn không có trong danh sách được phép đăng nhập.';
        navigate('/login', { state: { error: errMsg } });
      }
    };

    processAuth();
  }, [location, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F8F9FA',
      fontFamily: 'Inter, sans-serif',
      padding: 20
    }}>
      <div style={{
        background: '#FFFFFF',
        padding: '36px 48px',
        borderRadius: 16,
        boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
        textAlign: 'center',
        maxWidth: 420,
        width: '100%'
      }}>
        {/* Google Animated Spinner */}
        <div style={{
          width: 44,
          height: 44,
          border: '4px solid #E5E7EB',
          borderTopColor: '#AA2327',
          borderRadius: '50%',
          margin: '0 auto 20px',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1F2937', marginBottom: 8 }}>
          Đang xác thực Google
        </h3>
        <p style={{ fontSize: 13, color: '#68717D', lineHeight: 1.5, margin: 0 }}>
          {statusText}
        </p>
      </div>
    </div>
  );
}

export default GoogleCallback;
