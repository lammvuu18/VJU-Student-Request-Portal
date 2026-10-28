import React, { useState } from 'react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Pagination from '../common/Pagination';
import EditStudentModal from '../modals/EditStudentModal';
import { students, studentStatusMap } from '../../data/mockData';
import './StudentTab.css';

function StudentTab() {
  const [search, setSearch] = useState('');
  const [filterKhoa, setFilterKhoa] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const handleEdit = (student) => {
    setSelectedStudent(student);
    setModalOpen(true);
  };

  return (
    <div className="student-tab">
      <div className="tab-filter-bar">
        <div className="filter-search" style={{ flex: 1, maxWidth: 420 }}>
          <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="#9CA3AF" strokeWidth="1.5"/>
            <path d="M11 11l3.5 3.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Tìm theo tên, MSSV, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" value={filterKhoa} onChange={(e) => setFilterKhoa(e.target.value)}>
          <option value="">Khóa</option>
          <option value="QH-2023">QH-2023</option>
          <option value="QH-2022">QH-2022</option>
          <option value="QH-2021">QH-2021</option>
        </select>
        <select className="filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Trạng thái</option>
          <option value="studying">Đang học</option>
          <option value="reserved">Bảo lưu</option>
          <option value="quit">Đỗ TN</option>
        </select>
        <Button variant="primary">Import Excel</Button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>MSSV</th>
              <th>Email</th>
              <th>Lớp/Khóa</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const status = studentStatusMap[s.status];
              return (
                <tr key={s.id}>
                  <td className="col-name">{s.name}</td>
                  <td>{s.mssv}</td>
                  <td className="col-email">{s.email}</td>
                  <td>{s.classGroup}</td>
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

      <Pagination currentPage={currentPage} totalPages={12} onPageChange={setCurrentPage} />

      <EditStudentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        student={selectedStudent}
      />
    </div>
  );
}

export default StudentTab;
