import React, { useState } from 'react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import EditStaffModal from '../modals/EditStaffModal';
import { staff, staffStatusMap, departmentBadgeColors } from '../../data/mockData';
import './StaffTab.css';

function StaffTab() {
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  const handleEdit = (s) => {
    setSelectedStaff(s);
    setModalOpen(true);
  };

  return (
    <div className="staff-tab">
      <div className="tab-filter-bar">
        <div className="filter-search" style={{ flex: 1, maxWidth: 420 }}>
          <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="#9CA3AF" strokeWidth="1.5"/>
            <path d="M11 11l3.5 3.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Tìm theo tên, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
          <option value="">Phòng ban</option>
          <option value="PĐT">Phòng Đào tạo</option>
          <option value="PCTSV">Phòng CTSV</option>
          <option value="PKHTC">Phòng KHTC</option>
        </select>
        <select className="filter-select" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
          <option value="">Cấp</option>
          <option value="Chuyên viên">Chuyên viên</option>
          <option value="Trưởng phòng">Trưởng phòng</option>
        </select>
        <Button variant="primary">+ Thêm cán bộ</Button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Email</th>
              <th>Phòng ban</th>
              <th>Cấp</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const status = staffStatusMap[s.status];
              const deptColor = departmentBadgeColors[s.department] || { color: '#6B7280', bg: '#F3F4F6' };
              return (
                <tr key={s.id}>
                  <td className="col-name">{s.name}</td>
                  <td className="col-email">{s.email}</td>
                  <td>
                    <Badge label={s.department} color={deptColor.color} bg={deptColor.bg} variant="department" />
                  </td>
                  <td>
                    <span className={`level-text ${s.level === 'Trưởng phòng' ? 'level-head' : ''}`}>
                      {s.level}
                    </span>
                  </td>
                  <td>
                    <Badge label={status.label} color={status.color} bg={status.bg} />
                  </td>
                  <td>
                    <Button variant="outline-red" size="sm" onClick={() => handleEdit(s)}>
                      Sửa
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <EditStaffModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        staff={selectedStaff}
      />
    </div>
  );
}

export default StaffTab;
