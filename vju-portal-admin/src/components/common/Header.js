import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import Button from './Button';
import { users } from '../../data/mockData';
import { loginWithRole, logout, getCurrentUser, getSavedRole, ROLE_ACCOUNTS, normalizeRole } from '../../services/api';
import './Header.css';

const initialNotifications = [
  {
    id: 1,
    title: 'Thủ tục VJU2026-0842 đang chờ thanh toán',
    time: '2 tiếng trước',
    unread: true,
    type: 'payment',
    target_url: '/student/request/VJU-2026-0842',
  },
  {
    id: 2,
    title: 'Thủ tục VJU2026-0842 đang chờ bổ sung',
    time: '2 tiếng trước',
    unread: true,
    type: 'supplement',
    target_url: '/student/request/VJU-2026-0842',
  },
  {
    id: 3,
    title: 'Thủ tục VJU2026-0842 đang đã hoàn thành',
    time: '2 tiếng trước',
    unread: false,
    type: 'completed',
    target_url: '/student/request/VJU-2026-0842',
  },
  {
    id: 4,
    title: 'Thủ tục VJU2026-0842 đã được gửi và đang xử lý',
    time: '2 tiếng trước',
    unread: false,
    type: 'processing',
    target_url: '/student/request/VJU-2026-0842',
  },
  {
    id: 5,
    title: 'Thủ tục VJU2026-0842 đã bị từ chối',
    time: '2 tiếng trước',
    unread: false,
    type: 'rejected',
    target_url: '/student/request/VJU-2026-0842',
  },
];

