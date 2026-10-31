import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import Button from './Button';
import { users } from '../../data/mockData';
import { getSavedUser, authApi, setAuthToken } from '../../services/api';
import './Header.css';

const initialNotifications = [
  {
    id: 1,
    title: 'Hồ sơ đã được phê duyệt',
    desc: 'Hồ sơ REQ-20261030-001 (Giấy xác nhận sinh viên) đã được ký số thành công.',
    time: '10 phút trước',
    unread: true,
    type: 'success',
    target_url: '/student/request/REQ-20261030-001',
  },
  {
    id: 2,
    title: 'Phân công xử lý hồ sơ mới',
    desc: 'Hồ sơ REQ-20261030-002 đã được phân công cho bạn xử lý thẩm định.',
    time: '45 phút trước',
    unread: true,
    type: 'info',
    target_url: '/staff/request/REQ-20261030-002',
  },
  {
    id: 3,
    title: 'Yêu cầu cần bổ sung minh chứng',
    desc: 'Hồ sơ REQ-20261030-003 cần bổ sung giấy tiếp nhận từ đơn vị thực tập.',
    time: '2 giờ trước',
    unread: true,
    type: 'warning',
    target_url: '/student/request/REQ-20261030-003',
  },
  {
    id: 4,
    title: 'Cập nhật danh mục thủ tục',
    desc: 'Thủ tục "Phúc khảo điểm thi" đã được kích hoạt trực tuyến.',
    time: 'Hôm qua',
    unread: false,
    type: 'system',
    target_url: '/student/procedures',
  },
];

