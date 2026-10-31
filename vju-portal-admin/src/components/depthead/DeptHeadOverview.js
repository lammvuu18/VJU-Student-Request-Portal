import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DeptHeadPages.css';

// 12 Months data matching Figma heights
const monthlyData = [
  { month: 'T1', height: 45, value: 15 },
  { month: 'T2', height: 60, value: 20 },
  { month: 'T3', height: 75, value: 25 },
  { month: 'T4', height: 54, value: 18 },
  { month: 'T5', height: 66, value: 22 },
  { month: 'T6', height: 105, value: 35 },
  { month: 'T7', height: 84, value: 28 },
  { month: 'T8', height: 120, value: 40 },
  { month: 'T9', height: 96, value: 32 },
  { month: 'T10', height: 54, value: 18 },
  { month: 'T11', height: 90, value: 30 },
  { month: 'T12', height: 72, value: 24 },
];

// 8 Overdue records matching Figma spec + expanded list
const overdueRequests = [
  {
    code: 'VJU-2026-0842',
    procedure: 'Cấp bảng điểm',
    sla: '3 ngày',
    student: 'Nguyễn Minh Anh',
    receivedDate: '21/10/2026',
    completedDate: '24/10/2026',
    status: 'Chờ phân công',
    statusType: 'assign',
  },
  {
    code: 'VJU-2026-0839',
    procedure: 'Xác nhận SV',
    sla: '2 ngày',
    student: 'Trần Văn Bình',
    receivedDate: '20/10/2026',
    completedDate: '22/10/2026',
    status: 'Chờ phê duyệt',
    statusType: 'approval',
  },
  {
    code: 'VJU-2026-0835',
    procedure: 'Phúc khảo',
    sla: '7 ngày',
    student: 'Lê Thị Cúc',
    receivedDate: '19/10/2026',
    completedDate: '26/10/2026',
    status: 'Chờ phân công',
    statusType: 'assign',
  },
  {
    code: 'VJU-2026-0830',
    procedure: 'Cấp bảng điểm',
    sla: '3 ngày',
    student: 'Phạm Đức Dũng',
    receivedDate: '18/10/2026',
    completedDate: '21/10/2026',
    status: 'Chờ phê duyệt',
    statusType: 'approval',
  },
  {
    code: 'VJU-2026-0828',
    procedure: 'Bảo lưu KQ',
    sla: '5 ngày',
    student: 'Ngô Thị Em',
    receivedDate: '17/10/2026',
    completedDate: '22/10/2026',
    status: 'Chờ phân công',
    statusType: 'assign',
  },
  {
    code: 'VJU-2026-0825',
    procedure: 'Xác nhận SV',
    sla: '2 ngày',
    student: 'Hoàng Văn Phúc',
    receivedDate: '16/10/2026',
    completedDate: '18/10/2026',
    status: 'Chờ phê duyệt',
    statusType: 'approval',
  },
  {
    code: 'VJU-2026-0820',
    procedure: 'Cấp bảng điểm',
    sla: '3 ngày',
    student: 'Đỗ Thị Giang',
    receivedDate: '15/10/2026',
    completedDate: '18/10/2026',
    status: 'Chờ phân công',
    statusType: 'assign',
  },
  {
    code: 'VJU-2026-0818',
    procedure: 'Phúc khảo',
    sla: '7 ngày',
    student: 'Vũ Văn Hải',
    receivedDate: '14/10/2026',
    completedDate: '21/10/2026',
    status: 'Chờ phê duyệt',
    statusType: 'approval',
  },
];

const extraProcs = ['Cấp bảng điểm', 'Xác nhận SV', 'Phúc khảo', 'Bảo lưu KQ', 'Miễn giảm HP', 'Cấp lại thẻ SV'];
const extraStudents = [
  'Mai T. Hương', 'Bùi Thị Hạnh', 'Đặng Minh Khôi', 'Đinh Thị Lan',
  'Dương Văn Nam', 'Lý Thị Oanh', 'Mai Văn Phong', 'Phan Thị Quỳnh',
  'Trịnh Văn Sang', 'Võ Thị Tâm', 'Lương Văn Uyên', 'Cao Thị Vân'
];
const extraSLAs = ['3 ngày', '2 ngày', '7 ngày', '5 ngày'];

if (overdueRequests.length < 25) {
  for (let i = overdueRequests.length; i < 25; i++) {
    const isAssign = i % 2 === 0;
    const num = String(815 - (i - 8) * 3).padStart(4, '0');
    const day = String(Math.max(1, 14 - (i - 8))).padStart(2, '0');
    const compDay = String(Math.max(1, parseInt(day, 10) + 3)).padStart(2, '0');
    overdueRequests.push({
      code: `VJU-2026-${num}`,
      procedure: extraProcs[i % extraProcs.length],
      sla: extraSLAs[i % extraSLAs.length],
      student: extraStudents[i % extraStudents.length],
      receivedDate: `${day}/10/2026`,
      completedDate: `${compDay}/10/2026`,
      status: isAssign ? 'Chờ phân công' : 'Chờ phê duyệt',
      statusType: isAssign ? 'assign' : 'approval',
    });
  }
}

