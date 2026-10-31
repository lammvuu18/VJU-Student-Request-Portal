import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomDropdown from '../common/CustomDropdown';
import DateRangePicker from '../common/DateRangePicker';
import { studentOverviewRequests } from '../../data/mockData';
import './StudentPages.css';

const procedureOptions = [
  { value: 'all', label: 'Tất cả thủ tục' },
  { value: 'Cấp bảng điểm', label: 'Cấp bảng điểm' },
  { value: 'Xác nhận sinh viên', label: 'Xác nhận sinh viên' },
  { value: 'Cấp lại thẻ sinh viên', label: 'Cấp lại thẻ sinh viên' },
  { value: 'Xác nhận học phí', label: 'Xác nhận học phí' },
  { value: 'Phúc khảo bài thi', label: 'Phúc khảo bài thi' },
  { value: 'Đổi mã học phần', label: 'Đổi mã học phần' },
  { value: 'Cấp giấy xác nhận', label: 'Cấp giấy xác nhận' },
  { value: 'Thay đổi thông tin', label: 'Thay đổi thông tin' },
  { value: 'Rút hồ sơ', label: 'Rút hồ sơ' },
];

const statusOptions = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'Đang xử lý', label: 'Đang xử lý' },
  { value: 'Cần bổ sung', label: 'Cần bổ sung' },
  { value: 'Chờ thanh toán', label: 'Chờ thanh toán' },
  { value: 'Hoàn thành', label: 'Hoàn thành' },
  { value: 'Đã hủy', label: 'Đã hủy' },
];