function Header({ userName = 'User' }) {
  const navigate = useNavigate();
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Password modal states
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  // Close dropdowns on outside click without requiring a blocking full-screen overlay
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotif(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Determine active profile info from logged-in session or fallback
  const savedUser = getSavedUser();
  let profile = users.admin;

  if (savedUser) {
    const roleMap = {
      student: 'Sinh viên',
      dept_head: `Trưởng phòng ${savedUser.department_name || ''}`,
      staff: `Chuyên viên ${savedUser.department_name || ''}`,
      principal: 'Hiệu trưởng',
      admin: 'Quản trị viên Hệ thống',
    };
    profile = {
      name: savedUser.full_name || savedUser.name || userName,
      email: savedUser.email,
      role: roleMap[savedUser.role] || 'Người dùng',
      department: savedUser.department_name || '',
      phone: savedUser.phone || '',
    };
  } else if (userName.includes('Minh Anh') || userName.toLowerCase().includes('sinh viên')) {
    profile = { ...users.student, role: 'Sinh viên' };
  } else if (userName.includes('Thu Hà') || userName.toLowerCase().includes('trưởng phòng')) {
    profile = { ...users.deptHead, role: 'Trưởng phòng Đào tạo' };
  } else if (userName.includes('Hoàng Nam') || userName.toLowerCase().includes('chuyên viên')) {
    profile = { ...users.staff, role: 'Chuyên viên Đào tạo' };
  } else if (userName.includes('Bình') || userName.toLowerCase().includes('hiệu trưởng')) {
    profile = { ...users.principal, role: 'Hiệu trưởng' };
  } else {
    profile = {
      name: userName,
      email: 'admin@vju.ac.vn',
      role: 'Quản trị viên Hệ thống',
      department: 'Trung tâm CNTT & Quản trị mạng',
      phone: '024 7306 6001',
    };
  }

  const initials = profile.name
    ? profile.name.split(' ').map(w => w[0]).filter(Boolean).slice(-2).join('').toUpperCase()
    : 'U';

  const unreadCount = notifications.filter(n => n.unread).length;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    showToast('Đã đánh dấu tất cả thông báo là đã đọc');
  };

  const handleNotificationClick = (id) => {
    const item = notifications.find(n => n.id === id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
    if (item && item.target_url) {
      setShowNotif(false);
      navigate(item.target_url);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      alert('Mật khẩu mới và xác nhận mật khẩu không khớp.');
      return;
    }
    setIsPasswordModalOpen(false);
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    showToast('Đổi mật khẩu thành công.');
  };

  // Xử lý đăng xuất tài khoản và điều hướng về màn hình đăng nhập
  const handleLogout = async () => {
    setShowUserMenu(false);
    try {
      await authApi.logout();
    } catch (e) {
      console.warn('Lỗi khi gọi logout API:', e);
    }
    setAuthToken(null);
    localStorage.removeItem('vju_token');
    localStorage.removeItem('vju_user');
    localStorage.removeItem('vju_role');
    sessionStorage.clear();
    window.location.href = '/login';
  };

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <div className="header-logo" onClick={() => navigate('/')}>
            <img
              src="/vju-logo.png"
              alt="VJU Logo"
              width="36"
              height="36"
              style={{ objectFit: 'contain', flexShrink: 0 }}
            />
            <span className="header-title">VJU PORTAL</span>
          </div>
        </div>

        <div className="header-right">
          {/* Notification Button */}
          <div className="header-notif-container" ref={notifRef} style={{ position: 'relative' }}>
            <button
              className={`header-icon-btn ${showNotif ? 'active' : ''}`}
              aria-label="Thông báo"
              onClick={() => {
                setShowNotif(!showNotif);
                setShowUserMenu(false);
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8B1D24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unreadCount > 0 && <span className="notif-dot" style={{ backgroundColor: '#8B1D24' }}></span>}
            </button>

            {/* Notification Dropdown */}
            {showNotif && (
              <div className="dropdown-menu-wrapper notif-dropdown">
                <div className="notif-header">
                  <div className="notif-title">
                    <span>Thông báo</span>
                    {unreadCount > 0 && <span className="notif-count-badge">{unreadCount} mới</span>}
                  </div>
                  {unreadCount > 0 && (
                    <button type="button" className="notif-mark-read" onClick={handleMarkAllRead}>
                      Đánh dấu đã đọc
                    </button>
                  )}
                </div>

                <div className="notif-list">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`notif-item ${n.unread ? 'unread' : ''}`}
                      onClick={() => handleNotificationClick(n.id)}
                    >
                      <div className="notif-content" style={{ paddingLeft: 4 }}>
                        <div className="notif-item-title">{n.title}</div>
                        <div className="notif-item-desc">{n.desc}</div>
                        <div className="notif-item-time">{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="notif-footer">
                  <button
                    type="button"
                    className="notif-footer-btn"
                    onClick={() => {
                      setShowNotif(false);
                      showToast('Đang mở trang trung tâm thông báo');
                    }}
                  >
                    Xem tất cả thông báo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Button */}
          <div className="header-user-container" ref={userMenuRef} style={{ position: 'relative' }}>
            <div
              className={`header-user ${showUserMenu ? 'active' : ''}`}
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotif(false);
              }}
            >
              <div className="header-avatar-circle user-avatar-outline">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8B1D24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M18 19a6 6 0 0 0-12 0" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <span className="header-user-name">{profile.name}</span>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                <path d="M1 1L5 5L9 1" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <div className="dropdown-menu-wrapper user-dropdown">
                <div className="user-profile-summary">
                  <div className="user-summary-avatar">{initials}</div>
                  <div>
                    <div className="user-summary-name">{profile.name}</div>
                    <div className="user-summary-role">{profile.role || 'Người dùng'}</div>
                  </div>
                </div>

                <div className="user-menu-list">
                  <button
                    type="button"
                    className="user-menu-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      setIsProfileModalOpen(true);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 10 }}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>Xem hồ sơ cá nhân</span>
                  </button>

                  <button
                    type="button"
                    className="user-menu-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      setIsPasswordModalOpen(true);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 10 }}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <span>Đổi mật khẩu</span>
                  </button>

                  <div className="user-menu-divider" />

                  <button
                    type="button"
                    className="user-menu-item danger"
                    onClick={handleLogout}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 10 }}>
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          backgroundColor: '#065F46',
          color: '#FFF',
          borderRadius: 8,
          padding: '12px 20px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 14,
        }}>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Profile Modal */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="Thông tin tài khoản"
        footer={<Button variant="outline" onClick={() => setIsProfileModalOpen(false)}>Đóng</Button>}
      >
        <div className="profile-details-grid">
          <div className="profile-detail-row">
            <span className="profile-detail-label">Họ và tên:</span>
            <span className="profile-detail-value">{profile.name}</span>
          </div>
          <div className="profile-detail-row">
            <span className="profile-detail-label">Email:</span>
            <span className="profile-detail-value">{profile.email}</span>
          </div>
          <div className="profile-detail-row">
            <span className="profile-detail-label">Vai trò:</span>
            <span className="profile-detail-value">{profile.role}</span>
          </div>
          {profile.department && (
            <div className="profile-detail-row">
              <span className="profile-detail-label">Đơn vị / Phòng:</span>
              <span className="profile-detail-value">{profile.department}</span>
            </div>
          )}
          {profile.phone && (
            <div className="profile-detail-row">
              <span className="profile-detail-label">Số điện thoại:</span>
              <span className="profile-detail-value">{profile.phone}</span>
            </div>
          )}
          {profile.mssv && (
            <div className="profile-detail-row">
              <span className="profile-detail-label">Mã sinh viên:</span>
              <span className="profile-detail-value">{profile.mssv}</span>
            </div>
          )}
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Đổi mật khẩu"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsPasswordModalOpen(false)}>Hủy</Button>
            <Button variant="primary" onClick={handlePasswordSubmit}>Lưu mật khẩu mới</Button>
          </>
        }
      >
        <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Mật khẩu hiện tại
            </label>
            <input
              type="password"
              className="vju-input"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              placeholder="Nhập mật khẩu hiện tại"
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Mật khẩu mới
            </label>
            <input
              type="password"
              className="vju-input"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Xác nhận mật khẩu mới
            </label>
            <input
              type="password"
              className="vju-input"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #CBD5E1' }}
            />
          </div>
        </form>
      </Modal>
    </>
  );
}

export default Header;