function DeptHeadOverview() {
  const navigate = useNavigate();
  const [hoveredBar, setHoveredBar] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState('');
  const pageSize = 5;

  const totalPages = Math.max(1, Math.ceil(overdueRequests.length / pageSize));
  const paginatedRequests = overdueRequests.slice(
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

  return (
    <div className="depthead-overview-container">
      {/* 1. Page Title */}
      <h1 className="depthead-overview-title">Tổng quan Phòng Đào tạo</h1>

      {/* 2. Stat Cards Row (5 Cards) */}
      <div className="depthead-stat-cards-row">
        {/* Card 1: Đang xử lý */}
        <div
          className="depthead-stat-card"
          onClick={() => navigate('/dept-head/requests')}
          style={{ cursor: 'pointer' }}
        >
          <div className="depthead-stat-num">12</div>
          <div className="depthead-stat-label">Đang xử lý</div>
        </div>

        {/* Card 2: Chờ phân công (Highlighted Red Border) */}
        <div
          className="depthead-stat-card depthead-stat-card--alert"
          onClick={() => navigate('/dept-head/requests')}
        >
          <div className="depthead-stat-num depthead-stat-num--alert">05</div>
          <div className="depthead-stat-label depthead-stat-label--alert">Chờ phân công</div>
        </div>

        {/* Card 3: Chờ phê duyệt (Highlighted Red Border) */}
        <div
          className="depthead-stat-card depthead-stat-card--alert"
          onClick={() => navigate('/dept-head/requests')}
        >
          <div className="depthead-stat-num depthead-stat-num--alert">03</div>
          <div className="depthead-stat-label depthead-stat-label--alert">Chờ phê duyệt</div>
        </div>

        {/* Card 4: Hoàn thành */}
        <div
          className="depthead-stat-card"
          onClick={() => navigate('/dept-head/requests')}
          style={{ cursor: 'pointer' }}
        >
          <div className="depthead-stat-num">47</div>
          <div className="depthead-stat-label">Hoàn thành</div>
        </div>

        {/* Card 5: Đã hủy */}
        <div
          className="depthead-stat-card"
          onClick={() => navigate('/dept-head/requests')}
          style={{ cursor: 'pointer' }}
        >
          <div className="depthead-stat-num">02</div>
          <div className="depthead-stat-label">Đã hủy</div>
        </div>
      </div>

      {/* 3. Monthly Bar Chart: Tiếp nhận và xử lý trong 12 tháng */}
      <div className="depthead-chart-card">
        <h2 className="depthead-chart-title">Tiếp nhận và xử lý trong 12 tháng</h2>
        <div className="depthead-chart-wrapper">
          {/* Y-Axis: 50, 40, 30, 20, 10, 0 */}
          <div className="depthead-chart-yaxis">
            <div className="depthead-chart-y-tick">50</div>
            <div className="depthead-chart-y-tick">40</div>
            <div className="depthead-chart-y-tick">30</div>
            <div className="depthead-chart-y-tick">20</div>
            <div className="depthead-chart-y-tick">10</div>
            <div className="depthead-chart-y-tick">0</div>
          </div>

          {/* Bars Container */}
          <div className="depthead-chart-bars-track">
            {monthlyData.map((d, index) => (
              <div
                key={index}
                className="depthead-chart-col"
                onMouseEnter={() => setHoveredBar(index)}
                onMouseLeave={() => setHoveredBar(null)}
              >
                {/* Tooltip on Hover */}
                {hoveredBar === index && (
                  <div style={{
                    position: 'absolute',
                    top: 180 - d.height - 30,
                    zIndex: 10,
                    background: '#1F2937',
                    color: '#FFFFFF',
                    padding: '3px 7px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  }}>
                    {d.month}: {d.value} hồ sơ
                  </div>
                )}
                {/* Red Bar */}
                <div
                  className="depthead-chart-bar-rect"
                  style={{ height: `${d.height}px` }}
                />
                {/* Month Label */}
                <div className="depthead-chart-month-label">{d.month}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Table: Hồ sơ quá hạn */}
      <div className="depthead-overdue-card">
        <h2 className="depthead-overdue-title">Hồ sơ quá hạn</h2>

        <div className="depthead-table-container">
          {/* Table Header */}
          <div className="depthead-table-head">
            <div className="depthead-th">Mã yêu cầu</div>
            <div className="depthead-th">Thủ tục</div>
            <div className="depthead-th">SLA</div>
            <div className="depthead-th">Sinh viên</div>
            <div className="depthead-th">Ngày nhận</div>
            <div className="depthead-th">Ngày hoàn thành</div>
            <div className="depthead-th">Trạng thái</div>
          </div>

          <div className="req-detail-divider" style={{ minWidth: 760 }} />

          {/* Table Rows */}
          {paginatedRequests.map((row) => (
            <React.Fragment key={row.code}>
              <div
                className="depthead-table-row"
                onClick={() => navigate(`/dept-head/request/${row.code}`)}
                title="Bấm để xem chi tiết yêu cầu"
              >
                <div className="depthead-td" style={{ fontWeight: 500 }}>{row.code}</div>
                <div className="depthead-td">{row.procedure}</div>
                <div className="depthead-td">{row.sla}</div>
                <div className="depthead-td">{row.student}</div>
                <div className="depthead-td">{row.receivedDate}</div>
                <div className="depthead-td">{row.completedDate}</div>
                <div className="depthead-td">
                  {row.statusType === 'assign' ? (
                    <div className="depthead-badge-pending-assign">
                      {row.status}
                    </div>
                  ) : (
                    <div className="depthead-badge-pending-approval">
                      {row.status}
                    </div>
                  )}
                </div>
              </div>
              <div className="req-detail-divider" style={{ minWidth: 760 }} />
            </React.Fragment>
          ))}
        </div>

        {/* Pagination Row */}
        <div className="depthead-pagination-row">
          <div className="depthead-pagination-info">
            Hiển thị <strong>{(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, overdueRequests.length)}</strong> / <strong>{overdueRequests.length}</strong> hồ sơ
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

export default DeptHeadOverview;
