import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

function Sidebar() {
  return (
    <aside className="admin-sidebar">
      <nav className="sidebar-nav">
        <NavLink
          to="/procedures"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          Quản lý thủ tục
        </NavLink>
        <NavLink
          to="/accounts"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          Tài khoản & phân quyền
        </NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;
