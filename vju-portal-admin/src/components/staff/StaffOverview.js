import React from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../common/Badge';
import { staffStats, statusConfig } from '../../data/mockData';
import './StaffPages.css';

function StaffOverview() {
  const navigate = useNavigate();

  const statCards = [
    { label: 'Được giao', value: staffStats.assigned, color: '#2563EB', icon: '📋' },
    { label: 'Đang xử lý', value: staffStats.processing, color: '#D97706', icon: '⏳' },
    { label: 'Hoàn thành', value: staffStats.completed, color: '#059669', icon: '✅' },
    { label: 'Quá hạn', value: staffStats.overdue, color: '#DC2626', icon: '⚠️' },
  ];

  return (
    <div className="staff-overview">
      <h1 className="page-title">Tổng quan công việc</h1>
      <p className="page-subtitle">Chuyên viên — Lê Hoàng Nam</p>

      <div className="stat-cards">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card stat-card--border-left" style={{ borderLeftColor: s.color }}>
            <span className="stat-card-label">{s.label}</span>
            <span className="stat-card-value">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-body">
          <div className="card-header-row">
            <h3 className="section-title">Sắp đến hạn</h3>
            <Badge label={`${staffStats.deadlines.length} yêu cầu`} color="#D97706" bg="#FFFBEB" />
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Mã YC</th>
                  <th>Sinh viên</th>
                  <th>Thủ tục</th>
                  <th>Hạn chót</th>
                  <th>Còn lại</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {staffStats.deadlines.map((d) => (
                  <tr key={d.id}>
                    <td><strong>{d.id}</strong></td>
                    <td>{d.student}</td>
                    <td>{d.procedure}</td>
                    <td>{d.deadline}</td>
                    <td>
                      <span style={{ color: d.daysLeft <= 0 ? '#DC2626' : d.daysLeft <= 2 ? '#D97706' : '#059669', fontWeight: 600 }}>
                        {d.daysLeft <= 0 ? `Quá ${Math.abs(d.daysLeft)} ngày` : `${d.daysLeft} ngày`}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn--link btn--sm" onClick={() => navigate(`/staff/request/${d.id}`)}>
                        Xử lý →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StaffOverview;
