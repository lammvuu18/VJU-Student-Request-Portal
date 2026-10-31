import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

function Sidebar({ items }) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <aside className="app-sidebar">
      <nav className="sidebar-nav">
        {items.map((item) => {
          let isActive = false;

          if (item.path === '/dept-head') {
            // "Tổng quan" Trưởng phòng chỉ active khi đúng ở /dept-head hoặc /dept-head/
            isActive = currentPath === '/dept-head' || currentPath === '/dept-head/';
          } else if (item.path === '/dept-head/requests') {
            // "Tất cả yêu cầu" active trên /dept-head/requests và /dept-head/request/*
            isActive = currentPath.startsWith('/dept-head/request');
          } else if (item.path === '/staff') {
            // "Tổng quan" Chuyên viên
            isActive = currentPath === '/staff' || currentPath === '/staff/';
          } else if (item.path === '/staff/requests') {
            // "Yêu cầu được giao" active trên /staff/requests và /staff/request/*
            isActive = currentPath.startsWith('/staff/request');
          } else if (item.path === '/student/dashboard') {
            isActive = currentPath === '/student/dashboard' || currentPath === '/student' || currentPath === '/student/';
          } else {
            isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="sidebar-active-indicator" />
              <span className="sidebar-link-text">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
