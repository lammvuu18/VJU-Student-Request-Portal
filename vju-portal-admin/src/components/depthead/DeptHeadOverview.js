import React from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../common/Badge';
import { deptStats, statusConfig } from '../../data/mockData';
import './DeptHeadPages.css';

function DeptHeadOverview() {
  const navigate = useNavigate();

  const statCards = [
    { label: 'Tổng yêu cầu', value: deptStats.total, color: '#2563EB' },
    { label: 'Chờ phân công', value: deptStats.pending, color: '#D97706' },
    { label: 'Đang xử lý', value: deptStats.processing, color: '#2563EB' },
    { label: 'Hoàn thành', value: deptStats.completed, color: '#059669' },
  ];

  return (
    <div className="depthead-overview">
      <h1 className="page-title">Tổng quan</h1>
      <p className="page-subtitle">Phòng Đào tạo — Tháng 10/2024</p>

      <div className="stat-cards">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card stat-card--border-left" style={{ borderLeftColor: s.color }}>
            <span className="stat-card-label">{s.label}</span>
            <span className="stat-card-value">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-body">
            <h3 className="section-title">Biểu đồ yêu cầu theo tháng</h3>
            <div className="chart-bar-simple">
              {[
                { m: 'T5', v: 25 }, { m: 'T6', v: 30 }, { m: 'T7', v: 18 },
                { m: 'T8', v: 35 }, { m: 'T9', v: 40 }, { m: 'T10', v: 28 },
              ].map((d, i) => (
                <div key={i} className="chart-bar-col">
                  <div className="chart-bar" style={{ height: `${(d.v / 40) * 160}px` }}>
                    <span className="chart-bar-val">{d.v}</span>
                  </div>
                  <span className="chart-bar-label">{d.m}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="card-header-row">
              <h3 className="section-title">Yêu cầu quá hạn</h3>
              <Badge label={`${deptStats.overdue.length} yêu cầu`} color="#DC2626" bg="#FEF2F2" />
            </div>
            <table>
              <thead>
                <tr>
                  <th>Mã YC</th>
                  <th>Sinh viên</th>
                  <th>Quá hạn</th>
                  <th>Phụ trách</th>
                </tr>
              </thead>
              <tbody>
                {deptStats.overdue.map((o) => (
                  <tr key={o.id} className="clickable-row" onClick={() => navigate(`/dept-head/request/${o.id}`)}>
                    <td><strong>{o.id}</strong></td>
                    <td>{o.student}</td>
                    <td><span style={{ color: '#DC2626', fontWeight: 600 }}>{o.daysOverdue} ngày</span></td>
                    <td>{o.assignee}</td>
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

export default DeptHeadOverview;
