import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import Header from '../common/Header';
import './AdminLayout.css';

function AdminLayout({ children }) {
  return (
    <div className="admin-layout">
      <Header userName="Admin" />
      <aside className="admin-sidebar">
        <nav className="admin-sidebar-nav">
          <NavLink
            to="/admin/procedures"
            className={({ isActive }) => `admin-sidebar-link ${isActive ? 'active' : ''}`}
          >
            {({ isActive }) => (
              <>
                {isActive && <div className="admin-sidebar-indicator" />}
                <span style={{ flex: '1 1 0' }}>Quản lý thủ tục</span>
              </>
            )}
          </NavLink>
          <NavLink
            to="/admin/accounts"
            className={({ isActive }) => `admin-sidebar-link ${isActive ? 'active' : ''}`}
          >
            {({ isActive }) => (
              <>
                {isActive && <div className="admin-sidebar-indicator" />}
                <span style={{ flex: '1 1 0' }}>Tài khoản &amp; phân quyền</span>
              </>
            )}
          </NavLink>
        </nav>
      </aside>
      <main className="admin-main">
        {children || <Outlet />}
      </main>
    </div>
  );
}

export default AdminLayout;
