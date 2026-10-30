import React, { useState } from 'react';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import EditStaffModal from './modals/EditStaffModal';
import { staff, staffStatusMap, departmentBadgeColors } from '../../../data/mockData';
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
    setStaffList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
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

    setStaffList([newMember, ...staffList]);
    setIsAddModalOpen(false);
    setNewName('');
    setNewEmail('');
    showToast(`Đã thêm thành công cán bộ ${newMember.name}!`);
  };

  const handleToggleStatus = (id) => {
    setStaffList((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const nextStatus = s.status === 'active' ? 'locked' : 'active';
          showToast(`Đã ${nextStatus === 'active' ? 'kích hoạt' : 'khóa'} tài khoản ${s.name}`);
          return { ...s, status: nextStatus };
        }
        return s;
      })
    );
  };

  const handleDeleteStaff = (id, name) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa tài khoản cán bộ "${name}"?`)) {
      setStaffList((prev) => prev.filter((s) => s.id !== id));
      showToast(`Đã xóa tài khoản cán bộ "${name}"`);
    }
  };

  const filteredStaff = staffList.filter((s) => {
    if (filterDept && s.department !== filterDept) return false;
    if (filterLevel && s.level !== filterLevel) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="staff-tab">
      {toastMessage && (
        <div style={{
          backgroundColor: '#ECFDF5',
          color: '#059669',
          border: '1px solid #A7F3D0',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 16,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="tab-filter-bar">
        <div className="filter-search" style={{ flex: 1, maxWidth: 360 }}>
          <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="#9CA3AF" strokeWidth="1.5"/>
            <path d="M11 11l3.5 3.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Tìm theo tên, email cán bộ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
          <option value="">Tất cả phòng ban</option>
          <option value="PĐT">Phòng Đào tạo (PĐT)</option>
          <option value="PCTSV">Phòng CTSV (PCTSV)</option>
          <option value="PKHTC">Phòng KHTC (PKHTC)</option>
        </select>
        <select className="filter-select" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
          <option value="">Tất cả các cấp</option>
          <option value="Chuyên viên">Chuyên viên</option>
          <option value="Trưởng phòng">Trưởng phòng</option>
        </select>
        <Button variant="primary" style={{ marginLeft: 'auto' }} onClick={() => setIsAddModalOpen(true)}>
          + Thêm cán bộ
        </Button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Họ và tên</th>
              <th>Email VJU</th>
              <th>Phòng ban</th>
              <th>Chức danh / Cấp</th>
              <th>Trạng thái</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#9CA3AF' }}>
                  Không tìm thấy cán bộ nào phù hợp với bộ lọc
                </td>
              </tr>
            ) : (
              filteredStaff.map((s) => {
                const status = staffStatusMap[s.status] || { label: s.status, color: '#6B7280', bg: '#F3F4F6' };
                const deptColor = departmentBadgeColors[s.department] || { color: '#6B7280', bg: '#F3F4F6' };
                return (
                  <tr key={s.id}>
                    <td className="col-name">{s.name}</td>
                    <td className="col-email">{s.email}</td>
                    <td>
                      <Badge label={s.department} color={deptColor.color} bg={deptColor.bg} />
                    </td>
                    <td>
                      <span className={`level-text ${s.level === 'Trưởng phòng' ? 'level-head' : ''}`}>
                        {s.level}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{ cursor: 'pointer' }}
                        title="Nhấp để đổi trạng thái"
                        onClick={() => handleToggleStatus(s.id)}
                      >
                        <Badge label={status.label} color={status.color} bg={status.bg} />
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                        <Button variant="outline-red" size="sm" onClick={() => handleEdit(s)}>
                          Chỉnh sửa
                        </Button>
                        <button
                          title="Xóa tài khoản"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '6px',
                            color: '#9CA3AF',
                          }}
                          onClick={() => handleDeleteStaff(s.id, s.name)}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3 4h10M6 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M4.5 4l.8 9.2a1 1 0 001 .8h3.4a1 1 0 001-.8L11.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Staff Modal */}
      <EditStaffModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        staff={selectedStaff}
        onSave={handleSaveStaff}
      />

      {/* Add Staff Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm tài khoản cán bộ mới"
      >
        <form onSubmit={handleAddStaff}>
          <div className="modal-field">
            <label>Họ và tên <span style={{ color: '#DC2626' }}>*</span></label>
            <input
              type="text"
              placeholder="Ví dụ: Hoàng Đình Trọng"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>

          <div className="modal-field">
            <label>Email VJU <span style={{ color: '#DC2626' }}>*</span></label>
            <input
              type="email"
              placeholder="Ví dụ: trong.hd@vju.ac.vn"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
          </div>

          <div className="modal-field">
            <label>Phòng ban</label>
            <select value={newDept} onChange={(e) => setNewDept(e.target.value)}>
              <option value="PĐT">Phòng Đào tạo (PĐT)</option>
              <option value="PCTSV">Phòng Công tác sinh viên (PCTSV)</option>
              <option value="PKHTC">Phòng Kế hoạch tài chính (PKHTC)</option>
            </select>
          </div>

          <div className="modal-field">
            <label>Chức vụ / Cấp phê duyệt</label>
            <select value={newLevel} onChange={(e) => setNewLevel(e.target.value)}>
              <option value="Chuyên viên">Chuyên viên — Cấp 1</option>
              <option value="Trưởng phòng">Trưởng phòng — Cấp 2</option>
            </select>
          </div>

          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={() => setIsAddModalOpen(false)}>Hủy</Button>
            <Button variant="primary" type="submit">Thêm cán bộ</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default StaffTab;
