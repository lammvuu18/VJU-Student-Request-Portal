import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../common/Badge';
import SegmentedTabs from '../common/SegmentedTabs';
import Pagination from '../common/Pagination';
import { decisions, statusConfig } from '../../data/mockData';
import './PrincipalPages.css';

const tabs = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ ký' },
  { key: 'signed', label: 'Đã ký' },
  { key: 'rejected', label: 'Từ chối' },
];

function PrincipalDecisionList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = activeTab === 'all'
    ? decisions
    : decisions.filter(d => d.status === activeTab);

  const counts = {
    pending: decisions.filter(d => d.status === 'pending').length,
    signed: decisions.filter(d => d.status === 'signed').length,
    rejected: decisions.filter(d => d.status === 'rejected').length,
  };

  return (
    <div className="principal-decisions">
      <h1 className="page-title">Quyết định</h1>
      <p className="page-subtitle">Danh sách quyết định chờ phê duyệt và ký</p>

      <div className="stat-cards">
        <div className="stat-card stat-card--border-left" style={{ borderLeftColor: '#D97706' }}>
          <span className="stat-card-label">Chờ ký</span>
          <span className="stat-card-value">{counts.pending}</span>
        </div>
        <div className="stat-card stat-card--border-left" style={{ borderLeftColor: '#059669' }}>
          <span className="stat-card-label">Đã ký</span>
          <span className="stat-card-value">{counts.signed}</span>
        </div>
        <div className="stat-card stat-card--border-left" style={{ borderLeftColor: '#DC2626' }}>
          <span className="stat-card-label">Từ chối</span>
          <span className="stat-card-value">{counts.rejected}</span>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <SegmentedTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="table-wrapper" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Mã QĐ</th>
                  <th>Tiêu đề</th>
                  <th>Sinh viên</th>
                  <th>Loại</th>
                  <th>Phòng ban</th>
                  <th>Ngày</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((dec) => {
                  const sc = statusConfig[dec.status] || statusConfig.pending;
                  return (
                    <tr key={dec.id}>
                      <td><strong>{dec.id}</strong></td>
                      <td>{dec.title}</td>
                      <td>{dec.student}</td>
                      <td>{dec.type}</td>
                      <td>{dec.department}</td>
                      <td>{dec.date}</td>
                      <td><Badge label={sc.label} color={sc.color} bg={sc.bg} /></td>
                      <td>
                        <button className="btn btn--link btn--sm" onClick={() => navigate(`/principal/decision/${dec.id}`)}>
                          {dec.status === 'pending' ? 'Xem & Ký →' : 'Xem →'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={currentPage} totalPages={1} onPageChange={setCurrentPage} />
        </div>
      </div>
    </div>
  );
}

export default PrincipalDecisionList;
