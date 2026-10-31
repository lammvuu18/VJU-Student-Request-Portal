import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PrincipalPages.css';

// 50 Requests/Decisions (9 initial matching Figma exact spec + 41 generated)
const initialDecisions = [
  {
    code: 'VJU-2026-0842',
    procedure: 'Cấp bảng điểm',
    student: 'Nguyễn M. Anh',
    department: 'Phòng Đào tạo',
    deadline: '28/10/2026',
    status: 'Chờ ký',
  },
  {
    code: 'VJU-2026-0835',
    procedure: 'Phúc khảo',
    student: 'Lê Thị Cúc',
    department: 'Phòng Đào tạo',
    deadline: '30/10/2026',
    status: 'Chờ ký',
  },
  {
    code: 'VJU-2026-0830',
    procedure: 'Cấp bảng điểm',
    student: 'Phạm Đ. Dũng',
    department: 'Phòng Đào tạo',
    deadline: '27/10/2026',
    status: 'Chờ ký',
  },
  {
    code: 'VJU-2026-0828',
    procedure: 'Xác nhận SV',
    student: 'Ngô Thị Em',
    department: 'Phòng CTSV',
    deadline: '29/10/2026',
    status: 'Chờ ký',
  },
  {
    code: 'VJU-2026-0825',
    procedure: 'Miễn giảm HP',
    student: 'Hoàng V. Phúc',
    department: 'Phòng KHTC',
    deadline: '31/10/2026',
    status: 'Chờ ký',
  },
  {
    code: 'VJU-2026-0820',
    procedure: 'Cấp bảng điểm',
    student: 'Đỗ T. Giang',
    department: 'Phòng Đào tạo',
    deadline: '26/10/2026',
    status: 'Chờ ký',
  },
  {
    code: 'VJU-2026-0818',
    procedure: 'Phúc khảo',
    student: 'Vũ Văn Hải',
    department: 'Phòng Đào tạo',
    deadline: '28/10/2026',
    status: 'Chờ ký',
  },
  {
    code: 'VJU-2026-0815',
    procedure: 'Xác nhận SV',
    student: 'Mai T. Hương',
    department: 'Phòng CTSV',
    deadline: '01/11/2026',
    status: 'Chờ ký',
  },
  {
    code: 'VJU-2026-0810',
    procedure: 'Hoàn trả HP',
    student: 'Trần V. Khoa',
    department: 'Phòng KHTC',
    deadline: '29/10/2026',
    status: 'Chờ ký',
  },
];

const extraProcs = [
  { proc: 'Cấp bảng điểm', dept: 'Phòng Đào tạo' },
  { proc: 'Phúc khảo', dept: 'Phòng Đào tạo' },
  { proc: 'Xác nhận SV', dept: 'Phòng CTSV' },
  { proc: 'Miễn giảm HP', dept: 'Phòng KHTC' },
  { proc: 'Hoàn trả HP', dept: 'Phòng KHTC' },
  { proc: 'Bảo lưu KQHT', dept: 'Phòng Đào tạo' },
  { proc: 'Cấp lại thẻ SV', dept: 'Phòng CTSV' },
];
const extraStudents = [
  'Bùi Thị Hạnh', 'Đặng Minh Khôi', 'Đinh Thị Lan', 'Dương Văn Nam',
  'Lý Thị Oanh', 'Mai Văn Phong', 'Phan Thị Quỳnh', 'Trịnh Văn Sang',
  'Võ Thị Tâm', 'Lương Văn Uyên', 'Cao Thị Vân', 'Hồ Văn Xuân',
  'Nguyễn Quốc Anh', 'Trần Văn Bình', 'Lê Thị Cúc', 'Phạm Đức Dũng'
];
const extraStatuses = ['Chờ ký', 'Chờ ký', 'Đã ký', 'Chờ ký', 'Từ chối'];

