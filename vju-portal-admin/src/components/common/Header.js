import React from 'react';
import './Header.css';

function Header() {
  return (
    <header className="admin-header">
      <div className="header-left">
        <div className="header-logo">
          <div className="logo-circle">
            <svg viewBox="0 0 40 40" width="40" height="40">
              <circle cx="20" cy="20" r="18" fill="none" stroke="#AA2327" strokeWidth="2"/>
              <circle cx="20" cy="20" r="14" fill="none" stroke="#AA2327" strokeWidth="1.5"/>
              <text x="20" y="25" textAnchor="middle" fill="#AA2327" fontSize="11" fontWeight="700">VJU</text>
            </svg>
          </div>
          <span className="header-title">VJU PORTAL</span>
        </div>
      </div>
      <div className="header-right">
        <button className="header-icon-btn" aria-label="Thông báo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>
        <div className="header-user">
          <div className="header-avatar">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="17" stroke="#E2E5EA" strokeWidth="1.5"/>
              <circle cx="18" cy="14" r="5" fill="#9CA3AF"/>
              <path d="M8 30c0-5.523 4.477-10 10-10s10 4.477 10 10" fill="#9CA3AF"/>
            </svg>
          </div>
          <span className="header-user-name">Admin</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 5l3 3 3-3" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </header>
  );
}

export default Header;
