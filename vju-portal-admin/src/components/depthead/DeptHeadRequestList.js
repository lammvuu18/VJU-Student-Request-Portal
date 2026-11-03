import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useInbox, INBOX_STATUS_LABELS, CLOSED_STATUS_LABELS } from '../staff/useInbox';
import './DeptHeadPages.css';

const WAITING_ASSIGN = 'Chờ phân công';
const UNASSIGNED_KEY = 'unassigned';

// SLA còn lại hiển thị theo ngày/giờ
const slaText = (hours) => {
  if (hours === null || hours === undefined) return '—';
  if (hours < 0) return `Quá ${Math.ceil(-hours / 24)} ngày`;
  if (hours < 24) return `${Math.round(hours)} giờ`;
  return `${Math.ceil(hours / 24)} ngày`;
};


function DeptHeadRequestList() {
  const navigate = useNavigate();

  // Một bảng chung cho đơn đang xử lý và đã kết thúc, lọc qua trạng thái
  const { items, loading, error, reload } = useInbox('all');
  const statusFilterOptions = ['', ...INBOX_STATUS_LABELS, 'Quá hạn', ...CLOSED_STATUS_LABELS];
  const [members, setMembers] = useState([]);
  const requests = items.map(r => ({
    ...r,
    receivedDate: r.assignedDate,
    sla: slaText(r.slaRemainingHours),
    isUrgent: r.isOverdueRow || r.internalStatus === WAITING_ASSIGN,
  }));
  const [selectedSpecialist, setSelectedSpecialist] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProcedure, setFilterProcedure] = useState('');
  const [sortDate, setSortDate] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState('');
  const pageSize = 10;

  // Dropdown states
  const [openStatusDropdown, setOpenStatusDropdown] = useState(false);
  const [openProcedureDropdown, setOpenProcedureDropdown] = useState(false);
  const [openDateDropdown, setOpenDateDropdown] = useState(false);
  const [activeAssigneeRow, setActiveAssigneeRow] = useState(null); // row index or code
  const [assigneeMenuPos, setAssigneeMenuPos] = useState({ top: 0, left: 0 });

  const containerRef = useRef(null);

  const loadMembers = () => {
    api.staff.getDepartmentMembers()
      .then(res => setMembers(res.data || []))
      .catch(() => {});
  };

  useEffect(() => { loadMembers(); }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

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

  const countUnassigned = requests.filter(r => !r.assigneeId).length;
  const procedureOptions = ['', ...Array.from(new Set(requests.map(r => r.procedure)))];

  const handleOpenAssigneeMenu = (e, rowCode) => {
    e.stopPropagation();
    const row = requests.find(r => r.id === rowCode);
    // Backend chỉ cho phân công đơn đang chờ, không hỗ trợ đổi người phụ trách
    if (!row || row.internalStatus !== WAITING_ASSIGN) {
      showToast('Chỉ phân công được hồ sơ đang ở trạng thái "Chờ phân công".');
      return;
    }
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

  const handleSelectAssignee = async (rowId, member) => {
    setActiveAssigneeRow(null);
    try {
      const res = await api.staff.assign(rowId, member.user_id);
      showToast(res.message || `Đã phân công cho ${member.full_name}`);
      reload();
      loadMembers();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleSelectSpecialist = (spec) => {
    setSelectedSpecialist(prev => prev === spec ? '' : spec);
    setCurrentPage(1);
  };

  // Filter & sort requests
  const filteredRequests = requests.filter(r => {
    if (selectedSpecialist) {
      if (selectedSpecialist === UNASSIGNED_KEY && r.assigneeId) return false;
      if (selectedSpecialist !== UNASSIGNED_KEY && r.assigneeId !== selectedSpecialist) return false;
    }
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterProcedure && r.procedure !== filterProcedure) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        r.code.toLowerCase().includes(q) ||
        r.procedure.toLowerCase().includes(q) ||
        (r.student || '').toLowerCase().includes(q) ||
        (r.mssv || '').toLowerCase().includes(q) ||
        (r.assignee && r.assignee.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sortDate === 'oldest' ? diff : -diff;
  });

  const totalPages = Math.max(1, Math.ceil(sortedRequests.length / pageSize));
  const paginatedRequests = sortedRequests.slice(
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
          {members.map((m) => (
            <div
              key={m.user_id}
              className={`depthead-spec-card ${selectedSpecialist === m.user_id ? 'depthead-spec-card--active' : ''}`}
              onClick={() => handleSelectSpecialist(m.user_id)}
              title={`Đang xử lý ${m.current_workload} hồ sơ. Bấm để lọc theo chuyên viên này`}
            >
              <div className="depthead-spec-num">{String(requests.filter(r => r.assigneeId === m.user_id).length).padStart(2, '0')}</div>
              <div className="depthead-spec-name">{m.full_name}</div>
            </div>
          ))}

          {/* Chưa phân công */}
          <div
            className={`depthead-spec-card ${selectedSpecialist === UNASSIGNED_KEY ? 'depthead-spec-card--active' : ''}`}
            onClick={() => handleSelectSpecialist(UNASSIGNED_KEY)}
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
              <div className="depthead-filter-dropdown-menu">
                {statusFilterOptions.map((st) => (
                  <div
                    key={st}
                    className={`depthead-filter-dropdown-item ${filterStatus === st ? 'active' : ''}`}
                    onClick={() => {
                      setFilterStatus(st);
                      setOpenStatusDropdown(false);
                      setCurrentPage(1);
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
              <div className="depthead-filter-dropdown-menu">
                {procedureOptions.map((proc) => (
                  <div
                    key={proc}
                    className={`depthead-filter-dropdown-item ${filterProcedure === proc ? 'active' : ''}`}
                    onClick={() => {
                      setFilterProcedure(proc);
                      setOpenProcedureDropdown(false);
                      setCurrentPage(1);
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
              <div className="depthead-filter-dropdown-menu">
                {[
                  { label: 'Mới nhất', val: 'newest' },
                  { label: 'Cũ nhất', val: 'oldest' },
                ].map((item) => (
                  <div
                    key={item.val}
                    className={`depthead-filter-dropdown-item ${sortDate === item.val ? 'active' : ''}`}
                    onClick={() => {
                      setSortDate(item.val);
                      setOpenDateDropdown(false);
                      setCurrentPage(1);
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
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
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

          {/* Empty State */}
          {paginatedRequests.length === 0 && (
            <div style={{ padding: '36px 0', textAlign: 'center', width: '100%', color: '#6B7280', fontSize: 13 }}>
              {loading ? 'Đang tải hộp thư...' : (error || 'Không tìm thấy yêu cầu nào phù hợp')}
            </div>
          )}

          {/* Data Rows */}
          {paginatedRequests.map((row) => (
            <React.Fragment key={row.id}>
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
                    onClick={(e) => handleOpenAssigneeMenu(e, row.id)}
                    title={row.internalStatus === WAITING_ASSIGN ? 'Bấm để phân công chuyên viên' : 'Hồ sơ đã được phân công'}
                  >
                    <span>{row.assignee || 'Chưa có ai'}</span>
                    {row.internalStatus === WAITING_ASSIGN && <span>▾</span>}
                  </div>
                </div>

                {/* Action Button: Xem chi tiết */}
                <div className="depthead-td-cell">
                  <button
                    type="button"
                    className="btn-depthead-view-detail"
                    onClick={() => navigate(`/dept-head/request/${row.id}`)}
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>

              <div className="req-detail-divider" style={{ minWidth: 820 }} />
            </React.Fragment>
          ))}
        </div>

        {/* Pagination Row */}
        <div className="depthead-pagination-row">
          <div className="depthead-pagination-info">
            Hiển thị <strong>{filteredRequests.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredRequests.length)}</strong> / <strong>{filteredRequests.length}</strong> yêu cầu
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

        {/* Floating Assignee Dropdown Popup (matching Figma spec) */}
        {activeAssigneeRow && (
          <div
            className="depthead-floating-assignee-menu"
            style={{
              top: assigneeMenuPos.top,
              left: assigneeMenuPos.left,
            }}
          >
            {members.length === 0 && (
              <div className="depthead-assignee-item" style={{ color: '#9CA3AF' }}>Phòng chưa có chuyên viên</div>
            )}
            {members.map((m) => (
              <div
                key={m.user_id}
                className="depthead-assignee-item"
                onClick={() => handleSelectAssignee(activeAssigneeRow, m)}
              >
                {m.full_name} ({m.current_workload})
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DeptHeadRequestList;
