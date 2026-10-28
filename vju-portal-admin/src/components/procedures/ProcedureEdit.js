import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SegmentedTabs from '../common/SegmentedTabs';
import ProcedureConfig from './ProcedureConfig';
import FormDesigner from './FormDesigner';
import './ProcedureEdit.css';

const tabs = [
  { key: 'config', label: 'Cấu hình thủ tục' },
  { key: 'form', label: 'Thiết kế form' },
];

function ProcedureEdit() {
  const [activeTab, setActiveTab] = useState('config');
  const navigate = useNavigate();

  return (
    <div className="procedure-edit-page">
      <div className="procedure-edit-header">
        <h1 className="page-title">Chỉnh sửa thủ tục</h1>
        <div className="procedure-edit-links">
          {activeTab === 'form' && (
            <button className="link-btn">Xem trước biểu mẫu</button>
          )}
          <button className="link-btn" onClick={() => navigate('/procedures')}>
            ← Quản lý thủ tục
          </button>
        </div>
      </div>

      <div className="procedure-edit-tabs">
        <SegmentedTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <div className="procedure-edit-content">
        {activeTab === 'config' ? <ProcedureConfig /> : <FormDesigner />}
      </div>
    </div>
  );
}

export default ProcedureEdit;
