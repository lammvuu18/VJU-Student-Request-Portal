import React, { useState } from 'react';
import SegmentedTabs from '../common/SegmentedTabs';
import StudentTab from './StudentTab';
import StaffTab from './StaffTab';
import PrincipalTab from './PrincipalTab';
import './AccountManagement.css';

const tabs = [
  { key: 'student', label: 'Sinh viên' },
  { key: 'staff', label: 'Cán bộ' },
  { key: 'principal', label: 'Hiệu trưởng' },
];

function AccountManagement() {
  const [activeTab, setActiveTab] = useState('student');

  const renderTab = () => {
    switch (activeTab) {
      case 'student': return <StudentTab />;
      case 'staff': return <StaffTab />;
      case 'principal': return <PrincipalTab />;
      default: return <StudentTab />;
    }
  };

  return (
    <div className="account-page">
      <h1 className="page-title">Tài khoản và phân quyền</h1>

      <div className="account-tabs">
        <SegmentedTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <div className="account-card">
        {renderTab()}
      </div>
    </div>
  );
}

export default AccountManagement;
