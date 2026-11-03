import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { users } from '../../data/mockData';
import api, { logout, getCurrentUser, getSavedRole, normalizeRole, USE_MOCK } from '../../services/api';
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

// Đường dẫn chi tiết đơn theo vai trò đang đăng nhập
const requestPathForRole = (requestId) => {
  const role = normalizeRole(getSavedRole());
  if (role === 'staff') return `/staff/request/${requestId}`;
  if (role === 'deptHead') return `/dept-head/request/${requestId}`;
  return `/student/request/${requestId}`;
};

const mapBackendNotification = (item) => {
  const title = item.title || '';
  const msg = item.message || '';
  const combined = (title + ' ' + msg).toLowerCase();

  let type = 'processing';
  if (combined.includes('thanh toán') || combined.includes('học phí') || combined.includes('tiền')) {
    type = 'payment';
  } else if (combined.includes('bổ sung')) {
    type = 'supplement';
  } else if (combined.includes('hoàn thành') || combined.includes('đã duyệt') || combined.includes('thành công')) {
    type = 'completed';
  } else if (combined.includes('từ chối')) {
    type = 'rejected';
  }

  let timeDisplay = 'Vừa xong';
  if (item.sent_at) {
    try {
      const d = new Date(item.sent_at);
      timeDisplay = d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    } catch (e) {}
  }

  return {
    id: item.notification_id,
    title: item.title,
    time: timeDisplay,
    unread: !item.is_read,
    type,
    target_url: item.request_id ? requestPathForRole(item.request_id) : null,
  };
};

function Header({ userName = 'User' }) {
  const navigate = useNavigate();
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState(USE_MOCK ? initialNotifications : []);
  const [notifFilter, setNotifFilter] = useState('all');
  const [toastMessage, setToastMessage] = useState('');

  // Đồng bộ danh sách thông báo từ Backend API
  const fetchNotifications = async () => {
    try {
      const res = await api.notifications.getAll();
      if (res && Array.isArray(res.data)) {
        setNotifications(res.data.map(mapBackendNotification));
      }
    } catch (err) {
      console.warn('Không tải được thông báo:', err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Determine active profile info
  const currentRole = normalizeRole(getSavedRole());
  const activeUser = getCurrentUser() || users[currentRole] || users.admin;
  const profileName = activeUser.full_name || activeUser.name || userName;

  const handleLogout = () => {
    setShowUserMenu(false);
    // Gửi yêu cầu thu hồi token (đã đọc token trước khi xóa) nhưng không chờ,
    // để người dùng về ngay màn hình đăng nhập kể cả khi backend đang khởi động
    api.auth.logout().catch(() => {});
    logout();
    navigate('/login', { replace: true });
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    try {
      await api.notifications.markAllAsRead();
    } catch (e) {}
    showToast('Đã đánh dấu tất cả thông báo là đã đọc');
  };

  const handleNotificationClick = async (id) => {
    const item = notifications.find(n => n.id === id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
    try {
      await api.notifications.markAsRead(id);
    } catch (e) {}
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
            <span className="header-user-name">{profileName}</span>
            <svg className="header-user-chevron" width="12" height="7" viewBox="0 0 10 6" fill="none">
              <path d="M1 1L5 5L9 1" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Dropdown Overlay (click outside to close) */}
          {(showNotif || showUserMenu) && (
            <div
              className="dropdown-overlay"
              onClick={() => {
                setShowNotif(false);
                setShowUserMenu(false);
              }}
            />
          )}

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

          {/* User Menu Dropdown: chỉ còn Đăng xuất */}
          {showUserMenu && (
            <div className="dropdown-menu-wrapper user-dropdown">
              <button
                type="button"
                className="user-menu-logout"
                onClick={handleLogout}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
                  <line x1="10" y1="12" x2="20" y2="12" />
                  <polyline points="16 8 20 12 16 16" />
                </svg>
                <span>Đăng xuất</span>
              </button>
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

    </>
  );
}

export default Header;
