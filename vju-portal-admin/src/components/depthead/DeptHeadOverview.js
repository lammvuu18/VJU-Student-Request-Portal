import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DeptHeadPages.css';

function DeptHeadOverview() {
  const navigate = useNavigate();
  const [hoveredBar, setHoveredBar] = useState(null);

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

  // 8 Overdue records matching Figma spec
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
          {overdueRequests.map((row, index) => (
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
      </div>
    </div>
  );
}

export default DeptHeadOverview;
