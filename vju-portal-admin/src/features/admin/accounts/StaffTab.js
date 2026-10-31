import React, { useState } from 'react';
import EditStaffModal from './modals/EditStaffModal';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import { staff, staffStatusMap } from '../../../data/mockData';
import './StaffTab.css';

function StaffTab() {
  const [staffList, setStaffList] = useState(staff);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState('');
  const pageSize = 20; // Tối đa 1 trang 20 số lượng theo yêu cầu

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Add new staff form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDept, setNewDept] = useState('PĐT');
  const [newLevel, setNewLevel] = useState('Chuyên viên');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleEdit = (s) => {
    setSelectedStaff(s);
    setModalOpen(true);
  };

  const handleSaveStaff = (updated) => {
    setStaffList((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
    showToast(`Đã cập nhật thông tin cán bộ ${updated.name}!`);
  };

  const handleAddStaff = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    const newMember = {
      id: Date.now(),
      name: newName.trim(),
      email: newEmail.trim(),
      department: newDept,
      level: newLevel,
      status: 'active',
    };

    setStaffList([...staffList, newMember]);
    setIsAddModalOpen(false);
    setNewName('');
    setNewEmail('');
    showToast(`Đã thêm thành công cán bộ ${newMember.name}!`);
  };

  // Filter staff members
  const filteredStaff = staffList.filter((s) => {
    if (filterDept && s.department !== filterDept) return false;
    if (filterLevel && s.level !== filterLevel) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.level.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / pageSize));
  const paginatedStaff = filteredStaff.slice(
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
    <div className="staff-tab-wrapper">
      {toastMessage && (
        <div className="staff-toast-banner">
          <span className="staff-toast-icon">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Staff Card Container */}
      <div className="staff-card-container">
        {/* Filter and Action Row */}
        <div className="staff-filter-row">
          <div className="staff-search-box">
            <input
              type="text"
              className="staff-search-input"
              placeholder="⌕ Tìm theo tên, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="staff-filter-select-box">
            <select
              className="staff-filter-select"
              value={filterDept}
              onChange={(e) => {
                setFilterDept(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Phòng ban</option>
              <option value="PĐT">PĐT</option>
              <option value="PCTSV">PCTSV</option>
              <option value="PKHTC">PKHTC</option>
            </select>
            <span className="staff-filter-arrow">▾</span>
          </div>

          <div className="staff-filter-select-box">
            <select
              className="staff-filter-select"
              value={filterLevel}
              onChange={(e) => {
                setFilterLevel(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Cấp</option>
              <option value="Chuyên viên">Chuyên viên</option>
              <option value="Trưởng phòng">Trưởng phòng</option>
            </select>
            <span className="staff-filter-arrow">▾</span>
          </div>

          <button
            type="button"
            className="staff-add-btn"
            onClick={() => setIsAddModalOpen(true)}
          >
            + Thêm cán bộ
          </button>
        </div>

        <div style={{ height: 10, width: '100%' }} />

        {/* Table Container */}
        <div className="staff-table-container">
          {/* Header Row */}
          <div className="staff-th-row">
            <div className="staff-th-col">Họ tên</div>
            <div className="staff-th-col">Email</div>
            <div className="staff-th-col">Phòng ban</div>
            <div className="staff-th-col">Cấp</div>
            <div className="staff-th-col">Trạng thái</div>
            <div className="staff-th-col">Thao tác</div>
          </div>
          <div className="staff-divider" />

          {/* Data Rows */}
          {paginatedStaff.length === 0 ? (
            <div className="staff-empty-state">
              Không tìm thấy cán bộ nào phù hợp.
            </div>
          ) : (
            paginatedStaff.map((s) => {
              const statusCfg = staffStatusMap[s.status] || {
                label: 'Hoạt động',
                color: '#168039',
                bg: '#DCFCE7',
              };

              const isManager = s.level === 'Trưởng phòng';

              return (
                <React.Fragment key={s.id}>
                  <div className="staff-tr-row">
                    <div className="staff-td-col" style={{ fontWeight: 400 }}>
                      {s.name}
                    </div>
                    <div className="staff-td-col">{s.email}</div>
                    <div className="staff-td-col">
                      <span className="staff-badge-dept">{s.department}</span>
                    </div>
                    <div className="staff-td-col">
                      <span
                        className={`staff-badge-level ${
                          isManager ? 'staff-badge-level--manager' : 'staff-badge-level--staff'
                        }`}
                      >
                        {s.level}
                      </span>
                    </div>
                    <div className="staff-td-col">
                      <span
                        className="staff-badge-status"
                        style={{
                          backgroundColor: statusCfg.bg,
                          color: statusCfg.color,
                        }}
                      >
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="staff-td-col">
                      <button
                        type="button"
                        className="staff-edit-btn"
                        onClick={() => handleEdit(s)}
                      >
                        Sửa
                      </button>
                    </div>
                  </div>
                  <div className="staff-divider" />
                </React.Fragment>
              );
            })
          )}
        </div>

        <div style={{ height: 12, width: '100%' }} />

        {/* Pagination Row */}
        <div className="staff-pagination-row">
          <div className="staff-pagination-info">
            Hiển thị <strong>{filteredStaff.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredStaff.length)}</strong> / <strong>{filteredStaff.length}</strong> cán bộ
          </div>

          <div style={{ flex: '1 1 0' }} />

          <button
            type="button"
            className="staff-page-arrow"
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
                  className="staff-page-dots-btn"
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
                  className="staff-page-dots-btn"
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
                className={`staff-page-btn ${currentPage === item ? 'active-page' : ''}`}
                onClick={() => setCurrentPage(item)}
              >
                {item}
              </button>
            );
          })}

          <button
            type="button"
            className="staff-page-arrow"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            title="Trang sau"
            aria-label="Trang sau"
          >
            →
          </button>

          <div className="staff-jump-box">
            <span className="staff-jump-label">Đến trang</span>
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
              className="staff-jump-input"
            />
          </div>
        </div>
      </div>

      {/* Edit Staff Modal */}
      {modalOpen && (
        <EditStaffModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          staff={selectedStaff}
          onSave={handleSaveStaff}
        />
      )}

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Thêm tài khoản cán bộ mới"
          subtitle="Cán bộ sẽ được cấp quyền theo phân công nhiệm vụ của phòng ban"
        >
          <form onSubmit={handleAddStaff}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="modal-field">
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }}>
                  Họ và tên <span style={{ color: '#AA2327' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E5EA', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                  placeholder="Nhập họ và tên..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="modal-field">
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }}>
                  Email VJU <span style={{ color: '#AA2327' }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E5EA', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                  placeholder="name.lh@vju.ac.vn"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>

              <div className="modal-field">
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }}>
                  Phòng ban
                </label>
                <select
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E5EA', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                >
                  <option value="PĐT">Phòng Đào tạo (PĐT)</option>
                  <option value="PCTSV">Phòng Công tác Sinh viên (PCTSV)</option>
                  <option value="PKHTC">Phòng Kế hoạch Tài chính (PKHTC)</option>
                </select>
              </div>

              <div className="modal-field">
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }}>
                  Cấp phê duyệt
                </label>
                <select
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E5EA', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                  value={newLevel}
                  onChange={(e) => setNewLevel(e.target.value)}
                >
                  <option value="Chuyên viên">Chuyên viên</option>
                  <option value="Trưởng phòng">Trưởng phòng</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button variant="secondary" type="button" onClick={() => setIsAddModalOpen(false)}>
                Hủy
              </Button>
              <Button variant="primary" type="submit">
                Thêm cán bộ
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default StaffTab;