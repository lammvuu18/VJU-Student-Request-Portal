import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DeptHeadPages.css';

function DeptHeadRequestList() {
  const navigate = useNavigate();

  // 9 Requests matching Figma exact spec
  const initialRequests = [
    {
      code: 'VJU-2026-0842',
      procedure: 'Cấp bảng điểm',
      student: 'Nguyễn M. Anh',
      receivedDate: '21/10/2026',
      sla: '3 ngày',
      status: 'Chờ phân công',
      statusTheme: 'yellow',
      assignee: 'Nguyễn Văn A',
      isUrgent: true,
    },
    {
      code: 'VJU-2026-0839',
      procedure: 'Xác nhận SV',
      student: 'Trần V. Bình',
      receivedDate: '20/10/2026',
      sla: '2 ngày',
      status: 'Đang xử lý',
      statusTheme: 'blue',
      assignee: 'Nguyễn Văn A',
      isUrgent: false,
    },
    {
      code: 'VJU-2026-0835',
      procedure: 'Phúc khảo',
      student: 'Lê Thị Cúc',
      receivedDate: '19/10/2026',
      sla: '7 ngày',
      status: 'Chờ xét duyệt',
      statusTheme: 'yellow',
      assignee: 'Nguyễn Văn A',
      isUrgent: true,
    },
    {
      code: 'VJU-2026-0830',
      procedure: 'Cấp bảng điểm',
      student: 'Phạm Đ. Dũng',
      receivedDate: '18/10/2026',
      sla: '3 ngày',
      status: 'Đang xử lý',
      statusTheme: 'blue',
      assignee: 'Trần Thị B',
      isUrgent: false,
    },
    {
      code: 'VJU-2026-0828',
      procedure: 'Bảo lưu KQ',
      student: 'Ngô Thị Em',
      receivedDate: '17/10/2026',
      sla: '5 ngày',
      status: 'Chờ phân công',
      statusTheme: 'yellow',
      assignee: '',
      isUrgent: true,
    },
    {
      code: 'VJU-2026-0825',
      procedure: 'Xác nhận SV',
      student: 'Hoàng V. Phúc',
      receivedDate: '16/10/2026',
      sla: '2 ngày',
      status: 'Đang xử lý',
      statusTheme: 'blue',
      assignee: 'Lê Văn C',
      isUrgent: false,
    },
    {
      code: 'VJU-2026-0820',
      procedure: 'Cấp bảng điểm',
      student: 'Đỗ T. Giang',
      receivedDate: '15/10/2026',
      sla: '3 ngày',
      status: 'Hoàn thành',
      statusTheme: 'green',
      assignee: 'Nguyễn Văn A',
      isUrgent: false,
    },
    {
      code: 'VJU-2026-0818',
      procedure: 'Phúc khảo',
      student: 'Vũ Văn Hải',
      receivedDate: '14/10/2026',
      sla: '7 ngày',
      status: 'Chờ xét duyệt',
      statusTheme: 'yellow',
      assignee: 'Trần Thị B',
      isUrgent: true,
    },
    {
      code: 'VJU-2026-0815',
      procedure: 'Xác nhận SV',
      student: 'Mai T. Hương',
      receivedDate: '13/10/2026',
      sla: '2 ngày',
      status: 'Đang xử lý',
      statusTheme: 'blue',
      assignee: 'Lê Văn C',
      isUrgent: false,
    },
  ];

  const [requests, setRequests] = useState(initialRequests);
  const [selectedSpecialist, setSelectedSpecialist] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProcedure, setFilterProcedure] = useState('');
  const [sortDate, setSortDate] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Dropdown states
  const [openStatusDropdown, setOpenStatusDropdown] = useState(false);
  const [openProcedureDropdown, setOpenProcedureDropdown] = useState(false);
  const [openDateDropdown, setOpenDateDropdown] = useState(false);
  const [activeAssigneeRow, setActiveAssigneeRow] = useState(null); // row index or code
  const [assigneeMenuPos, setAssigneeMenuPos] = useState({ top: 0, left: 0 });

  const containerRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (!event.target.closest('.depthead-filters-row')) {
        setOpenStatusDropdown(false);
        setOpenProcedureDropdown(false);
        setOpenDateDropdown(false);
      }
      if (!event.target.closest('.depthead-assignee-select-btn') && !event.target.closest('.depthead-floating-assignee-menu')) {
        setActiveAssigneeRow(null);
      }
    }

    function handleScrollOrResize() {
      setActiveAssigneeRow(null);
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  // Specialist list for assignment
  const specialists = ['Nguyễn Văn A', 'Trần Thị B', 'Lê Văn C'];

  // Calculate specialist counts
  const countA = requests.filter(r => r.assignee === 'Nguyễn Văn A').length;
  const countB = requests.filter(r => r.assignee === 'Trần Thị B').length;
  const countC = requests.filter(r => r.assignee === 'Lê Văn C').length;
  const countUnassigned = requests.filter(r => !r.assignee).length;

  const handleOpenAssigneeMenu = (e, rowCode) => {
    e.stopPropagation();
    if (activeAssigneeRow === rowCode) {
      setActiveAssigneeRow(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 145;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < menuHeight ? Math.max(8, rect.top - menuHeight - 4) : rect.bottom + 4;
    setAssigneeMenuPos({
      top,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 160)),
    });
    setActiveAssigneeRow(rowCode);
  };

  const handleSelectAssignee = (rowCode, staffName) => {
    setRequests(prev => prev.map(r => {
      if (r.code === rowCode) {
        return {
          ...r,
          assignee: staffName,
          status: staffName && r.status === 'Chờ phân công' ? 'Đang xử lý' : r.status,
          statusTheme: staffName && r.status === 'Chờ phân công' ? 'blue' : r.statusTheme,
        };
      }
      return r;
    }));
    setActiveAssigneeRow(null);
    setToastMsg(staffName ? `Đã phân công hồ sơ ${rowCode} cho ${staffName}` : `Đã bỏ phân công hồ sơ ${rowCode}`);
    setTimeout(() => setToastMsg(''), 3500);
  };

  // Filter requests
  const filteredRequests = requests.filter(r => {
    if (selectedSpecialist) {
      if (selectedSpecialist === 'Chưa phân công' && r.assignee) return false;
      if (selectedSpecialist !== 'Chưa phân công' && r.assignee !== selectedSpecialist) return false;
    }
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterProcedure && r.procedure !== filterProcedure) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        r.code.toLowerCase().includes(q) ||
        r.procedure.toLowerCase().includes(q) ||
        r.student.toLowerCase().includes(q) ||
        (r.assignee && r.assignee.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="depthead-requests-container" ref={containerRef}>
      {/* Toast Notification (matching Figma spec) */}
      {toastMsg && (
        <div className="depthead-toast-card">
          <div className="depthead-toast-icon-circle">
            <span className="depthead-toast-icon-check">✓</span>
          </div>
          <span className="depthead-toast-text">{toastMsg}</span>
        </div>
      )}

      {/* Page Title */}
      <h1 className="depthead-requests-title">Tất cả yêu cầu</h1>
      <div style={{ alignSelf: 'stretch', height: 4 }} />

      {/* Section: Số hồ sơ của từng chuyên viên */}
      <div className="depthead-specialists-section">
        <h2 className="depthead-section-heading">Số hồ sơ của từng chuyên viên</h2>

        <div className="depthead-specialists-cards-row">
          {/* Nguyễn Văn A */}
          <div
            className={`depthead-spec-card ${selectedSpecialist === 'Nguyễn Văn A' ? 'depthead-spec-card--active' : ''}`}
            onClick={() => setSelectedSpecialist(selectedSpecialist === 'Nguyễn Văn A' ? '' : 'Nguyễn Văn A')}
            title="Bấm để lọc danh sách theo chuyên viên này"
          >
            <div className="depthead-spec-num">{String(countA).padStart(2, '0')}</div>
            <div className="depthead-spec-name">Nguyễn Văn A</div>
          </div>

          {/* Trần Thị B */}
          <div
            className={`depthead-spec-card ${selectedSpecialist === 'Trần Thị B' ? 'depthead-spec-card--active' : ''}`}
            onClick={() => setSelectedSpecialist(selectedSpecialist === 'Trần Thị B' ? '' : 'Trần Thị B')}
            title="Bấm để lọc danh sách theo chuyên viên này"
          >
            <div className="depthead-spec-num">{String(countB).padStart(2, '0')}</div>
            <div className="depthead-spec-name">Trần Thị B</div>
          </div>

          {/* Lê Văn C */}
          <div
            className={`depthead-spec-card ${selectedSpecialist === 'Lê Văn C' ? 'depthead-spec-card--active' : ''}`}
            onClick={() => setSelectedSpecialist(selectedSpecialist === 'Lê Văn C' ? '' : 'Lê Văn C')}
            title="Bấm để lọc danh sách theo chuyên viên này"
          >
            <div className="depthead-spec-num">{String(countC).padStart(2, '0')}</div>
            <div className="depthead-spec-name">Lê Văn C</div>
          </div>

          {/* Chưa phân công */}
          <div
            className={`depthead-spec-card ${selectedSpecialist === 'Chưa phân công' ? 'depthead-spec-card--active' : ''}`}
            onClick={() => setSelectedSpecialist(selectedSpecialist === 'Chưa phân công' ? '' : 'Chưa phân công')}
            title="Bấm để lọc hồ sơ chưa phân công"
          >
            <div className="depthead-spec-num">{String(countUnassigned).padStart(2, '0')}</div>
            <div className="depthead-spec-name">Chưa phân công</div>
          </div>
        </div>
      </div>

      {/* Section: Danh sách yêu cầu Card */}
      <div className="depthead-reqlist-card">
        <h2 className="depthead-section-heading">Danh sách yêu cầu</h2>
        <div style={{ alignSelf: 'stretch', height: 14 }} />

        {/* Filter Controls Bar */}
        <div className="depthead-filters-row">
          {/* Dropdown 1: Trạng thái */}
          <div style={{ position: 'relative', flex: '1 1 0' }}>
            <div
              className="depthead-filter-dropdown-btn"
              onClick={() => {
                setOpenStatusDropdown(!openStatusDropdown);
                setOpenProcedureDropdown(false);
                setOpenDateDropdown(false);
              }}
            >
              <div>{filterStatus || 'Trạng thái'}</div>
              <div>▾</div>
            </div>
            {openStatusDropdown && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                width: '100%',
                background: 'white',
                border: '1px solid #E2E5EA',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 50,
                overflow: 'hidden',
              }}>
                {['', 'Chờ phân công', 'Đang xử lý', 'Chờ xét duyệt', 'Hoàn thành'].map((st) => (
                  <div
                    key={st}
                    onClick={() => {
                      setFilterStatus(st);
                      setOpenStatusDropdown(false);
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: 13,
                      cursor: 'pointer',
                      background: filterStatus === st ? '#FCE8E8' : 'white',
                      color: filterStatus === st ? '#AA2327' : '#1F2937',
                      fontWeight: filterStatus === st ? 600 : 400,
                    }}
                  >
                    {st || 'Tất cả trạng thái'}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dropdown 2: Loại thủ tục */}
          <div style={{ position: 'relative', flex: '1 1 0' }}>
            <div
              className="depthead-filter-dropdown-btn"
              onClick={() => {
                setOpenProcedureDropdown(!openProcedureDropdown);
                setOpenStatusDropdown(false);
                setOpenDateDropdown(false);
              }}
            >
              <div>{filterProcedure || 'Loại thủ tục'}</div>
              <div>▾</div>
            </div>
            {openProcedureDropdown && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                width: '100%',
                background: 'white',
                border: '1px solid #E2E5EA',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 50,
                overflow: 'hidden',
              }}>
                {['', 'Cấp bảng điểm', 'Xác nhận SV', 'Phúc khảo', 'Bảo lưu KQ'].map((proc) => (
                  <div
                    key={proc}
                    onClick={() => {
                      setFilterProcedure(proc);
                      setOpenProcedureDropdown(false);
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: 13,
                      cursor: 'pointer',
                      background: filterProcedure === proc ? '#FCE8E8' : 'white',
                      color: filterProcedure === proc ? '#AA2327' : '#1F2937',
                      fontWeight: filterProcedure === proc ? 600 : 400,
                    }}
                  >
                    {proc || 'Tất cả thủ tục'}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dropdown 3: Ngày tiếp nhận */}
          <div style={{ position: 'relative', flex: '1 1 0' }}>
            <div
              className="depthead-filter-dropdown-btn"
              onClick={() => {
                setOpenDateDropdown(!openDateDropdown);
                setOpenStatusDropdown(false);
                setOpenProcedureDropdown(false);
              }}
            >
              <div>{sortDate === 'newest' ? 'Mới nhất' : 'Cũ nhất'}</div>
              <div>▾</div>
            </div>
            {openDateDropdown && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                width: '100%',
                background: 'white',
                border: '1px solid #E2E5EA',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 50,
                overflow: 'hidden',
              }}>
                {[
                  { label: 'Mới nhất', val: 'newest' },
                  { label: 'Cũ nhất', val: 'oldest' },
                ].map((item) => (
                  <div
                    key={item.val}
                    onClick={() => {
                      setSortDate(item.val);
                      setOpenDateDropdown(false);
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: 13,
                      cursor: 'pointer',
                      background: sortDate === item.val ? '#FCE8E8' : 'white',
                      color: sortDate === item.val ? '#AA2327' : '#1F2937',
                      fontWeight: sortDate === item.val ? 600 : 400,
                    }}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search Box */}
          <div className="depthead-search-box">
            <span style={{ color: '#6B7280', fontSize: 13 }}>⌕</span>
            <input
              type="text"
              className="depthead-search-input"
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ alignSelf: 'stretch', height: 8 }} />

        {/* Requests Table */}
        <div className="depthead-table-main-wrapper">
          {/* Header Row */}
          <div className="depthead-th-row">
            <div className="depthead-th-cell">Mã yêu cầu</div>
            <div className="depthead-th-cell">Thủ tục</div>
            <div className="depthead-th-cell">Sinh viên</div>
            <div className="depthead-th-cell">Ngày nhận</div>
            <div className="depthead-th-cell">SLA</div>
            <div className="depthead-th-cell">Trạng thái</div>
            <div className="depthead-th-cell">Người phụ trách</div>
            <div className="depthead-th-cell">Thao tác</div>
          </div>

          <div className="req-detail-divider" style={{ minWidth: 820 }} />

          {/* Data Rows */}
          {filteredRequests.map((row) => (
            <React.Fragment key={row.code}>
              <div className={`depthead-tr-row ${row.isUrgent ? 'depthead-tr-row--urgent' : ''}`}>
                <div className="depthead-td-cell" style={{ fontWeight: 500 }}>{row.code}</div>
                <div className="depthead-td-cell">{row.procedure}</div>
                <div className="depthead-td-cell">{row.student}</div>
                <div className="depthead-td-cell">{row.receivedDate}</div>
                <div className="depthead-td-cell">{row.sla}</div>

                {/* Status Badge */}
                <div className="depthead-td-cell">
                  <span className={`depthead-badge-status depthead-badge-status--${row.statusTheme}`}>
                    {row.status}
                  </span>
                </div>

                {/* Assignee Selector Button */}
                <div className="depthead-td-cell">
                  <div
                    className={`depthead-assignee-select-btn ${!row.assignee ? 'depthead-assignee-select-btn--empty' : ''}`}
                    onClick={(e) => handleOpenAssigneeMenu(e, row.code)}
                    title="Bấm để phân công hoặc đổi chuyên viên phụ trách"
                  >
                    <span>{row.assignee || 'Chưa có ai'}</span>
                    <span>▾</span>
                  </div>
                </div>

                {/* Action Button: Xem chi tiết */}
                <div className="depthead-td-cell">
                  <button
                    type="button"
                    className="btn-depthead-view-detail"
                    onClick={() => navigate(`/dept-head/request/${row.code}`)}
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>

              <div className="req-detail-divider" style={{ minWidth: 820 }} />
            </React.Fragment>
          ))}
        </div>

        {/* Floating Assignee Dropdown Popup (matching Figma spec) */}
        {activeAssigneeRow && (
          <div
            className="depthead-floating-assignee-menu"
            style={{
              top: assigneeMenuPos.top,
              left: assigneeMenuPos.left,
            }}
          >
            {specialists.map((spec) => {
              const currentReq = requests.find(r => r.code === activeAssigneeRow);
              const isSelected = currentReq?.assignee === spec;
              return (
                <div
                  key={spec}
                  className={`depthead-assignee-item ${isSelected ? 'depthead-assignee-item--selected' : ''}`}
                  onClick={() => handleSelectAssignee(activeAssigneeRow, spec)}
                >
                  {spec}
                </div>
              );
            })}
            <div
              className="depthead-assignee-item"
              style={{ color: '#9CA3AF' }}
              onClick={() => handleSelectAssignee(activeAssigneeRow, '')}
            >
              Chưa có ai
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DeptHeadRequestList;
