import React from 'react';
import { useNavigate } from 'react-router-dom';
import './StaffPages.css';

function StaffOverview() {
  const navigate = useNavigate();

  // 4 stat cards data (Figma Spec)
  const statCards = [
    { num: '15', label: 'Đã được giao', isOverdue: false },
    { num: '08', label: 'Đang thẩm định', isOverdue: false },
    { num: '04', label: 'Chờ bổ sung', isOverdue: false },
    { num: '02', label: 'Quá hạn', isOverdue: true },
  ];

  // 5 upcoming / overdue deadline requests (Figma Spec)
  const deadlineRequests = [
    {
      code: 'VJU-2026-0842',
      procedure: 'Cấp bảng điểm',
      student: 'Nguyễn M. Anh',
      status: 'Đang thẩm định',
      statusTheme: 'blue',
      deadline: '28/10/2026',
      overdue: '—',
      isOverdueRow: false,
    },
    {
      code: 'VJU-2026-0835',
      procedure: 'Phúc khảo',
      student: 'Lê Thị Cúc',
      status: 'Đang thẩm định',
      statusTheme: 'blue',
      deadline: '27/10/2026',
      overdue: '—',
      isOverdueRow: false,
    },
    {
      code: 'VJU-2026-0830',
      procedure: 'Cấp bảng điểm',
      student: 'Phạm Đ. Dũng',
      status: 'Chờ bổ sung',
      statusTheme: 'yellow',
      deadline: '29/10/2026',
      overdue: '—',
      isOverdueRow: false,
    },
    {
      code: 'VJU-2026-0820',
      procedure: 'Cấp bảng điểm',
      student: 'Đỗ T. Giang',
      status: 'Đang thẩm định',
      statusTheme: 'blue',
      deadline: '24/10/2026',
      overdue: '2 ngày',
      isOverdueRow: true,
    },
    {
      code: 'VJU-2026-0818',
      procedure: 'Phúc khảo',
      student: 'Vũ Văn Hải',
      status: 'Đang thẩm định',
      statusTheme: 'blue',
      deadline: '25/10/2026',
      overdue: '1 ngày',
      isOverdueRow: true,
    },
  ];

  return (
    <div className="staff-overview-container">
      {/* Page Title */}
      <h1 className="staff-overview-title">Tổng quan công việc của Nam</h1>

      {/* 4 Stat Cards Row */}
      <div className="staff-stat-cards-row">
        {statCards.map((card, idx) => (
          <div
            key={idx}
            className={`staff-stat-card ${card.isOverdue ? 'staff-stat-card--overdue' : ''}`}
          >
            <div className={`staff-stat-num ${card.isOverdue ? 'staff-stat-num--overdue' : ''}`}>
              {card.num}
            </div>
            <div className={`staff-stat-label ${card.isOverdue ? 'staff-stat-label--overdue' : ''}`}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Main Table Card: Hồ sơ sắp đến hạn */}
      <div className="staff-table-card">
        {/* Card Header Row */}
        <div className="staff-card-header">
          <h2 className="staff-card-title">Hồ sơ sắp đến hạn</h2>
          <button
            type="button"
            className="btn-staff-view-all"
            onClick={() => navigate('/staff/requests')}
          >
            Xem tất cả yêu cầu →
          </button>
        </div>

        {/* Spacer */}
        <div style={{ width: 10, height: 18 }} />

        {/* Table Container */}
        <div className="staff-table-wrapper">
          {/* Table Header Row */}
          <div className="staff-th-row">
            <div className="staff-th-cell">Mã yêu cầu</div>
            <div className="staff-th-cell">Thủ tục</div>
            <div className="staff-th-cell">Sinh viên</div>
            <div className="staff-th-cell">Trạng thái</div>
            <div className="staff-th-cell">Deadline</div>
            <div className="staff-th-cell">Đã quá hạn</div>
            <div className="staff-th-cell">Thao tác</div>
          </div>

          <div className="staff-table-divider" style={{ minWidth: 820 }} />

          {/* Table Data Rows */}
          {deadlineRequests.map((row) => (
            <React.Fragment key={row.code}>
              <div className={`staff-tr-row ${row.isOverdueRow ? 'staff-tr-row--overdue' : ''}`}>
                <div className="staff-td-cell">{row.code}</div>
                <div className="staff-td-cell">{row.procedure}</div>
                <div className="staff-td-cell">{row.student}</div>

                {/* Status Badge */}
                <div className="staff-td-cell">
                  <span className={`staff-badge-status staff-badge-status--${row.statusTheme}`}>
                    {row.status}
                  </span>
                </div>

                <div className="staff-td-cell">{row.deadline}</div>

                {/* Overdue */}
                <div className="staff-td-cell">
                  <span className="staff-overdue-val">{row.overdue}</span>
                </div>

                {/* Action button */}
                <div className="staff-td-cell">
                  <button
                    type="button"
                    className="btn-staff-detail-red"
                    onClick={() => navigate(`/staff/request/${row.code}`)}
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>

              <div className="staff-table-divider" style={{ minWidth: 820 }} />
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StaffOverview;
