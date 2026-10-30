import React from 'react';
import { departmentStatistics } from '../../data/mockData';
import './DeptHeadPages.css';

function DeptHeadStatistics() {
  const stats = departmentStatistics;

  return (
    <div className="depthead-statistics">
      <h1 className="page-title">Thống kê phòng</h1>
      <p className="page-subtitle">Phòng Đào tạo — Thống kê hoạt động</p>

      <div className="stat-cards" style={{ marginTop: 24 }}>
        <div className="stat-card stat-card--border-left" style={{ borderLeftColor: '#2563EB' }}>
          <span className="stat-card-label">Tổng yêu cầu tháng này</span>
          <span className="stat-card-value">28</span>
        </div>
        <div className="stat-card stat-card--border-left" style={{ borderLeftColor: '#059669' }}>
          <span className="stat-card-label">Đã xử lý</span>
          <span className="stat-card-value">15</span>
        </div>
        <div className="stat-card stat-card--border-left" style={{ borderLeftColor: '#D97706' }}>
          <span className="stat-card-label">Thời gian TB</span>
          <span className="stat-card-value">2.7 ngày</span>
        </div>
        <div className="stat-card stat-card--border-left" style={{ borderLeftColor: '#7C3AED' }}>
          <span className="stat-card-label">Tỷ lệ hoàn thành</span>
          <span className="stat-card-value">89%</span>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-body">
            <h3 className="section-title">Biểu đồ tiếp nhận & hoàn thành</h3>
            <div className="chart-bar-double">
              {stats.monthlyData.map((d, i) => (
                <div key={i} className="chart-bar-col-double">
                  <div className="chart-bar-pair">
                    <div className="chart-bar-received" style={{ height: `${(d.received / 40) * 140}px` }} title={`Tiếp nhận: ${d.received}`}></div>
                    <div className="chart-bar-completed" style={{ height: `${(d.completed / 40) * 140}px` }} title={`Hoàn thành: ${d.completed}`}></div>
                  </div>
                  <span className="chart-bar-label">{d.month}</span>
                </div>
              ))}
            </div>
            <div className="chart-legend">
              <span><i style={{ background: '#AA2327' }}></i> Tiếp nhận</span>
              <span><i style={{ background: '#059669' }}></i> Hoàn thành</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="section-title">Phân bổ theo loại</h3>
            {stats.byType.map((t, i) => (
              <div key={i} className="type-row">
                <div className="type-row-header">
                  <span className="type-name">{t.name}</span>
                  <span className="type-count">{t.count} ({t.percent}%)</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${t.percent}%`, background: ['#AA2327', '#2563EB', '#059669', '#D97706', '#7C3AED'][i] }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-body">
          <h3 className="section-title">Hiệu suất chuyên viên</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Chuyên viên</th>
                  <th>Được giao</th>
                  <th>Hoàn thành</th>
                  <th>TB ngày xử lý</th>
                  <th>Đánh giá</th>
                  <th>Tiến độ</th>
                </tr>
              </thead>
              <tbody>
                {stats.staffPerformance.map((sp, i) => (
                  <tr key={i}>
                    <td><strong>{sp.name}</strong></td>
                    <td>{sp.assigned}</td>
                    <td>{sp.completed}</td>
                    <td>{sp.avgDays} ngày</td>
                    <td>
                      <span style={{ color: '#FBBF24' }}>★</span> {sp.rating}
                    </td>
                    <td style={{ width: 150 }}>
                      <div className="progress-bar" style={{ margin: 0 }}>
                        <div className="progress-bar-fill" style={{ width: `${(sp.completed / sp.assigned) * 100}%`, background: '#059669' }}></div>
                      </div>
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

export default DeptHeadStatistics;
