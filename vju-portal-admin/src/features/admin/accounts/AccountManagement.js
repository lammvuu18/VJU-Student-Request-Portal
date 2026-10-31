import React, { useState } from 'react';
import StudentTab from './StudentTab';
import StaffTab from './StaffTab';
import PrincipalTab from './PrincipalTab';
import './AccountManagement.css';

function AccountManagement() {
  const [activeTab, setActiveTab] = useState('staff'); // Active "Cán bộ" tab

  return (
    <div className="account-page-container">
      {/* Page Title */}
      <h1 className="account-page-title">Tài khoản và phân quyền</h1>

      {/* Pill Tab Switcher */}
      <div className="account-tabs-pill">
        <button
          type="button"
          className={`account-tab-item ${activeTab === 'student' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('student')}
        >
          Sinh viên
        </button>
        <button
          type="button"
          className={`account-tab-item ${activeTab === 'staff' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('staff')}
        >
          Cán bộ
        </button>
        <button
          type="button"
          className={`account-tab-item ${activeTab === 'principal' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('principal')}
        >
          Hiệu trưởng
        </button>
      </div>

      {/* Tab Content */}
      <div className="account-tab-content">
        {activeTab === 'student' && <StudentTab />}
        {activeTab === 'staff' && <StaffTab />}
        {activeTab === 'principal' && <PrincipalTab />}
      </div>
    </div>
  );
}

export default AccountManagement;