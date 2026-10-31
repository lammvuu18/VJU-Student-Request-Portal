import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './StaffPages.css';

const initialRequests = [
  {
    code: 'VJU-2026-0842',
    procedure: 'Cấp bảng điểm',
    student: 'Nguyễn M. Anh',
    assignedDate: '26/10/2026',
    deadline: '28/10/2026',
    status: 'Đang thẩm định',
    statusTheme: 'blue',
    isOverdueRow: false,
  },
  {
    code: 'VJU-2026-0835',
    procedure: 'Phúc khảo',
    student: 'Lê Thị Cúc',
    assignedDate: '25/10/2026',
    deadline: '30/10/2026',
    status: 'Đang thẩm định',
    statusTheme: 'blue',
    isOverdueRow: false,
  },
  {
    code: 'VJU-2026-0830',
    procedure: 'Cấp bảng điểm',
    student: 'Phạm Đ. Dũng',
    assignedDate: '24/10/2026',
    deadline: '28/10/2026',
    status: 'Chờ bổ sung',
    statusTheme: 'yellow',
    isOverdueRow: false,
  },
  {
    code: 'VJU-2026-0828',
    procedure: 'Bảo lưu KQ',
    student: 'Ngô Thị Em',
    assignedDate: '23/10/2026',
    deadline: '26/10/2026',
    status: 'Đang thẩm định',
    statusTheme: 'blue',
    isOverdueRow: false,
  },
  {
    code: 'VJU-2026-0820',
    procedure: 'Cấp bảng điểm',
    student: 'Đỗ T. Giang',
    assignedDate: '18/10/2026',
    deadline: '28/10/2026',
    status: 'Quá hạn',
    statusTheme: 'red',
    isOverdueRow: true,
  },
  {
    code: 'VJU-2026-0818',
    procedure: 'Phúc khảo',
    student: 'Vũ Văn Hải',
    assignedDate: '17/10/2026',
    deadline: '30/10/2026',
    status: 'Quá hạn',
    statusTheme: 'red',
    isOverdueRow: true,
  },
  {
    code: 'VJU-2026-0815',
    procedure: 'Xác nhận SV',
    student: 'Mai T. Hương',
    assignedDate: '22/10/2026',
    deadline: '23/10/2026',
    status: 'Hoàn thành',
    statusTheme: 'green',
    isOverdueRow: false,
  },
  {
    code: 'VJU-2026-0810',
    procedure: 'Cấp bảng điểm',
    student: 'Trần V. Khoa',
    assignedDate: '21/10/2026',
    deadline: '28/10/2026',
    status: 'Hoàn thành',
    statusTheme: 'green',
    isOverdueRow: false,
  },
  {
    code: 'VJU-2026-0805',
    procedure: 'Phúc khảo',
    student: 'Lý T. Lan',
    assignedDate: '20/10/2026',
    deadline: '30/10/2026',
    status: 'Đang thẩm định',
    statusTheme: 'blue',
    isOverdueRow: false,
  },
];

const procedureOptions = ['Tất cả', 'Cấp bảng điểm', 'Phúc khảo', 'Bảo lưu KQ', 'Xác nhận SV'];
const statusOptions = ['Tất cả', 'Đang thẩm định', 'Chờ bổ sung', 'Quá hạn', 'Hoàn thành'];
const timeRangeOptions = ['Tất cả', '7 ngày qua', '30 ngày qua', 'Tháng này'];

function StaffRequestList() {
  const navigate = useNavigate();
  const [requests] = useState(initialRequests);
  const [filterProcedure, setFilterProcedure] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTimeRange, setFilterTimeRange] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match =
        r.code.toLowerCase().includes(q) ||
        r.procedure.toLowerCase().includes(q) ||
        r.student.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

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
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ height: 10 }} />

        {/* Scrollable Table matching Figma Exact Spec */}
        <div className="staff-table-scroll">
          {/* Table Header Row */}
          <div className="staff-th-row">
            <div className="staff-th-cell">Mã yêu cầu</div>
            <div className="staff-th-cell">Thủ tục</div>
            <div className="staff-th-cell">Sinh viên</div>
            <div className="staff-th-cell">Phân công</div>
            <div className="staff-th-cell">Deadline</div>
            <div className="staff-th-cell">Trạng thái</div>
            <div className="staff-th-cell">Thao tác</div>
          </div>

          <div className="staff-table-divider" />

          {/* Table Data Rows */}
          {filteredRequests.map((req) => (
            <React.Fragment key={req.code}>
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
                    onClick={() => navigate(`/staff/request/${req.code}`)}
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>
              <div className="staff-table-divider" />
            </React.Fragment>
          ))}

          {filteredRequests.length === 0 && (
            <div style={{ padding: '24px 8px', textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
              Không có yêu cầu nào phù hợp với bộ lọc.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StaffRequestList;
