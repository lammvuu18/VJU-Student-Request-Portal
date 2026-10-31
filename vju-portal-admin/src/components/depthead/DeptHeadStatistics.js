import React, { useState } from 'react';
import './DeptHeadPages.css';

// 5 Stat Cards Data (Figma Spec)
const statCards = [
  { num: '69', label: 'Tổng yêu cầu' },
  { num: '47', label: 'Hoàn thành' },
  { num: '12', label: 'Đang xử lý' },
  { num: '08', label: 'Chờ xử lý' },
  { num: '02', label: 'Đã hủy' },
];

// 12 Months Bar Chart Data (Figma Spec)
const monthlyBars = [
  { month: 'T1', height: 36, count: 12 },
  { month: 'T2', height: 45, count: 15 },
  { month: 'T3', height: 60, count: 20 },
  { month: 'T4', height: 54, count: 18 },
  { month: 'T5', height: 66, count: 22 },
  { month: 'T6', height: 105, count: 35 },
  { month: 'T7', height: 84, count: 28 },
  { month: 'T8', height: 120, count: 40 },
  { month: 'T9', height: 96, count: 32 },
  { month: 'T10', height: 54, count: 18 },
  { month: 'T11', height: 90, count: 30 },
  { month: 'T12', height: 72, count: 24 },
];

// Status Distribution Data (Figma Spec)
const distributionItems = [
  { label: 'Hoàn thành', percent: 68, color: '#168039' },
  { label: 'Đang xử lý', percent: 17, color: '#1D4ED8' },
  { label: 'Chờ xử lý', percent: 12, color: '#F59E0B' },
  { label: 'Đã hủy', percent: 3, color: '#6B7280' },
];

// Specialist Performance Data (Figma Spec + expanded list)
const specialistsData = [
  {
    name: 'Nguyễn Văn A',
    received: '28',
    completed: '25',
    sla: '92%',
    avgTime: '2.1 ngày',
    csat: '4.5 ★',
  },
  {
    name: 'Trần Thị B',
    received: '22',
    completed: '20',
    sla: '87%',
    avgTime: '2.8 ngày',
    csat: '4.2 ★',
  },
  {
    name: 'Lê Văn C',
    received: '19',
    completed: '17',
    sla: '95%',
    avgTime: '1.9 ngày',
    csat: '4.7 ★',
  },
  {
    name: 'Phạm Quốc Dũng',
    received: '24',
    completed: '22',
    sla: '91%',
    avgTime: '2.3 ngày',
    csat: '4.4 ★',
  },
  {
    name: 'Hoàng Thị Mai',
    received: '20',
    completed: '18',
    sla: '90%',
    avgTime: '2.5 ngày',
    csat: '4.3 ★',
  },
  {
    name: 'Đỗ Văn Hùng',
    received: '26',
    completed: '24',
    sla: '93%',
    avgTime: '2.0 ngày',
    csat: '4.6 ★',
  },
  {
    name: 'Vũ Thị Lan',
    received: '18',
    completed: '16',
    sla: '89%',
    avgTime: '2.7 ngày',
    csat: '4.1 ★',
  },
  {
    name: 'Ngô Văn Nam',
    received: '23',
    completed: '21',
    sla: '92%',
    avgTime: '2.2 ngày',
    csat: '4.5 ★',
  },
  {
    name: 'Bùi Thị Ngọc',
    received: '21',
    completed: '19',
    sla: '88%',
    avgTime: '2.6 ngày',
    csat: '4.2 ★',
  },
  {
    name: 'Đặng Văn Phong',
    received: '25',
    completed: '23',
    sla: '94%',
    avgTime: '2.1 ngày',
    csat: '4.6 ★',
  },
  {
    name: 'Lý Thị Quỳnh',
    received: '17',
    completed: '15',
    sla: '86%',
    avgTime: '2.9 ngày',
    csat: '4.0 ★',
  },
  {
    name: 'Trịnh Văn Sang',
    received: '22',
    completed: '20',
    sla: '91%',
    avgTime: '2.4 ngày',
    csat: '4.3 ★',
  },
  {
    name: 'Mai Thị Thảo',
    received: '19',
    completed: '18',
    sla: '95%',
    avgTime: '1.8 ngày',
    csat: '4.7 ★',
  },
  {
    name: 'Phan Văn Tuấn',
    received: '24',
    completed: '22',
    sla: '93%',
    avgTime: '2.2 ngày',
    csat: '4.5 ★',
  },
  {
    name: 'Võ Thị Uyên',
    received: '20',
    completed: '19',
    sla: '94%',
    avgTime: '2.0 ngày',
    csat: '4.6 ★',
  },
];

