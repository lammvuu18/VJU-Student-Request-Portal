import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../../services/api';
import { useInbox } from './useInbox';
import './StaffPages.css';

const pad2 = (n) => String(n).padStart(2, '0');

// Số ngày đã quá hạn từ sla_remaining_hours (âm khi quá hạn)
const overdueText = (row) => {
  if (!row.isOverdueRow || row.slaRemainingHours === null || row.slaRemainingHours === undefined) return '—';
  const days = Math.max(1, Math.ceil(Math.abs(row.slaRemainingHours) / 24));
  return `${days} ngày`;
};


function StaffOverview() {
  const navigate = useNavigate();

  const { items, summary, loading, error } = useInbox();
  const user = getCurrentUser() || {};
  const firstName = (user.full_name || user.name || '').trim().split(' ').slice(-1)[0] || 'bạn';

  const statCards = [
    { num: pad2(summary.total_pending), label: 'Đã được giao', isOverdue: false },
    { num: pad2(items.filter(r => r.internalStatus === 'CV đang thẩm định').length), label: 'Đang thẩm định', isOverdue: false },
    { num: pad2(items.filter(r => r.internalStatus === 'Cần bổ sung').length), label: 'Chờ bổ sung', isOverdue: false },
    { num: pad2(summary.overdue), label: 'Quá hạn', isOverdue: true },
  ];

  // Hồ sơ sắp đến hạn: sắp theo thời gian SLA còn lại tăng dần
  const requestsList = [...items]
    .map(r => ({ ...r, overdue: overdueText(r) }))
    .sort((a, b) => (a.slaRemainingHours ?? Infinity) - (b.slaRemainingHours ?? Infinity));
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState('');
  const pageSize = 5; // 5 hồ sơ mỗi trang khớp hoàn hảo với chiều cao card ban đầu

  const totalPages = Math.max(1, Math.ceil(requestsList.length / pageSize));
  const paginatedRequests = requestsList.slice(
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
    <div className="staff-overview-container">
      {/* Page Title */}
      <h1 className="staff-overview-title">Tổng quan công việc của {firstName}</h1>

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
          {paginatedRequests.map((row) => (
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
                    onClick={() => navigate(`/staff/request/${row.id}`)}
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>

              <div className="staff-table-divider" style={{ minWidth: 820 }} />
            </React.Fragment>
          ))}

          {paginatedRequests.length === 0 && (
            <div style={{ padding: '24px 8px', textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
              {loading ? 'Đang tải hộp thư...' : (error || 'Chưa có hồ sơ nào được giao.')}
            </div>
          )}
        </div>

        <div style={{ height: 12, width: '100%' }} />

        {/* Pagination Row */}
        <div className="staff-overview-pagination-row">
          <div className="staff-overview-pagination-info">
            Hiển thị <strong>{(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, requestsList.length)}</strong> / <strong>{requestsList.length}</strong> hồ sơ
          </div>

          <div style={{ flex: '1 1 0' }} />

          <button
            type="button"
            className="staff-overview-page-arrow"
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
                  className="staff-overview-page-dots-btn"
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
                  className="staff-overview-page-dots-btn"
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
                className={`staff-overview-page-btn ${currentPage === item ? 'active-page' : ''}`}
                onClick={() => setCurrentPage(item)}
              >
                {item}
              </button>
            );
          })}

          <button
            type="button"
            className="staff-overview-page-arrow"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            title="Trang sau"
            aria-label="Trang sau"
          >
            →
          </button>

          <div className="staff-overview-jump-box">
            <span className="staff-overview-jump-label">Đến trang</span>
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
              className="staff-overview-jump-input"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default StaffOverview;