if (initialDecisions.length < 50) {
  for (let i = initialDecisions.length; i < 50; i++) {
    const p = extraProcs[i % extraProcs.length];
    const s = extraStudents[i % extraStudents.length];
    const st = extraStatuses[i % extraStatuses.length];
    const day = String((i % 28) + 1).padStart(2, '0');
    const month = String((i % 2) + 10).padStart(2, '0');
    const num = String(800 - (i - 9) * 3).padStart(4, '0');
    initialDecisions.push({
      code: `VJU-2026-${num}`,
      procedure: p.proc,
      student: s,
      department: p.dept,
      deadline: `${day}/${month}/2026`,
      status: st,
    });
  }
}

function PrincipalDecisionList() {
  const navigate = useNavigate();

  const [decisionsList] = useState(initialDecisions);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterDeadline, setFilterDeadline] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState('');
  const pageSize = 10; // 10 quyết định mỗi trang

  // Dropdown states
  const [openStatusDropdown, setOpenStatusDropdown] = useState(false);
  const [openDeptDropdown, setOpenDeptDropdown] = useState(false);
  const [openDeadlineDropdown, setOpenDeadlineDropdown] = useState(false);

  const containerRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (!event.target.closest('.principal-filter-item')) {
        setOpenStatusDropdown(false);
        setOpenDeptDropdown(false);
        setOpenDeadlineDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const statusOptions = ['Tất cả', 'Chờ ký', 'Đã ký', 'Từ chối'];
  const deptOptions = ['Tất cả', 'Phòng Đào tạo', 'Phòng CTSV', 'Phòng KHTC'];
  const deadlineOptions = ['Tất cả', 'Hôm nay', 'Tuần này', 'Tháng này'];

  // Filter decisions
  const filteredDecisions = decisionsList.filter((d) => {
    if (filterStatus && filterStatus !== 'Tất cả' && d.status !== filterStatus) return false;
    if (filterDept && filterDept !== 'Tất cả' && d.department !== filterDept) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        d.code.toLowerCase().includes(q) ||
        d.procedure.toLowerCase().includes(q) ||
        d.student.toLowerCase().includes(q) ||
        d.department.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredDecisions.length / pageSize));
  const paginatedDecisions = filteredDecisions.slice(
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
    <div className="principal-container" ref={containerRef}>
      {/* Title */}
      <h1 className="principal-title">Tất cả quyết định</h1>

      {/* Main Card */}
      <div className="principal-card">
        {/* Card Section Header */}
        <div className="principal-card-title">Danh sách quyết định</div>

        <div style={{ alignSelf: 'stretch', height: 16 }} />

        {/* Filters Row */}
        <div className="principal-filters-row">
          {/* Filter 1: Trạng thái */}
          <div className="principal-filter-item">
            <div
              className="principal-filter-btn"
              onClick={() => {
                setOpenStatusDropdown(!openStatusDropdown);
                setOpenDeptDropdown(false);
                setOpenDeadlineDropdown(false);
              }}
            >
              <span className="principal-filter-btn-label">
                {filterStatus && filterStatus !== 'Tất cả' ? filterStatus : 'Trạng thái'}
              </span>
              <span className="principal-filter-btn-chevron">▾</span>
            </div>

            {openStatusDropdown && (
              <div className="principal-dropdown-menu">
                {statusOptions.map((opt) => (
                  <div
                    key={opt}
                    className={`principal-dropdown-item ${filterStatus === opt ? 'principal-dropdown-item--active' : ''}`}
                    onClick={() => {
                      setFilterStatus(opt === 'Tất cả' ? '' : opt);
                      setOpenStatusDropdown(false);
                      setCurrentPage(1);
                    }}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Filter 2: Phòng ban */}
          <div className="principal-filter-item">
            <div
              className="principal-filter-btn"
              onClick={() => {
                setOpenDeptDropdown(!openDeptDropdown);
                setOpenStatusDropdown(false);
                setOpenDeadlineDropdown(false);
              }}
            >
              <span className="principal-filter-btn-label">
                {filterDept && filterDept !== 'Tất cả' ? filterDept : 'Phòng ban'}
              </span>
              <span className="principal-filter-btn-chevron">▾</span>
            </div>

            {openDeptDropdown && (
              <div className="principal-dropdown-menu">
                {deptOptions.map((opt) => (
                  <div
                    key={opt}
                    className={`principal-dropdown-item ${filterDept === opt ? 'principal-dropdown-item--active' : ''}`}
                    onClick={() => {
                      setFilterDept(opt === 'Tất cả' ? '' : opt);
                      setOpenDeptDropdown(false);
                      setCurrentPage(1);
                    }}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Filter 3: Hạn ký */}
          <div className="principal-filter-item">
            <div
              className="principal-filter-btn"
              onClick={() => {
                setOpenDeadlineDropdown(!openDeadlineDropdown);
                setOpenStatusDropdown(false);
                setOpenDeptDropdown(false);
              }}
            >
              <span className="principal-filter-btn-label">
                {filterDeadline && filterDeadline !== 'Tất cả' ? filterDeadline : 'Hạn ký'}
              </span>
              <span className="principal-filter-btn-chevron">▾</span>
            </div>

            {openDeadlineDropdown && (
              <div className="principal-dropdown-menu">
                {deadlineOptions.map((opt) => (
                  <div
                    key={opt}
                    className={`principal-dropdown-item ${filterDeadline === opt ? 'principal-dropdown-item--active' : ''}`}
                    onClick={() => {
                      setFilterDeadline(opt === 'Tất cả' ? '' : opt);
                      setOpenDeadlineDropdown(false);
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
          <div className="principal-search-box">
            <span className="principal-search-icon">⌕</span>
            <input
              type="text"
              className="principal-search-input"
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <div style={{ alignSelf: 'stretch', height: 10 }} />

        {/* Table Viewport */}
        <div className="principal-table-container">
          <div className="principal-table-wrapper">
            {/* Table Header Row */}
            <div className="principal-th-row">
              <div className="principal-th-cell">Mã yêu cầu</div>
              <div className="principal-th-cell">Thủ tục</div>
              <div className="principal-th-cell">Sinh viên</div>
              <div className="principal-th-cell">Phòng trình</div>
              <div className="principal-th-cell">Hạn ký</div>
              <div className="principal-th-cell">Thao tác</div>
            </div>

            <div className="principal-table-divider" />

            {/* Table Data Rows */}
            {paginatedDecisions.map((row) => (
              <React.Fragment key={row.code}>
                <div className="principal-tr-row">
                  <div className="principal-td-cell">{row.code}</div>
                  <div className="principal-td-cell">{row.procedure}</div>
                  <div className="principal-td-cell">{row.student}</div>
                  <div className="principal-td-cell">{row.department}</div>
                  <div className="principal-td-cell">{row.deadline}</div>
                  <div className="principal-td-cell">
                    <button
                      type="button"
                      className="btn-principal-view-detail"
                      onClick={() => navigate(`/principal/decision/${row.code}`)}
                    >
                      Xem chi tiết
                    </button>
                  </div>
                </div>
                <div className="principal-table-divider" />
              </React.Fragment>
            ))}

            {paginatedDecisions.length === 0 && (
              <div style={{ padding: '24px 8px', textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
                Không tìm thấy quyết định nào phù hợp với bộ lọc.
              </div>
            )}
          </div>
        </div>

        <div style={{ height: 12, width: '100%' }} />

        {/* Pagination Row */}
        <div className="principal-pagination-row">
          <div className="principal-pagination-info">
            Hiển thị <strong>{filteredDecisions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredDecisions.length)}</strong> / <strong>{filteredDecisions.length}</strong> quyết định
          </div>

          <div style={{ flex: '1 1 0' }} />

          <button
            type="button"
            className="principal-page-arrow"
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
                  className="principal-page-dots-btn"
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
                  className="principal-page-dots-btn"
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
                className={`principal-page-btn ${currentPage === item ? 'active-page' : ''}`}
                onClick={() => setCurrentPage(item)}
              >
                {item}
              </button>
            );
          })}

          <button
            type="button"
            className="principal-page-arrow"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            title="Trang sau"
            aria-label="Trang sau"
          >
            →
          </button>

          <div className="principal-jump-box">
            <span className="principal-jump-label">Đến trang</span>
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
              className="principal-jump-input"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrincipalDecisionList;
