import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentOverviewRequests } from '../../data/mockData';
import './StudentPages.css';

function StudentDashboard() {
  const navigate = useNavigate();
  const [filterProcedure, setFilterProcedure] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [search, setSearch] = useState('');

  const requests = studentOverviewRequests || [];

  const filtered = requests.filter((r) => {
    if (filterProcedure !== 'all' && r.procedure !== filterProcedure) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
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

  return (
    <div className="student-overview-page">
      {/* Top Greeting & Action Header */}
      <div className="overview-header-row">
        <h1 className="overview-greeting-title">Chào Minh Anh, ngày mới tốt lành!</h1>
        <button
          className="btn-new-request"
          onClick={() => navigate('/student/procedures')}
        >
          <span className="btn-plus-icon">+</span> Nộp yêu cầu mới
        </button>
      </div>

      {/* 5 Status Cards */}
      <div className="overview-stat-row">
        {/* Card 1: 02 Đang xử lý */}
        <div className="overview-stat-card">
          <div className="stat-card-number">02</div>
          <div className="stat-card-footer">
            <svg className="stat-card-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="stat-card-label">Đang xử lý</span>
          </div>
        </div>

        {/* Card 2: 01 Cần bổ sung (Red Highlight) */}
        <div className="overview-stat-card border-red">
          <div className="stat-card-number text-red">01</div>
          <div className="stat-card-footer">
            <svg className="stat-card-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="stat-card-label">Cần bổ sung</span>
          </div>
        </div>

        {/* Card 3: 01 Chờ thanh toán (Red Highlight) */}
        <div className="overview-stat-card border-red">
          <div className="stat-card-number text-red">01</div>
          <div className="stat-card-footer">
            <svg className="stat-card-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            <span className="stat-card-label">Chờ thanh toán</span>
          </div>
        </div>

        {/* Card 4: 08 Hoàn thành */}
        <div className="overview-stat-card">
          <div className="stat-card-number">08</div>
          <div className="stat-card-footer">
            <svg className="stat-card-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="stat-card-label">Hoàn thành</span>
          </div>
        </div>

        {/* Card 5: 02 Đã hủy */}
        <div className="overview-stat-card">
          <div className="stat-card-number">02</div>
          <div className="stat-card-footer">
            <svg className="stat-card-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

        {/* Filter Bar */}
        <div className="overview-filter-bar">
          <div className="overview-select-wrapper">
            <select
              className="overview-select"
              value={filterProcedure}
              onChange={(e) => setFilterProcedure(e.target.value)}
            >
              <option value="all">Lọc theo thủ tục</option>
              <option value="Cấp bảng điểm">Cấp bảng điểm</option>
              <option value="Xác nhận sinh viên">Xác nhận sinh viên</option>
              <option value="Cấp lại thẻ sinh viên">Cấp lại thẻ sinh viên</option>
              <option value="Xác nhận học phí">Xác nhận học phí</option>
              <option value="Phúc khảo bài thi">Phúc khảo bài thi</option>
              <option value="Đổi mã học phần">Đổi mã học phần</option>
              <option value="Xin nghỉ học tạm thời">Xin nghỉ học tạm thời</option>
            </select>
          </div>

          <div className="overview-select-wrapper">
            <select
              className="overview-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Lọc theo trạng thái</option>
              <option value="Chờ thanh toán">Chờ thanh toán</option>
              <option value="Đang xử lý">Đang xử lý</option>
              <option value="Cần bổ sung">Cần bổ sung</option>
              <option value="Hoàn thành">Hoàn thành</option>
              <option value="Đã hủy">Đã hủy</option>
            </select>
          </div>

          <div className="overview-select-wrapper">
            <select
              className="overview-select"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            >
              <option value="all">Lọc theo ngày</option>
              <option value="today">Hôm nay</option>
              <option value="week">7 ngày qua</option>
              <option value="month">30 ngày qua</option>
            </select>
          </div>

          <div className="overview-search-box">
            <svg className="overview-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="overview-search-input"
              placeholder="Tìm kiếm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overview-table-container">
          <table className="overview-table">
            <thead>
              <tr>
                <th style={{ width: '18%' }}>Mã yêu cầu</th>
                <th style={{ width: '28%' }}>Thủ tục</th>
                <th style={{ width: '18%' }}>Ngày gửi</th>
                <th style={{ width: '20%' }}>Trạng thái</th>
                <th style={{ width: '16%' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                    Không có yêu cầu nào phù hợp
                  </td>
                </tr>
              ) : (
                filtered.map((req) => {
                  const isRedPill = req.status === 'Chờ thanh toán' || req.status === 'Đang xử lý' || req.status === 'Cần bổ sung';
                  return (
                    <tr key={req.id}>
                      <td className="cell-code">{req.id}</td>
                      <td className="cell-proc">{req.procedure}</td>
                      <td className="cell-date">{req.date}</td>
                      <td>
                        <span className={`status-pill ${isRedPill ? 'pill-red' : 'pill-gray'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td>
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
      </div>
    </div>
  );
}

export default StudentDashboard;
