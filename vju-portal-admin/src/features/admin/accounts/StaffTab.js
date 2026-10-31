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
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="staff-filter-select-box">
            <select
              className="staff-filter-select"
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
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
              onChange={(e) => setFilterLevel(e.target.value)}
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
          {filteredStaff.length === 0 ? (
            <div className="staff-empty-state">
              Không tìm thấy cán bộ nào phù hợp.
            </div>
          ) : (
            filteredStaff.map((s) => {
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