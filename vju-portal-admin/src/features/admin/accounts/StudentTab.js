import React, { useState, useRef } from 'react';
import EditStudentModal from './modals/EditStudentModal';
import { students, studentStatusMap } from '../../../data/mockData';
import './StudentTab.css';

function StudentTab() {
  const [studentList, setStudentList] = useState(students);
  const [search, setSearch] = useState('');
  const [filterKhoa, setFilterKhoa] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState('');
  const pageSize = 8; // 8 rows per page to match Figma spec

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const fileInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleEdit = (student) => {
    setSelectedStudent(student);
    setModalOpen(true);
  };

  const handleSaveStudent = (updated) => {
    setStudentList((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
    showToast(`Đã cập nhật thông tin sinh viên ${updated.name} (${updated.mssv})!`);
  };

  const handleImportExcel = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const imported = [
        {
          id: Date.now() + 1,
          name: 'Nguyễn Văn Hải Đăng',
          mssv: '23110201',
          email: '23110201@vnu.edu.vn',
          classGroup: 'QH-2023-I/CQ-M',
          status: 'studying',
        },
        {
          id: Date.now() + 2,
          name: 'Lê Thùy Dương',
          mssv: '23110202',
          email: '23110202@vnu.edu.vn',
          classGroup: 'QH-2023-I/CQ-M',
          status: 'studying',
        },
      ];
      setStudentList([...imported, ...studentList]);
      showToast(`Đã import thành công danh sách từ tệp "${file.name}"!`);
    }
  };

  // Filter students
  const filteredStudents = studentList.filter((s) => {
    if (filterStatus) {
      if (filterStatus === 'studying' && s.status !== 'studying') return false;
      if (filterStatus === 'reserved' && s.status !== 'reserved') return false;
      if (filterStatus === 'graduated' && s.status !== 'graduated' && s.status !== 'quit')
        return false;
    }
    if (filterKhoa && !s.classGroup.includes(filterKhoa)) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.mssv.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.classGroup && s.classGroup.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const paginatedStudents = filteredStudents.slice(
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
    <div className="student-tab-wrapper">
      {toastMessage && (
        <div className="student-toast-banner">
          <span className="student-toast-icon">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Card Container */}
      <div className="student-card-container">
        {/* Filter and Action Bar */}
        <div className="student-filter-row">
          <div className="student-search-box">
            <input
              type="text"
              className="student-search-input"
              placeholder="⌕ Tìm theo tên, MSSV, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="student-filter-select-box">
            <select
              className="student-filter-select"
              value={filterKhoa}
              onChange={(e) => {
                setFilterKhoa(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Khóa</option>
              <option value="QH-2023">Khóa QH-2023</option>
              <option value="QH-2022">Khóa QH-2022</option>
              <option value="QH-2021">Khóa QH-2021</option>
            </select>
            <span className="student-filter-arrow">▾</span>
          </div>

          <div className="student-filter-select-box">
            <select
              className="student-filter-select"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Trạng thái</option>
              <option value="studying">Đang học</option>
              <option value="reserved">Bảo lưu</option>
              <option value="graduated">Đã TN</option>
            </select>
            <span className="student-filter-arrow">▾</span>
          </div>

          <button
            type="button"
            className="student-import-btn"
            onClick={handleImportExcel}
          >
            Import Excel
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
          />
        </div>

        <div style={{ height: 10, width: '100%' }} />

        {/* Table Container */}
        <div className="student-table-container">
          {/* Table Header Row */}
          <div className="student-th-row">
            <div className="student-th-col">Họ tên</div>
            <div className="student-th-col">MSSV</div>
            <div className="student-th-col">Email</div>
            <div className="student-th-col">Lớp/Khóa</div>
            <div className="student-th-col">Trạng thái</div>
            <div className="student-th-col">Thao tác</div>
          </div>
          <div className="student-divider" />

          {/* Data Rows */}
          {paginatedStudents.length === 0 ? (
            <div className="student-empty-state">
              Không tìm thấy sinh viên nào phù hợp.
            </div>
          ) : (
            paginatedStudents.map((s) => {
              const statusCfg = studentStatusMap[s.status] || {
                label: 'Đang học',
                color: '#168039',
                bg: '#DCFCE7',
              };

              return (
                <React.Fragment key={s.id}>
                  <div className="student-tr-row">
                    <div className="student-td-col" style={{ fontWeight: 500 }}>
                      {s.name}
                    </div>
                    <div className="student-td-col">{s.mssv}</div>
                    <div className="student-td-col">{s.email}</div>
                    <div className="student-td-col">{s.classGroup}</div>
                    <div className="student-td-col">
                      <span
                        className="student-badge-pill"
                        style={{
                          backgroundColor: statusCfg.bg,
                          color: statusCfg.color,
                        }}
                      >
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="student-td-col">
                      <button
                        type="button"
                        className="student-edit-btn"
                        onClick={() => handleEdit(s)}
                      >
                        Sửa
                      </button>
                    </div>
                  </div>
                  <div className="student-divider" />
                </React.Fragment>
              );
            })
          )}
        </div>

        <div style={{ height: 12, width: '100%' }} />

        {/* Pagination Row */}
        <div className="student-pagination-row">
          <div className="student-pagination-info">
            Hiển thị <strong>{filteredStudents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredStudents.length)}</strong> / <strong>{filteredStudents.length}</strong> sinh viên
          </div>

          <div style={{ flex: '1 1 0' }} />

          <button
            type="button"
            className="student-page-arrow"
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
                  className="student-page-dots-btn"
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
                  className="student-page-dots-btn"
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
                className={`student-page-btn ${currentPage === item ? 'active-page' : ''}`}
                onClick={() => setCurrentPage(item)}
              >
                {item}
              </button>
            );
          })}

          <button
            type="button"
            className="student-page-arrow"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            title="Trang sau"
            aria-label="Trang sau"
          >
            →
          </button>

          <div className="student-jump-box">
            <span className="student-jump-label">Đến trang</span>
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
              className="student-jump-input"
            />
          </div>
        </div>
      </div>

      {/* Edit Student Modal */}
      {modalOpen && (
        <EditStudentModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          student={selectedStudent}
          onSave={handleSaveStudent}
        />
      )}
    </div>
  );
}

export default StudentTab;