function StudentDashboard() {
  const navigate = useNavigate();
  const [filterProcedure, setFilterProcedure] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState('');
  const pageSize = 10;

  const parseReqDate = (dStr) => {
    if (!dStr) return null;
    const parts = dStr.split('/');
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
  };

  const requests = (studentOverviewRequests && studentOverviewRequests.length > 0)
    ? studentOverviewRequests.slice(0, 50)
    : [];

  const filtered = requests.filter((r) => {
    // 1. Procedure Filter
    if (filterProcedure !== 'all' && r.procedure !== filterProcedure) {
      return false;
    }

    // 2. Status Filter
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;

    // 3. Date Range Filter
    if (dateRange && dateRange.startDate && dateRange.endDate) {
      const reqD = parseReqDate(r.date);
      const startD = parseReqDate(dateRange.startDate);
      const endD = parseReqDate(dateRange.endDate);
      if (reqD && startD && endD) {
        if (reqD < startD || reqD > endD) return false;
      }
    }

    // 4. Search Filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const codeMatch = r.id.toLowerCase().includes(q) || (r.request_code && r.request_code.toLowerCase().includes(q));
      const procMatch = r.procedure.toLowerCase().includes(q);
      const dateMatch = r.date.toLowerCase().includes(q);
      const statusMatch = r.status.toLowerCase().includes(q);
      if (!codeMatch && !procMatch && !dateMatch && !statusMatch) return false;
    }

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
    <div className="student-overview-page">
      {/* Top Greeting & Action Header */}
      <div className="overview-header-row">
        <h1 className="overview-greeting-title">Chào Minh Anh, ngày mới tốt lành!</h1>
        <button
          className="btn-new-request"
          onClick={() => navigate('/student/procedures')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Nộp yêu cầu mới</span>
        </button>
      </div>

      {/* 5 Status Cards */}
      <div className="overview-stat-row">
        {/* Card 1: 02 Đang xử lý */}
        <div
          className={`overview-stat-card ${filterStatus === 'Đang xử lý' ? 'overview-stat-card--active' : ''}`}
          onClick={() => {
            setFilterStatus(prev => prev === 'Đang xử lý' ? 'all' : 'Đang xử lý');
            setCurrentPage(1);
          }}
          style={{ cursor: 'pointer' }}
          title="Bấm để lọc yêu cầu đang xử lý"
        >
          <div className="stat-card-number">02</div>
          <div className="stat-card-footer">
            <svg className="stat-card-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#68717D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="stat-card-label">Đang xử lý</span>
          </div>
        </div>

        {/* Card 2: 01 Cần bổ sung (Red Bar & Red Text) */}
        <div
          className={`overview-stat-card border-red ${filterStatus === 'Cần bổ sung' ? 'overview-stat-card--active' : ''}`}
          onClick={() => {
            setFilterStatus(prev => prev === 'Cần bổ sung' ? 'all' : 'Cần bổ sung');
            setCurrentPage(1);
          }}
          style={{ cursor: 'pointer' }}
          title="Bấm để lọc yêu cầu cần bổ sung"
        >
          <div className="stat-card-red-bar" />
          <div className="stat-card-number text-red">01</div>
          <div className="stat-card-footer">
            <svg className="stat-card-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#68717D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="stat-card-label">Cần bổ sung</span>
          </div>
        </div>

        {/* Card 3: 01 Chờ thanh toán (Red Bar & Red Text) */}
        <div
          className={`overview-stat-card border-red ${filterStatus === 'Chờ thanh toán' ? 'overview-stat-card--active' : ''}`}
          onClick={() => {
            setFilterStatus(prev => prev === 'Chờ thanh toán' ? 'all' : 'Chờ thanh toán');
            setCurrentPage(1);
          }}
          style={{ cursor: 'pointer' }}
          title="Bấm để lọc yêu cầu chờ thanh toán"
        >
          <div className="stat-card-red-bar" />
          <div className="stat-card-number text-red">01</div>
          <div className="stat-card-footer">
            <svg className="stat-card-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#68717D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            <span className="stat-card-label">Chờ thanh toán</span>
          </div>
        </div>

        {/* Card 4: 08 Hoàn thành */}
        <div
          className={`overview-stat-card ${filterStatus === 'Hoàn thành' ? 'overview-stat-card--active' : ''}`}
          onClick={() => {
            setFilterStatus(prev => prev === 'Hoàn thành' ? 'all' : 'Hoàn thành');
            setCurrentPage(1);
          }}
          style={{ cursor: 'pointer' }}
          title="Bấm để lọc yêu cầu hoàn thành"
        >
          <div className="stat-card-number">08</div>
          <div className="stat-card-footer">
            <svg className="stat-card-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#68717D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="stat-card-label">Hoàn thành</span>
          </div>
        </div>

        {/* Card 5: 02 Đã hủy */}
        <div
          className={`overview-stat-card ${filterStatus === 'Đã hủy' ? 'overview-stat-card--active' : ''}`}
          onClick={() => {
            setFilterStatus(prev => prev === 'Đã hủy' ? 'all' : 'Đã hủy');
            setCurrentPage(1);
          }}
          style={{ cursor: 'pointer' }}
          title="Bấm để lọc yêu cầu đã hủy"
        >
          <div className="stat-card-number">02</div>
          <div className="stat-card-footer">
            <svg className="stat-card-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#68717D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span className="stat-card-label">Đã hủy</span>
          </div>
        </div>
      </div>

      {/* Main Container Card: "Danh mục của tôi" */}
      <div className="overview-main-card">
        <h2 className="overview-main-card-title">Danh mục của tôi</h2>

        {/* Filter Bar with Figma Dropdowns & DateRangePicker */}
        <div className="overview-filter-bar">
          <CustomDropdown
            value={filterProcedure}
            options={procedureOptions}
            placeholder="Lọc theo thủ tục"
            width={180}
            onChange={(val) => {
              setFilterProcedure(val);
              setCurrentPage(1);
            }}
          />

          <CustomDropdown
            value={filterStatus}
            options={statusOptions}
            placeholder="Lọc theo trạng thái"
            width={180}
            onChange={(val) => {
              setFilterStatus(val);
              setCurrentPage(1);
            }}
          />

          <DateRangePicker
            startDate={dateRange?.startDate}
            endDate={dateRange?.endDate}
            onChange={(newRange) => {
              setDateRange(newRange);
              setCurrentPage(1);
            }}
            onClear={() => {
              setDateRange(null);
              setCurrentPage(1);
            }}
          />

          <div className="overview-search-box">
            <svg className="overview-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#68717D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="overview-search-input"
              placeholder="Tìm kiếm"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* Table Container & Layout */}
        <div className="overview-table-container">
          <table className="overview-table">
            <thead>
              <tr>
                <th style={{ width: '150px' }}>Mã yêu cầu</th>
                <th>Thủ tục</th>
                <th style={{ width: '130px' }}>Ngày gửi</th>
                <th style={{ width: '160px' }}>Trạng thái</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#68717D' }}>
                    Không có yêu cầu nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                paginated.map((req) => {
                  const isRedPill = req.status === 'Chờ thanh toán' || req.status === 'Đang xử lý' || req.status === 'Cần bổ sung';
                  return (
                    <tr key={req.id}>
                      <td className="cell-code">{req.id}</td>
                      <td className="cell-proc">{req.procedure}</td>
                      <td className="cell-date">{req.date}</td>
                      <td>
                        <div className="status-pill-wrapper">
                          <span className={`status-pill ${isRedPill ? 'pill-red' : 'pill-gray'}`}>
                            {req.status}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn-view-detail"
                          onClick={() => navigate(`/student/request/${req.id}`)}
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination matching exact Figma design */}
        <div className="student-overview-pagination-row">
          <div className="student-overview-pagination-info">
            Hiển thị <strong>{filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filtered.length)}</strong> / <strong>{filtered.length}</strong> yêu cầu
          </div>

          <div style={{ flex: '1 1 0' }} />

          <button
            type="button"
            className="student-overview-page-arrow"
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
                  className="student-overview-page-dots-btn"
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
                  className="student-overview-page-dots-btn"
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
                className={`student-overview-page-btn ${currentPage === item ? 'active-page' : ''}`}
                onClick={() => setCurrentPage(item)}
              >
                {item}
              </button>
            );
          })}

          <button
            type="button"
            className="student-overview-page-arrow"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            title="Trang sau"
            aria-label="Trang sau"
          >
            →
          </button>

          <div className="student-overview-jump-box">
            <span className="student-overview-jump-label">Đến trang</span>
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
              className="student-overview-jump-input"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
