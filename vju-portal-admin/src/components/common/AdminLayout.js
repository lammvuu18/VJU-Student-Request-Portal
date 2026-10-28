import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import './AdminLayout.css';

function AdminLayout({ children }) {
  return (
    <div className="admin-layout">
      <Header />
      <Sidebar />
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
