import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../common/Badge';
import Pagination from '../common/Pagination';
import { studentRequests, statusConfig } from '../../data/mockData';
import './StudentPages.css';

function StudentDashboard() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const pageSize = 5;

  const counts = {
    total: studentRequests.length,
    pending: studentRequests.filter((r) => r.status === 'pending' || r.status === 'Chờ thanh toán' || r.status === 'Đã gửi').length,
    processing: studentRequests.filter((r) => r.status === 'processing' || r.status === 'Đang xử lý').length,
    supplement: studentRequests.filter((r) => r.status === 'supplement' || r.status === 'Cần bổ sung').length,
    completed: studentRequests.filter((r) => r.status === 'completed' || r.status === 'Đã duyệt' || r.status === 'Đã xử lý').length,
  };

  const statusCards = [
    { label: 'Tổng yêu cầu', value: counts.total, color: '#2563EB' },
    { label: 'Chờ xử lý', value: counts.pending, color: '#D97706' },
    { label: 'Đang xử lý', value: counts.processing, color: '#2563EB' },
    { label: 'Cần bổ sung', value: counts.supplement, color: '#F59E0B', alert: counts.supplement > 0 },
    { label: 'Hoàn thành', value: counts.completed, color: '#059669' },
  ];

  const filtered = studentRequests.filter((r) => {
    if (filterStatus !== 'all') {
      if (filterStatus === 'pending' && !(r.status === 'pending' || r.status === 'Chờ thanh toán' || r.status === 'Đã gửi')) return false;
      if (filterStatus === 'processing' && !(r.status === 'processing' || r.status === 'Đang xử lý')) return false;
      if (filterStatus === 'supplement' && !(r.status === 'supplement' || r.status === 'Cần bổ sung')) return false;
      if (filterStatus === 'completed' && !(r.status === 'completed' || r.status === 'Đã duyệt' || r.status === 'Đã xử lý')) return false;
      if (filterStatus === 'rejected' && !(r.status === 'rejected' || r.status === 'Từ chối')) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        (r.request_code && r.request_code.toLowerCase().includes(q)) ||
        r.procedure.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedRequests = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="student-dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Yêu cầu của tôi</h1>
          <p className="page-subtitle">Quản lý và theo dõi tiến độ các hồ sơ thủ tục hành chính đã gửi</p>
        </div>
        <button className="btn btn--primary btn--md" onClick={() => navigate('/student/procedures')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Tạo yêu cầu mới
        </button>
      </div>

      <div className="stat-cards">
        {statusCards.map((s, i) => (
          <div key={i} className="stat-card stat-card--border-left" style={{ borderLeftColor: s.color }}>
            <span className="stat-card-label">{s.label}</span>
            <span className="stat-card-value">{s.value}</span>
            {s.alert && <span className="stat-card-alert">Cần hành động</span>}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-body">
          <div className="filter-bar">
            <div className="search-input">
              <span className="search-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="#9CA3AF" strokeWidth="1.5"/>
                  <path d="M11 11l3.5 3.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </span>
              <input
                type="text"
                placeholder="Tìm theo mã YC, tên thủ tục, phòng ban..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ xử lý</option>
              <option value="processing">Đang xử lý</option>
              <option value="supplement">Cần bổ sung</option>
              <option value="completed">Hoàn thành</option>
              <option value="rejected">Từ chối</option>
            </select>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Mã yêu cầu</th>
                  <th>Thủ tục</th>
                  <th>Phòng ban</th>
                  <th>Ngày nộp</th>
                  <th>Cập nhật</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#9CA3AF' }}>
                      Không có yêu cầu nào phù hợp
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map((req) => {
                    const sc = statusConfig[req.status] || { label: req.status, color: '#6B7280', bg: '#F3F4F6' };
                    return (
                      <tr key={req.id}>
                        <td><strong>{req.id}</strong></td>
                        <td>{req.procedure}</td>
                        <td>{req.department}</td>
                        <td>{req.date}</td>
                        <td>{req.lastUpdate}</td>
                        <td><Badge label={sc.label} color={sc.color} bg={sc.bg} /></td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn--link btn--sm"
                            onClick={() => navigate(`/student/request/${req.id}`)}
                          >
                            Chi tiết →
                          </button>
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
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
