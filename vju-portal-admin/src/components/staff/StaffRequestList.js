import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInbox, INBOX_STATUS_LABELS, CLOSED_STATUS_LABELS } from './useInbox';
import './StaffPages.css';

// Một bảng chung cho đơn đang xử lý và đã kết thúc, lọc qua trạng thái
const statusOptions = ['Tất cả', ...INBOX_STATUS_LABELS, 'Quá hạn', ...CLOSED_STATUS_LABELS];
const timeRangeOptions = ['Tất cả', '7 ngày qua', '30 ngày qua'];
const TIME_RANGE_DAYS = { '7 ngày qua': 7, '30 ngày qua': 30 };


function StaffRequestList() {
  const navigate = useNavigate();
  const { items: requests, loading, error } = useInbox('all');
  const procedureOptions = ['Tất cả', ...Array.from(new Set(requests.map(r => r.procedure)))];
  const [filterProcedure, setFilterProcedure] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTimeRange, setFilterTimeRange] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState('');
  const pageSize = 10; // 10 yêu cầu mỗi trang

  // Dropdown states
  const [openProcedureMenu, setOpenProcedureMenu] = useState(false);
  const [openStatusMenu, setOpenStatusMenu] = useState(false);
  const [openTimeMenu, setOpenTimeMenu] = useState(false);

  const containerRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (!e.target.closest('.staff-filter-dropdown-wrapper')) {
        setOpenProcedureMenu(false);
        setOpenStatusMenu(false);
        setOpenTimeMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    if (filterProcedure && filterProcedure !== 'Tất cả' && r.procedure !== filterProcedure) {
      return false;
    }
    if (filterStatus && filterStatus !== 'Tất cả' && r.status !== filterStatus) {
      return false;
    }
    if (filterTimeRange && TIME_RANGE_DAYS[filterTimeRange]) {
      const since = Date.now() - TIME_RANGE_DAYS[filterTimeRange] * 86400000;
      if (new Date(r.createdAt).getTime() < since) return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match =
        r.code.toLowerCase().includes(q) ||
        r.procedure.toLowerCase().includes(q) ||
        (r.student || '').toLowerCase().includes(q) ||
        (r.mssv || '').toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const paginatedRequests = filteredRequests.slice(
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
    <div className="staff-overview-container" ref={containerRef}>
      {/* Page Title: Tất cả yêu cầu */}
      <h1 className="staff-overview-title">Tất cả yêu cầu</h1>

      {/* Main Card: Danh sách công việc */}
      <div className="staff-table-card">
        {/* Card Title */}
        <h2 className="staff-card-title">Danh sách công việc</h2>

        <div style={{ height: 16 }} />

        {/* Filter Bar */}
        <div className="staff-filters-bar">
          {/* Procedure Filter */}
          <div className="staff-filter-dropdown-wrapper">
            <button
              type="button"
              className={`staff-filter-dropdown-btn ${openProcedureMenu ? 'staff-filter-dropdown-btn--open' : ''}`}
              onClick={() => {
                setOpenProcedureMenu(!openProcedureMenu);
                setOpenStatusMenu(false);
                setOpenTimeMenu(false);
              }}
            >
              <span>{filterProcedure ? `Thủ tục: ${filterProcedure}` : 'Thủ tục'}</span>
              <span>▾</span>
            </button>
            {openProcedureMenu && (
              <div className="staff-filter-dropdown-menu">
                {procedureOptions.map((opt) => (
                  <div
                    key={opt}
                    className={`staff-filter-menu-item ${
                      (filterProcedure === opt || (!filterProcedure && opt === 'Tất cả'))
                        ? 'staff-filter-menu-item--active'
                        : ''
                    }`}
                    onClick={() => {
                      setFilterProcedure(opt === 'Tất cả' ? '' : opt);
                      setOpenProcedureMenu(false);
                      setCurrentPage(1);
                    }}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div className="staff-filter-dropdown-wrapper">
            <button
              type="button"
              className={`staff-filter-dropdown-btn ${openStatusMenu ? 'staff-filter-dropdown-btn--open' : ''}`}
              onClick={() => {
                setOpenStatusMenu(!openStatusMenu);
                setOpenProcedureMenu(false);
                setOpenTimeMenu(false);
              }}
            >
              <span>{filterStatus ? `Trạng thái: ${filterStatus}` : 'Trạng thái'}</span>
              <span>▾</span>
            </button>
            {openStatusMenu && (
              <div className="staff-filter-dropdown-menu">
                {statusOptions.map((opt) => (
                  <div
                    key={opt}
                    className={`staff-filter-menu-item ${
                      (filterStatus === opt || (!filterStatus && opt === 'Tất cả'))
                        ? 'staff-filter-menu-item--active'
                        : ''
                    }`}
                    onClick={() => {
                      setFilterStatus(opt === 'Tất cả' ? '' : opt);
                      setOpenStatusMenu(false);
                      setCurrentPage(1);
                    }}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Time Range Filter */}
          <div className="staff-filter-dropdown-wrapper">
            <button
              type="button"
              className={`staff-filter-dropdown-btn ${openTimeMenu ? 'staff-filter-dropdown-btn--open' : ''}`}
              onClick={() => {
                setOpenTimeMenu(!openTimeMenu);
                setOpenProcedureMenu(false);
                setOpenStatusMenu(false);
              }}
            >
              <span>{filterTimeRange ? `Khoảng thời gian: ${filterTimeRange}` : 'Khoảng thời gian'}</span>
              <span>▾</span>
            </button>
            {openTimeMenu && (
              <div className="staff-filter-dropdown-menu">
                {timeRangeOptions.map((opt) => (
                  <div
                    key={opt}
                    className={`staff-filter-menu-item ${
                      (filterTimeRange === opt || (!filterTimeRange && opt === 'Tất cả'))
                        ? 'staff-filter-menu-item--active'
                        : ''
                    }`}
                    onClick={() => {
                      setFilterTimeRange(opt === 'Tất cả' ? '' : opt);
                      setOpenTimeMenu(false);
                      setCurrentPage(1);
                    }}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search Box */}
          <div className="staff-search-box">
            <span className="staff-search-icon">⌕</span>
            <input
              type="text"
              className="staff-search-input"
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <div style={{ height: 10 }} />

        {/* Table Viewport */}
        <div className="staff-table-scroll">
          {/* Table Header Row */}
          <div className="staff-th-row">
            <div className="staff-th-cell">Mã yêu cầu</div>
            <div className="staff-th-cell">Thủ tục</div>
            <div className="staff-th-cell">Sinh viên</div>
            <div className="staff-th-cell">Ngày gửi</div>
            <div className="staff-th-cell">Deadline</div>
            <div className="staff-th-cell">Trạng thái</div>
            <div className="staff-th-cell">Thao tác</div>
          </div>

          <div className="staff-table-divider" />

          {/* Table Data Rows */}
          {paginatedRequests.map((req) => (
            <React.Fragment key={req.id}>
              <div
                className={`staff-tr-row ${req.isOverdueRow ? 'staff-tr-row--overdue' : ''}`}
              >
                <div className="staff-td-cell">{req.code}</div>
                <div className="staff-td-cell">{req.procedure}</div>
                <div className="staff-td-cell">{req.student}</div>
                <div className="staff-td-cell">{req.assignedDate}</div>
                <div className="staff-td-cell">{req.deadline}</div>
                <div className="staff-td-cell">
                  <span className={`staff-badge-status staff-badge-status--${req.statusTheme}`}>
                    {req.status}
                  </span>
                </div>
                <div className="staff-td-cell">
                  <button
                    type="button"
                    className="btn-staff-detail-red"
                    onClick={() => navigate(`/staff/request/${req.id}`)}
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>
              <div className="staff-table-divider" />
            </React.Fragment>
          ))}

          {paginatedRequests.length === 0 && (
            <div style={{ padding: '24px 8px', textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
              {loading ? 'Đang tải hộp thư...' : (error || 'Không có yêu cầu nào phù hợp với bộ lọc.')}
            </div>
          )}
        </div>

        <div style={{ height: 12, width: '100%' }} />

        {/* Pagination Row */}
        <div className="staff-overview-pagination-row">
          <div className="staff-overview-pagination-info">
            Hiển thị <strong>{filteredRequests.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredRequests.length)}</strong> / <strong>{filteredRequests.length}</strong> yêu cầu
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

export default StaffRequestList;
