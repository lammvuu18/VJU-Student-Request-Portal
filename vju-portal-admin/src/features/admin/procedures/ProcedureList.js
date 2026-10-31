import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../../components/common/Modal';
import './ProcedureList.css';

function ProcedureList() {
  const navigate = useNavigate();

  // 8 Procedures matching Figma exact spec
  const initialProcedures = [
    {
      id: 1,
      name: 'Cấp bảng điểm',
      department: 'Phòng Đào tạo',
      approvalLevels: '3 cấp',
      sla: '5 ngày',
      fee: '30.000 VNĐ',
      status: 'active',
      statusLabel: 'Hoạt động',
    },
    {
      id: 2,
      name: 'Xác nhận sinh viên',
      department: 'Phòng CTSV',
      approvalLevels: '2 cấp',
      sla: '3 ngày',
      fee: 'Miễn phí',
      status: 'active',
      statusLabel: 'Hoạt động',
    },
    {
      id: 3,
      name: 'Phúc khảo điểm',
      department: 'Phòng Đào tạo',
      approvalLevels: '3 cấp',
      sla: '10 ngày',
      fee: '20.000 VNĐ',
      status: 'active',
      statusLabel: 'Hoạt động',
    },
    {
      id: 4,
      name: 'Miễn giảm học phí',
      department: 'Phòng KHTC',
      approvalLevels: '2 cấp',
      sla: '7 ngày',
      fee: 'Miễn phí',
      status: 'active',
      statusLabel: 'Hoạt động',
    },
    {
      id: 5,
      name: 'Bảo lưu kết quả',
      department: 'Phòng Đào tạo',
      approvalLevels: '2 cấp',
      sla: '5 ngày',
      fee: 'Miễn phí',
      status: 'active',
      statusLabel: 'Hoạt động',
    },
    {
      id: 6,
      name: 'Hoàn trả học phí',
      department: 'Phòng KHTC',
      approvalLevels: '3 cấp',
      sla: '10 ngày',
      fee: 'Miễn phí',
      status: 'paused',
      statusLabel: 'Tạm dừng',
    },
    {
      id: 7,
      name: 'Cấp giấy giới thiệu',
      department: 'Phòng CTSV',
      approvalLevels: '2 cấp',
      sla: '3 ngày',
      fee: 'Miễn phí',
      status: 'active',
      statusLabel: 'Hoạt động',
    },
    {
      id: 8,
      name: 'Chuyển ngành',
      department: 'Phòng Đào tạo',
      approvalLevels: '3 cấp',
      sla: '15 ngày',
      fee: '50.000 VNĐ',
      status: 'active',
      statusLabel: 'Hoạt động',
    },
  ];

  const extraProcNames = [
    { name: 'Cấp lại thẻ sinh viên', dept: 'Phòng CTSV', levels: '2 cấp', sla: '3 ngày', fee: '50.000 VNĐ' },
    { name: 'Đăng ký học phần bổ sung', dept: 'Phòng Đào tạo', levels: '2 cấp', sla: '5 ngày', fee: 'Miễn phí' },
    { name: 'Xác nhận nợ học phí', dept: 'Phòng KHTC', levels: '2 cấp', sla: '3 ngày', fee: 'Miễn phí' },
    { name: 'Gia hạn thời gian đóng học phí', dept: 'Phòng KHTC', levels: '3 cấp', sla: '7 ngày', fee: 'Miễn phí' },
    { name: 'Xin rút học phần', dept: 'Phòng Đào tạo', levels: '2 cấp', sla: '5 ngày', fee: 'Miễn phí' },
    { name: 'Đăng ký làm khóa luận tốt nghiệp', dept: 'Phòng Đào tạo', levels: '3 cấp', sla: '10 ngày', fee: 'Miễn phí' },
    { name: 'Cấp chứng nhận hoàn thành khóa học', dept: 'Phòng Đào tạo', levels: '3 cấp', sla: '7 ngày', fee: '30.000 VNĐ' },
    { name: 'Xác nhận thông tin vay vốn ngân hàng', dept: 'Phòng CTSV', levels: '2 cấp', sla: '3 ngày', fee: 'Miễn phí' },
    { name: 'Đăng ký ở ký túc xá', dept: 'Phòng CTSV', levels: '2 cấp', sla: '5 ngày', fee: 'Miễn phí' },
    { name: 'Đăng ký bảo hiểm y tế', dept: 'Phòng CTSV', levels: '2 cấp', sla: '3 ngày', fee: 'Miễn phí' },
    { name: 'Cấp lại mật khẩu cổng thông tin', dept: 'Phòng Đào tạo', levels: '1 cấp', sla: '1 ngày', fee: 'Miễn phí' },
    { name: 'Chuyển trường / Chuyển ngành ngoài', dept: 'Phòng Đào tạo', levels: '3 cấp', sla: '15 ngày', fee: '100.000 VNĐ' },
  ];

  if (initialProcedures.length < 40) {
    for (let i = initialProcedures.length; i < 40; i++) {
      const p = extraProcNames[(i - 8) % extraProcNames.length];
      initialProcedures.push({
        id: i + 1,
        name: `${p.name} (${i + 1})`,
        department: p.dept,
        approvalLevels: p.levels,
        sla: p.sla,
        fee: p.fee,
        status: i % 6 === 0 ? 'paused' : 'active',
        statusLabel: i % 6 === 0 ? 'Tạm dừng' : 'Hoạt động',
      });
    }
  }

  const [proceduresList, setProceduresList] = useState(initialProcedures);
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState('');
  const pageSize = 8; // 8 thủ tục mỗi trang theo thiết kế ban đầu

  // Dropdown states
  const [openDeptDropdown, setOpenDeptDropdown] = useState(false);
  const [openStatusDropdown, setOpenStatusDropdown] = useState(false);

  // Add Procedure Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProcName, setNewProcName] = useState('');
  const [newProcDept, setNewProcDept] = useState('Phòng Đào tạo');
  const [newProcApproval, setNewProcApproval] = useState('2 cấp');
  const [newProcSla, setNewProcSla] = useState('5 ngày');
  const [newProcFee, setNewProcFee] = useState('Miễn phí');

  // Toast
  const [toastMsg, setToastMsg] = useState('');

  const containerRef = useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4500);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (!event.target.closest('.admin-proc-filter-item')) {
        setOpenDeptDropdown(false);
        setOpenStatusDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const deptOptions = ['Tất cả', 'Phòng Đào tạo', 'Phòng CTSV', 'Phòng KHTC'];
  const statusOptions = ['Tất cả', 'Hoạt động', 'Tạm dừng'];

  // Add procedure handler
  const handleAddProcedure = (e) => {
    e.preventDefault();
    if (!newProcName.trim()) return;

    const newProc = {
      id: Date.now(),
      name: newProcName.trim(),
      department: newProcDept,
      approvalLevels: newProcApproval,
      sla: newProcSla.trim() || '5 ngày',
      fee: newProcFee.trim() || 'Miễn phí',
      status: 'active',
      statusLabel: 'Hoạt động',
    };

    setProceduresList([newProc, ...proceduresList]);
    setIsAddModalOpen(false);
    setNewProcName('');
    showToast(`Đã thêm thành công thủ tục "${newProc.name}"`);
  };

  // Toggle status
  const handleToggleStatus = (id) => {
    setProceduresList((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const newStatus = p.status === 'active' ? 'paused' : 'active';
          const newLabel = newStatus === 'active' ? 'Hoạt động' : 'Tạm dừng';
          showToast(`Đã chuyển thủ tục "${p.name}" sang trạng thái "${newLabel}"`);
          return { ...p, status: newStatus, statusLabel: newLabel };
        }
        return p;
      })
    );
  };

  // Filtered procedures
  const filteredProcedures = proceduresList.filter((proc) => {
    if (filterDept && filterDept !== 'Tất cả' && proc.department !== filterDept) return false;
    if (filterStatus && filterStatus !== 'Tất cả' && proc.statusLabel !== filterStatus) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        proc.name.toLowerCase().includes(q) ||
        proc.department.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProcedures.length / pageSize));
  const paginatedProcedures = filteredProcedures.slice(
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
    <div className="admin-proc-container" ref={containerRef}>
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
      <h1 className="admin-proc-title">Quản lý thủ tục</h1>

      {/* Main Card */}
      <div className="admin-proc-card">
        {/* Card Header */}
        <div className="admin-proc-card-header">
          <div className="admin-proc-card-title">Danh mục thủ tục</div>
          <button
            type="button"
            className="admin-btn-add-proc"
            onClick={() => setIsAddModalOpen(true)}
          >
            + Thêm thủ tục
          </button>
        </div>

        <div style={{ alignSelf: 'stretch', height: 16 }} />

        {/* Filters Row: Phòng ban, Trạng thái, Tìm kiếm */}
        <div className="admin-proc-filters-row">
          {/* Filter 1: Phòng ban */}
          <div className="admin-proc-filter-item">
            <div
              className="admin-proc-filter-btn"
              onClick={() => {
                setOpenDeptDropdown(!openDeptDropdown);
                setOpenStatusDropdown(false);
              }}
            >
              <span className="admin-proc-filter-btn-label">
                {filterDept && filterDept !== 'Tất cả' ? filterDept : 'Phòng ban'}
              </span>
              <span className="admin-proc-filter-btn-chevron">▾</span>
            </div>

            {openDeptDropdown && (
              <div className="admin-proc-dropdown-menu">
                {deptOptions.map((opt) => (
                  <div
                    key={opt}
                    className={`admin-proc-dropdown-item ${filterDept === opt ? 'admin-proc-dropdown-item--active' : ''}`}
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

          {/* Filter 2: Trạng thái */}
          <div className="admin-proc-filter-item">
            <div
              className="admin-proc-filter-btn"
              onClick={() => {
                setOpenStatusDropdown(!openStatusDropdown);
                setOpenDeptDropdown(false);
              }}
            >
              <span className="admin-proc-filter-btn-label">
                {filterStatus && filterStatus !== 'Tất cả' ? filterStatus : 'Trạng thái'}
              </span>
              <span className="admin-proc-filter-btn-chevron">▾</span>
            </div>

            {openStatusDropdown && (
              <div className="admin-proc-dropdown-menu">
                {statusOptions.map((opt) => (
                  <div
                    key={opt}
                    className={`admin-proc-dropdown-item ${filterStatus === opt ? 'admin-proc-dropdown-item--active' : ''}`}
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

          {/* Search Box */}
          <div className="admin-proc-search-box">
            <span className="admin-proc-search-icon">⌕</span>
            <input
              type="text"
              className="admin-proc-search-input"
              placeholder="Tìm kiếm thủ tục..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <div style={{ alignSelf: 'stretch', height: 10 }} />

        {/* Table Viewport with Mock Scrollbar */}
        <div className="admin-proc-table-container">
          <div className="admin-proc-table-wrapper">
            {/* Table Header Row */}
            <div className="admin-proc-th-row">
              <div className="admin-proc-th-cell">Tên thủ tục</div>
              <div className="admin-proc-th-cell">Phòng ban</div>
              <div className="admin-proc-th-cell">Cấp duyệt</div>
              <div className="admin-proc-th-cell">SLA</div>
              <div className="admin-proc-th-cell">Lệ phí</div>
              <div className="admin-proc-th-cell">Trạng thái</div>
              <div className="admin-proc-th-cell">Thao tác</div>
            </div>

            <div className="admin-proc-divider" />

            {/* Table Data Rows */}
            {paginatedProcedures.map((row) => (
              <React.Fragment key={row.id}>
                <div className="admin-proc-tr-row">
                  <div className="admin-proc-td-cell">{row.name}</div>
                  <div className="admin-proc-td-cell">{row.department}</div>
                  <div className="admin-proc-td-cell">{row.approvalLevels}</div>
                  <div className="admin-proc-td-cell">{row.sla}</div>
                  <div className="admin-proc-td-cell">{row.fee}</div>

                  {/* Status Badge */}
                  <div className="admin-proc-td-cell">
                    <span
                      className={
                        row.status === 'active'
                          ? 'admin-proc-badge-active'
                          : 'admin-proc-badge-paused'
                      }
                      style={{ cursor: 'pointer' }}
                      title="Bấm để đổi trạng thái"
                      onClick={() => handleToggleStatus(row.id)}
                    >
                      {row.statusLabel}
                    </span>
                  </div>

                  {/* Action Button: Chỉnh sửa */}
                  <div className="admin-proc-td-cell">
                    <button
                      type="button"
                      className="btn-admin-edit-proc"
                      onClick={() => navigate('/admin/procedures/edit')}
                    >
                      Chỉnh sửa
                    </button>
                  </div>
                </div>

                <div className="admin-proc-divider" />
              </React.Fragment>
            ))}

            {paginatedProcedures.length === 0 && (
              <div style={{ padding: '24px 8px', textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
                Không tìm thấy thủ tục nào phù hợp với bộ lọc.
              </div>
            )}
          </div>
        </div>

        <div style={{ height: 12, width: '100%' }} />

        {/* Pagination Row */}
        <div className="admin-proc-pagination-row">
          <div className="admin-proc-pagination-info">
            Hiển thị <strong>{filteredProcedures.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredProcedures.length)}</strong> / <strong>{filteredProcedures.length}</strong> thủ tục
          </div>

          <div style={{ flex: '1 1 0' }} />

          <button
            type="button"
            className="admin-proc-page-arrow"
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
                  className="admin-proc-page-dots-btn"
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
                  className="admin-proc-page-dots-btn"
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
                className={`admin-proc-page-btn ${currentPage === item ? 'active-page' : ''}`}
                onClick={() => setCurrentPage(item)}
              >
                {item}
              </button>
            );
          })}

          <button
            type="button"
            className="admin-proc-page-arrow"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            title="Trang sau"
            aria-label="Trang sau"
          >
            →
          </button>

          <div className="admin-proc-jump-box">
            <span className="admin-proc-jump-label">Đến trang</span>
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
              className="admin-proc-jump-input"
            />
          </div>
        </div>
      </div>

      {/* Modal Add Procedure */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm thủ tục mới"
      >
        <form onSubmit={handleAddProcedure} style={{ fontFamily: 'Inter, sans-serif' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#1F2937', marginBottom: 6 }}>
              Tên thủ tục <span style={{ color: '#AA2327' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Nhập tên thủ tục..."
              value={newProcName}
              onChange={(e) => setNewProcName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #E2E5EA',
                borderRadius: 8,
                outline: 'none',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#1F2937', marginBottom: 6 }}>
              Phòng ban phụ trách
            </label>
            <select
              value={newProcDept}
              onChange={(e) => setNewProcDept(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #E2E5EA',
                borderRadius: 8,
                outline: 'none',
                fontSize: 13,
                boxSizing: 'border-box',
                background: 'white',
              }}
            >
              <option value="Phòng Đào tạo">Phòng Đào tạo</option>
              <option value="Phòng CTSV">Phòng CTSV</option>
              <option value="Phòng KHTC">Phòng KHTC</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#1F2937', marginBottom: 6 }}>
                Cấp duyệt
              </label>
              <select
                value={newProcApproval}
                onChange={(e) => setNewProcApproval(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #E2E5EA',
                  borderRadius: 8,
                  outline: 'none',
                  fontSize: 13,
                  boxSizing: 'border-box',
                  background: 'white',
                }}
              >
                <option value="1 cấp">1 cấp</option>
                <option value="2 cấp">2 cấp</option>
                <option value="3 cấp">3 cấp</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#1F2937', marginBottom: 6 }}>
                Thời gian SLA
              </label>
              <input
                type="text"
                placeholder="Ví dụ: 3 ngày, 5 ngày..."
                value={newProcSla}
                onChange={(e) => setNewProcSla(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #E2E5EA',
                  borderRadius: 8,
                  outline: 'none',
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#1F2937', marginBottom: 6 }}>
              Lệ phí
            </label>
            <input
              type="text"
              placeholder="Miễn phí hoặc ví dụ: 30.000 VNĐ"
              value={newProcFee}
              onChange={(e) => setNewProcFee(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #E2E5EA',
                borderRadius: 8,
                outline: 'none',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              style={{
                padding: '8px 16px',
                background: 'white',
                border: '1px solid #E2E5EA',
                borderRadius: 8,
                color: '#6B7280',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 18px',
                background: '#AA2327',
                border: 'none',
                borderRadius: 8,
                color: 'white',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Tạo thủ tục
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default ProcedureList;
