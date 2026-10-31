import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PrincipalPages.css';

function PrincipalDecisionList() {
  const navigate = useNavigate();

  // 9 Requests/Decisions matching Figma exact spec
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

  const [decisionsList] = useState(initialDecisions);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterDeadline, setFilterDeadline] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ alignSelf: 'stretch', height: 10 }} />

        {/* Table Viewport with Mock Scrollbar */}
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
            {filteredDecisions.map((row) => (
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

            {filteredDecisions.length === 0 && (
              <div style={{ padding: '24px 8px', textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
                Không tìm thấy quyết định nào phù hợp với bộ lọc.
              </div>
            )}
          </div>

          {/* Scrollbar Mock from Figma */}
          <div className="principal-scrollbar-track" />
          <div className="principal-scrollbar-thumb" />
        </div>
      </div>
    </div>
  );
}

export default PrincipalDecisionList;
