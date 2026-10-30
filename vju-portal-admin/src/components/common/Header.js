import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import Button from './Button';
import { users } from '../../data/mockData';
import './Header.css';

const initialNotifications = [
  {
    id: 1,
    title: 'Hồ sơ đã được phê duyệt',
    desc: 'Hồ sơ REQ-20261030-001 (Giấy xác nhận sinh viên) đã được Hiệu trưởng ký số thành công.',
    time: '10 phút trước',
    unread: true,
    type: 'success',
    icon: '✅',
    target_url: '/student/request/REQ-20261030-001',
  },
  {
    id: 2,
    title: 'Phân công xử lý hồ sơ mới',
    desc: 'Hồ sơ REQ-20261030-002 đã được phân công cho bạn xử lý thẩm định.',
    time: '45 phút trước',
    unread: true,
    type: 'info',
    icon: '📋',
    target_url: '/staff/request/REQ-20261030-002',
  },
  {
    id: 3,
    title: 'Yêu cầu cần bổ sung minh chứng',
    desc: 'Hồ sơ REQ-20261030-003 cần bổ sung giấy tiếp nhận từ đơn vị thực tập có đóng dấu.',
    time: '2 giờ trước',
    unread: true,
    type: 'warning',
    icon: '⚠️',
    target_url: '/student/request/REQ-20261030-003',
  },
  {
    id: 4,
    title: 'Cập nhật danh mục thủ tục',
    desc: 'Thủ tục "Phúc khảo điểm thi" đã được cấu hình biểu mẫu và kích hoạt trực tuyến.',
    time: 'Hôm qua',
    unread: false,
    type: 'system',
    icon: '📢',
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

  // Determine active profile info
  let profile = users.admin;
  if (userName.includes('Minh Anh') || userName.toLowerCase().includes('sinh viên')) {
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
              width="36"
              height="36"
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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8B1D24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && <span className="notif-dot" style={{ backgroundColor: '#8B1D24' }}></span>}
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
                    <div className={`notif-icon-box ${n.type}`}>
                      {n.icon}
                    </div>
                    <div className="notif-content">
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
                  Xem tất cả thông báo →
                </button>
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
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/admin');
                  }}
                >
                  <span className="user-menu-icon">⚙️</span>
                  <span>Quản trị (Admin)</span>
                  <span className="user-role-badge">Admin</span>
                </button>

                <button
                  type="button"
                  className="user-menu-item"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/student');
                  }}
                >
                  <span className="user-menu-icon">🧑‍🎓</span>
                  <span>Sinh viên</span>
                </button>

                <button
                  type="button"
                  className="user-menu-item"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/dept-head');
                  }}
                >
                  <span className="user-menu-icon">👔</span>
                  <span>Trưởng phòng</span>
                </button>

                <button
                  type="button"
                  className="user-menu-item"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/staff');
                  }}
                >
                  <span className="user-menu-icon">💼</span>
                  <span>Chuyên viên</span>
                </button>

                <button
                  type="button"
                  className="user-menu-item"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/principal');
                  }}
                >
                  <span className="user-menu-icon">🎓</span>
                  <span>Hiệu trưởng</span>
                </button>

                <div className="user-menu-divider" />

                <button
                  type="button"
                  className="user-menu-item danger"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/login');
                  }}
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