function DeptHeadStatistics() {
  const [toastMsg, setToastMsg] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState('');
  const pageSize = 3;

  const totalPages = Math.max(1, Math.ceil(specialistsData.length / pageSize));
  const paginatedSpecialists = specialistsData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getPageItems = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, 'right-dots', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, 'left-dots', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, 'left-dots', currentPage - 1, currentPage, currentPage + 1, 'right-dots', totalPages];
  };

  const handleExport = () => {
    // Generate CSV export content
    const headers = ['Chuyên viên', 'Hồ sơ nhận', 'Hoàn thành', 'Đúng SLA', 'TB xử lý', 'CSAT'];
    const rows = specialistsData.map((s) => [
      s.name,
      s.received,
      s.completed,
      s.sla,
      s.avgTime,
      s.csat.replace(' ★', ''),
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'VJU_Bao_cao_thong_ke_phong_dao_tao.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToastMsg('Đã xuất báo cáo thống kê phòng đào tạo thành công!');
    setTimeout(() => setToastMsg(''), 4000);
  };

  return (
    <div className="depthead-stats-container">
      {/* Toast Notification (Figma spec) */}
      {toastMsg && (
        <div className="depthead-toast-card">
          <div className="depthead-toast-icon-circle">
            <span className="depthead-toast-icon-check">✓</span>
          </div>
          <span className="depthead-toast-text">{toastMsg}</span>
        </div>
      )}

      {/* Top Header Row */}
      <div className="depthead-stats-header">
        <h1 className="depthead-stats-title">Thống kê phòng đào tạo</h1>
        <button
          type="button"
          className="depthead-stats-btn-export"
          onClick={handleExport}
        >
          Xuất báo cáo ↓
        </button>
      </div>

      {/* 5 Stat Cards Row */}
      <div className="depthead-stats-cards-row">
        {statCards.map((card, idx) => (
          <div key={idx} className="depthead-stats-card">
            <div className="depthead-stats-card-num">{card.num}</div>
            <div className="depthead-stats-card-label">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Two-Column Charts Row */}
      <div className="depthead-stats-charts-row">
        {/* Chart 1: Xu hướng tiếp nhận */}
        <div className="depthead-stats-chart-card">
          <h2 className="depthead-stats-chart-title">Xu hướng tiếp nhận</h2>
          <div style={{ height: 14 }} />
          <div className="depthead-stats-barchart-container">
            {/* Y-axis ticks */}
            <div className="depthead-stats-yaxis">
              <div>40</div>
              <div>30</div>
              <div>20</div>
              <div>10</div>
              <div>0</div>
            </div>

            {/* Bars track */}
            <div className="depthead-stats-bars-track">
              {monthlyBars.map((bar, idx) => (
                <div key={idx} className="depthead-stats-bar-col">
                  <div
                    className="depthead-stats-bar-fill"
                    style={{ height: `${bar.height}px` }}
                    title={`${bar.month}: ${bar.count} yêu cầu`}
                  />
                  <div className="depthead-stats-bar-month">{bar.month}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 2: Phân bố trạng thái */}
        <div className="depthead-stats-chart-card">
          <h2 className="depthead-stats-chart-title">Phân bố trạng thái</h2>
          <div style={{ height: 14 }} />
          {distributionItems.map((item, idx) => (
            <div key={idx} className="depthead-stats-dist-item">
              <div className="depthead-stats-dist-header">
                <span className="depthead-stats-dist-label">{item.label}</span>
                <span className="depthead-stats-dist-percent">{item.percent}%</span>
              </div>
              <div className="depthead-stats-dist-track">
                <div
                  className="depthead-stats-dist-fill"
                  style={{ width: `${item.percent}%`, background: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full-width Table Card: Hiệu suất chuyên viên */}
      <div className="depthead-stats-table-card">
        <h2 className="depthead-stats-chart-title">Hiệu suất chuyên viên</h2>
        <div style={{ height: 14 }} />

        <div className="depthead-stats-table-wrapper">
          {/* Header Row */}
          <div className="depthead-stats-th-row">
            <div className="depthead-stats-th-cell">Chuyên viên</div>
            <div className="depthead-stats-th-cell">Hồ sơ nhận</div>
            <div className="depthead-stats-th-cell">Hoàn thành</div>
            <div className="depthead-stats-th-cell">Đúng SLA</div>
            <div className="depthead-stats-th-cell">TB xử lý</div>
            <div className="depthead-stats-th-cell">CSAT</div>
          </div>

          <div className="depthead-stats-table-divider" />

          {/* Data Rows */}
          {paginatedSpecialists.map((spec, idx) => (
            <React.Fragment key={idx}>
              <div className="depthead-stats-tr-row">
                <div className="depthead-stats-td-cell">{spec.name}</div>
                <div className="depthead-stats-td-cell">{spec.received}</div>
                <div className="depthead-stats-td-cell">{spec.completed}</div>
                <div className="depthead-stats-td-cell">{spec.sla}</div>
                <div className="depthead-stats-td-cell">{spec.avgTime}</div>
                <div className="depthead-stats-td-cell" style={{ color: '#D97706', fontWeight: 500 }}>
                  {spec.csat}
                </div>
              </div>
              <div className="depthead-stats-table-divider" />
            </React.Fragment>
          ))}
        </div>

        {/* Pagination Row */}
        <div className="depthead-pagination-row">
          <div className="depthead-pagination-info">
            Hiển thị <strong>{(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, specialistsData.length)}</strong> / <strong>{specialistsData.length}</strong> chuyên viên
          </div>

          <div style={{ flex: '1 1 0' }} />

          <button
            type="button"
            className="depthead-page-arrow"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            title="Trang trước"
            aria-label="Trang trước"
          >
            ←
          </button>

          {getPageItems().map((item, idx) => {
            if (item === 'left-dots') {
              return (
                <button
                  key={`left-dots-${idx}`}
                  type="button"
                  className="depthead-page-dots-btn"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 5))}
                  title="Lùi 5 trang"
                >
                  ...
                </button>
              );
            }
            if (item === 'right-dots') {
              return (
                <button
                  key={`right-dots-${idx}`}
                  type="button"
                  className="depthead-page-dots-btn"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 5))}
                  title="Tiến 5 trang"
                >
                  ...
                </button>
              );
            }
            return (
              <button
                key={`page-${item}`}
                type="button"
                className={`depthead-page-btn ${currentPage === item ? 'active-page' : ''}`}
                onClick={() => setCurrentPage(item)}
              >
                {item}
              </button>
            );
          })}

          <button
            type="button"
            className="depthead-page-arrow"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            title="Trang sau"
            aria-label="Trang sau"
          >
            →
          </button>

          <div className="depthead-jump-box">
            <span className="depthead-jump-label">Đến trang</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const p = parseInt(jumpPage, 10);
                  if (p >= 1 && p <= totalPages) {
                    setCurrentPage(p);
                    setJumpPage('');
                  }
                }
              }}
              placeholder={currentPage}
              className="depthead-jump-input"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeptHeadStatistics;
