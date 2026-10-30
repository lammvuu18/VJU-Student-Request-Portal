import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import './AppLayout.css';

function AppLayout({ userName, sidebarItems, children }) {
  return (
    <div className="app-layout">
      <Header userName={userName} />
      <Sidebar items={sidebarItems} />
      <main className="app-main">
        {children || <Outlet />}
      </main>
    </div>
  );
}

export default AppLayout;
