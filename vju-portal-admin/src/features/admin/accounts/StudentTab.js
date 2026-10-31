import React, { useState } from 'react';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import Pagination from '../../../components/common/Pagination';
import Modal from '../../../components/common/Modal';
import EditStudentModal from './modals/EditStudentModal';
import { students, studentStatusMap } from '../../../data/mockData';
import './StudentTab.css';

function StudentTab() {
  const [studentList, setStudentList] = useState(students);
  const [search, setSearch] = useState('');
  const [filterKhoa, setFilterKhoa] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Add new student form state
  const [newName, setNewName] = useState('');
  const [newMssv, setNewMssv] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newClass, setNewClass] = useState('QH-2023-I/CQ-M');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleEdit = (student) => {
    setSelectedStudent(student);
    setModalOpen(true);
  };

  const handleSaveStudent = (updated) => {
    setStudentList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    showToast(`Đã cập nhật thông tin sinh viên ${updated.name} (${updated.mssv})!`);
  };

  const handleAddStudent = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newMssv.trim()) return;

    const newStudent = {
      id: Date.now(),
      name: newName.trim(),
      mssv: newMssv.trim(),
      email: newEmail.trim() || `${newMssv.trim()}@vnu.edu.vn`,
      classGroup: newClass,
      status: 'studying',
    };

    setStudentList([newStudent, ...studentList]);
    setIsAddModalOpen(false);
    setNewName('');
    setNewMssv('');
    setNewEmail('');
    showToast(`Đã thêm thành công sinh viên ${newStudent.name}!`);
  };

  const handleImportExcel = () => {
    const imported = [
      { id: Date.now() + 1, name: 'Nguyễn Văn Hải Đăng', mssv: '23110201', email: '23110201@vnu.edu.vn', classGroup: 'QH-2023-I/CQ-M-CLC', status: 'studying' },
      { id: Date.now() + 2, name: 'Lê Thùy Dương', mssv: '23110202', email: '23110202@vnu.edu.vn', classGroup: 'QH-2023-I/CQ-M', status: 'studying' },
      { id: Date.now() + 3, name: 'Trần Gia Bảo', mssv: '22110203', email: '22110203@vnu.edu.vn', classGroup: 'QH-2022-I/CQ-M', status: 'reserved' },
    ];
    setStudentList([...imported, ...studentList]);
    showToast('Đã import thành công 3 sinh viên mẫu từ file Excel!');
  };

  const filteredStudents = studentList.filter((s) => {
    if (filterStatus && s.status !== filterStatus) return false;
    if (filterKhoa && !s.classGroup.includes(filterKhoa)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.mssv.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="student-tab">
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
            placeholder="Tìm theo tên, MSSV, email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <select
          className="filter-select"
          value={filterKhoa}
          onChange={(e) => {
            setFilterKhoa(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">Tất cả các khóa</option>
          <option value="QH-2023">Khóa QH-2023</option>
          <option value="QH-2022">Khóa QH-2022</option>
          <option value="QH-2021">Khóa QH-2021</option>
        </select>
        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="studying">Đang học</option>
          <option value="reserved">Bảo lưu</option>
          <option value="quit">Đã tốt nghiệp</option>
        </select>

        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <Button variant="secondary" onClick={handleImportExcel}>
            Import Excel
          </Button>
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
            + Thêm sinh viên
          </Button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
              <th>Họ và tên</th>
              <th>MSSV</th>
              <th>Email</th>
              <th>Lớp</th>
              <th>Khóa</th>
              <th>Trạng thái</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedStudents.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#9CA3AF' }}>
                  Không tìm thấy sinh viên nào
                </td>
              </tr>
            ) : (
              paginatedStudents.map((s, index) => {
                const stt = (currentPage - 1) * pageSize + index + 1;
                const status = studentStatusMap[s.status] || { label: s.status, color: '#6B7280', bg: '#F3F4F6' };
                const khoa = s.classGroup?.split('-')[1] ? `QH-${s.classGroup.split('-')[1]}` : 'QH-2022';
                return (
                  <tr key={s.id}>
                    <td style={{ textAlign: 'center', color: '#68717D', fontWeight: 600, fontSize: '13px' }}>
                      {String(stt).padStart(2, '0')}
                    </td>
                    <td className="col-name">{s.name}</td>
                    <td>{s.mssv}</td>
                    <td className="col-email">{s.email}</td>
                    <td>{s.classGroup}</td>
                    <td>{khoa}</td>
                    <td>
                      <Badge label={status.label} color={status.color} bg={status.bg} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Button variant="outline-red" size="sm" onClick={() => handleEdit(s)}>
                        Chỉnh sửa
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ marginTop: 16 }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Edit Modal */}
      <EditStudentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        student={selectedStudent}
        onSave={handleSaveStudent}
      />

      {/* Add Student Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm tài khoản sinh viên"
      >
        <form onSubmit={handleAddStudent}>
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
            <label>Mã số sinh viên (MSSV) <span style={{ color: '#DC2626' }}>*</span></label>
            <input
              type="text"
              placeholder="Ví dụ: 23110299"
              value={newMssv}
              onChange={(e) => setNewMssv(e.target.value)}
              required
            />
          </div>

          <div className="modal-field">
            <label>Email VNU</label>
            <input
              type="email"
              placeholder="Ví dụ: 23110299@vnu.edu.vn"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>

          <div className="modal-field">
            <label>Lớp hành chính</label>
            <select value={newClass} onChange={(e) => setNewClass(e.target.value)}>
              <option value="QH-2023-I/CQ-M-CLC">QH-2023-I/CQ-M-CLC</option>
              <option value="QH-2023-I/CQ-M">QH-2023-I/CQ-M</option>
              <option value="QH-2022-I/CQ-M-CLC">QH-2022-I/CQ-M-CLC</option>
              <option value="QH-2022-I/CQ-M">QH-2022-I/CQ-M</option>
              <option value="QH-2021-I/CQ-M">QH-2021-I/CQ-M</option>
            </select>
          </div>

          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={() => setIsAddModalOpen(false)}>Hủy</Button>
            <Button variant="primary" type="submit">Thêm sinh viên</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default StudentTab;