function Header({ userName = 'User' }) {
  const navigate = useNavigate();
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [notifFilter, setNotifFilter] = useState('all');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Password modal states
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  // Determine active profile info
  const currentRole = normalizeRole(getSavedRole());
  const activeUser = getCurrentUser() || users[currentRole] || users.admin;
  let profile = {
    name: activeUser.full_name || activeUser.name || userName,
    email: activeUser.email || `${currentRole}@vju.ac.vn`,
    role: (ROLE_ACCOUNTS[currentRole] && ROLE_ACCOUNTS[currentRole].roleName) || 'Người dùng',
    department: activeUser.department_name || activeUser.department || '',
    phone: activeUser.phone || '',
  };

  const handleSwitchRole = (roleKey) => {
    setShowUserMenu(false);
    const acc = loginWithRole(roleKey);
    navigate(acc.homePath);
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
    navigate('/login');
  };

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

  const displayedNotifications = notifFilter === 'unread'
    ? notifications.filter(n => n.unread)
    : notifications;

  const renderNotifIcon = (n) => {
    if (n.type === 'payment') {
      return (
        <div className="notif-figma-icon-box" style={{ background: '#FBF3DC', borderRadius: 9 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9B7627" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        </div>
      );
    }
    if (n.type === 'supplement') {
      return (
        <div className="notif-figma-icon-box" style={{ background: '#FAEDE2', borderRadius: 9 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B17640" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
      );
    }
    if (n.type === 'completed') {
      return (
        <div className="notif-figma-icon-box" style={{ background: '#EAF3EC', borderRadius: 9 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#588268" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      );
    }
    if (n.type === 'processing') {
      return (
        <div className="notif-figma-icon-box" style={{ background: '#EAF1F5', borderRadius: 9 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A7F97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
      );
    }
    if (n.type === 'rejected') {
      return (
        <div className="notif-figma-icon-box" style={{ background: '#FCE8E8', borderRadius: 9999 }}>
          <span style={{ color: '#AA2327', fontSize: 15, fontWeight: 600, lineHeight: 1 }}>✕</span>
        </div>
      );
    }
    return null;
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      alert('Mật khẩu mới và xác nhận mật khẩu không khớp!');
      return;
    }
    setIsPasswordModalOpen(false);
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    showToast('Đổi mật khẩu thành công!');
  };

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <div className="header-logo" onClick={() => navigate('/')}>
            <img
              src="/vju-logo.png"
              alt="VJU Logo"
              width="52"
              height="52"
              style={{ objectFit: 'contain', flexShrink: 0 }}
            />
            <span className="header-title">VJU PORTAL</span>
          </div>
        </div>

        <div className="header-right">
          {/* Notification Button */}
          <button
            className={`header-icon-btn ${showNotif ? 'active' : ''}`}
            aria-label="Thông báo"
            onClick={() => {
              setShowNotif(!showNotif);
              setShowUserMenu(false);
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#AA2327" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && <span className="notif-dot"></span>}
          </button>

          {/* User Profile Button */}
          <div
            className={`header-user ${showUserMenu ? 'active' : ''}`}
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotif(false);
            }}
          >
            <div className="header-avatar-circle user-avatar-outline">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#AA2327" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M18 19a6 6 0 0 0-12 0" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <span className="header-user-name">{profile.name}</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
              <path d="M1 1L5 5L9 1" stroke="#202630" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Notification Dropdown */}
          {showNotif && (
            <div className="dropdown-menu-wrapper notif-dropdown">
              <div className="notif-figma-header">
                <span className="notif-figma-title">THÔNG BÁO</span>
              </div>

              <div className="notif-figma-tabs">
                <button
                  type="button"
                  className={`notif-tab-btn ${notifFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setNotifFilter('all')}
                >
                  Tất cả {notifications.length}
                </button>
                <button
                  type="button"
                  className={`notif-tab-btn ${notifFilter === 'unread' ? 'active' : ''}`}
                  onClick={() => setNotifFilter('unread')}
                >
                  Chưa đọc {unreadCount}
                </button>
              </div>

              <div className="notif-figma-list">
                {displayedNotifications.length === 0 ? (
                  <div className="notif-empty-state">Không có thông báo nào</div>
                ) : (
                  displayedNotifications.map((n) => (
                    <div
                      key={n.id}
                      className="notif-figma-item"
                      onClick={() => handleNotificationClick(n.id)}
                    >
                      {renderNotifIcon(n)}
                      <div className="notif-figma-item-content">
                        <div className="notif-figma-item-title">{n.title}</div>
                        <div className="notif-figma-item-time">{n.time}</div>
                      </div>
                      {n.unread && <div className="notif-figma-dot" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

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
                  <span className="user-menu-icon">👤</span>
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
                  <span className="user-menu-icon">🔒</span>
                  <span>Đổi mật khẩu</span>
                </button>

                <div className="user-menu-divider" />

                <div style={{ padding: '6px 16px 4px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>
                  Chuyển vai trò (Demo)
                </div>

                <button
                  type="button"
                  className="user-menu-item"
                  onClick={() => handleSwitchRole('admin')}
                >
                  <span className="user-menu-icon">⚙️</span>
                  <span>Quản trị (Admin)</span>
                  <span className="user-role-badge">Admin</span>
                </button>

                <button
                  type="button"
                  className="user-menu-item"
                  onClick={() => handleSwitchRole('student')}
                >
                  <span className="user-menu-icon">🧑‍🎓</span>
                  <span>Sinh viên</span>
                </button>

                <button
                  type="button"
                  className="user-menu-item"
                  onClick={() => handleSwitchRole('deptHead')}
                >
                  <span className="user-menu-icon">👔</span>
                  <span>Trưởng phòng</span>
                </button>

                <button
                  type="button"
                  className="user-menu-item"
                  onClick={() => handleSwitchRole('staff')}
                >
                  <span className="user-menu-icon">💼</span>
                  <span>Chuyên viên</span>
                </button>

                <button
                  type="button"
                  className="user-menu-item"
                  onClick={() => handleSwitchRole('principal')}
                >
                  <span className="user-menu-icon">🎓</span>
                  <span>Hiệu trưởng</span>
                </button>

                <div className="user-menu-divider" />

                <button
                  type="button"
                  className="user-menu-item danger"
                  onClick={handleLogout}
                >
                  <span className="user-menu-icon">🚪</span>
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Click Outside Overlay */}
      {(showNotif || showUserMenu) && (
        <div
          className="dropdown-overlay"
          onClick={() => {
            setShowNotif(false);
            setShowUserMenu(false);
          }}
        />
      )}

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
          fontSize: 14,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'fadeIn 0.3s ease'
        }}>
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Profile Detail Modal */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="Thông tin hồ sơ cá nhân"
        subtitle={`Chi tiết tài khoản của ${profile.name}`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: 16, background: '#F9FAFB', borderRadius: 10 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#EFF6FF',
            color: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 700,
            border: '2px solid #BFDBFE'
          }}>
            {initials}
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>{profile.name}</h3>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0 0' }}>{profile.role || 'Cán bộ VJU'}</p>
          </div>
        </div>

        <table className="info-table" style={{ width: '100%', marginBottom: 20 }}>
          <tbody>
            <tr>
              <th style={{ width: '35%' }}>Họ và tên</th>
              <td><strong>{profile.name}</strong></td>
            </tr>
            <tr>
              <th>Email</th>
              <td>{profile.email || 'admin@vju.ac.vn'}</td>
            </tr>
            {profile.mssv && (
              <tr>
                <th>Mã số sinh viên</th>
                <td>{profile.mssv}</td>
              </tr>
            )}
            {profile.lop && (
              <tr>
                <th>Lớp hành chính</th>
                <td>{profile.lop}</td>
              </tr>
            )}
            {profile.nganh && (
              <tr>
                <th>Ngành đào tạo</th>
                <td>{profile.nganh}</td>
              </tr>
            )}
            {profile.department && (
              <tr>
                <th>Phòng ban</th>
                <td>{profile.department}</td>
              </tr>
            )}
            <tr>
              <th>Số điện thoại</th>
              <td>{profile.phone || '024 7306 6001'}</td>
            </tr>
            <tr>
              <th>Trạng thái tài khoản</th>
              <td>
                <span style={{ color: '#059669', fontWeight: 600, background: '#ECFDF5', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                  ● Đang hoạt động
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="modal-footer">
          <Button variant="secondary" onClick={() => setIsProfileModalOpen(false)}>Đóng</Button>
          <Button variant="primary" onClick={() => {
            setIsProfileModalOpen(false);
            showToast('Đã lưu thông tin hồ sơ');
          }}>
            Chỉnh sửa thông tin
          </Button>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Đổi mật khẩu tài khoản"
        subtitle="Vui lòng nhập mật khẩu hiện tại và mật khẩu mới để bảo mật"
      >
        <form onSubmit={handlePasswordSubmit}>
          <div className="modal-field">
            <label>Mật khẩu hiện tại <span style={{ color: '#DC2626' }}>*</span></label>
            <input
              type="password"
              placeholder="Nhập mật khẩu hiện tại..."
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              required
            />
          </div>

          <div className="modal-field">
            <label>Mật khẩu mới <span style={{ color: '#DC2626' }}>*</span></label>
            <input
              type="password"
              placeholder="Tối thiểu 6 ký tự..."
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="modal-field">
            <label>Xác nhận mật khẩu mới <span style={{ color: '#DC2626' }}>*</span></label>
            <input
              type="password"
              placeholder="Nhập lại mật khẩu mới..."
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              required
            />
          </div>

          <div className="modal-footer" style={{ marginTop: 24 }}>
            <Button variant="secondary" type="button" onClick={() => setIsPasswordModalOpen(false)}>Hủy</Button>
            <Button variant="primary" type="submit">Cập nhật mật khẩu</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default Header;
