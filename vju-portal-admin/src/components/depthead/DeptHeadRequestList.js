import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../common/Badge';
import Pagination from '../common/Pagination';
import { allRequests, staffMembers, statusConfig } from '../../data/mockData';
import './DeptHeadPages.css';

function DeptHeadRequestList() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [assignments, setAssignments] = useState({});
  const [toastMessage, setToastMessage] = useState('');
  const pageSize = 6;

  const handleAssign = (reqId, staffName) => {
    setAssignments(prev => ({ ...prev, [reqId]: staffName }));
    if (staffName) {
      setToastMessage(`Đã phân công ${staffName} xử lý yêu cầu ${reqId}!`);
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const filtered = allRequests.filter(r => {
    if (filterStatus !== 'all') {
      if (filterStatus === 'pending' && !(r.status === 'pending' || r.status === 'Chờ phân công' || r.status === 'Đã gửi' || r.internal_status === 'Chờ phân công' || r.internal_status === 'Chờ thanh toán')) return false;
      if (filterStatus === 'processing' && !(r.status === 'processing' || r.status === 'Đang xử lý' || r.internal_status?.includes('thẩm định') || r.internal_status?.includes('phê duyệt') || r.internal_status?.includes('ký số'))) return false;
      if (filterStatus === 'supplement' && !(r.status === 'supplement' || r.status === 'Cần bổ sung' || r.internal_status === 'Cần bổ sung')) return false;
      if (filterStatus === 'completed' && !(r.status === 'completed' || r.status === 'Đã duyệt' || r.status === 'Đã xử lý' || r.status === 'Hoàn thành')) return false;
      if (filterStatus === 'rejected' && !(r.status === 'rejected' || r.status === 'Từ chối' || r.internal_status === 'Từ chối')) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        (r.request_code && r.request_code.toLowerCase().includes(q)) ||
        r.student.toLowerCase().includes(q) ||
        r.mssv.toLowerCase().includes(q) ||
        r.procedure.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedRequests = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="depthead-requests">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tất cả yêu cầu</h1>
          <p className="page-subtitle">Quản lý và phân công chuyên viên xử lý yêu cầu sinh viên</p>
        </div>
      </div>

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

      <div className="card">
        <div className="card-body">
          <div className="filter-bar">
            <div className="search-input">
              <span className="search-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#9CA3AF" strokeWidth="1.5"/><path d="M11 11l3.5 3.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </span>
              <input
                type="text"
                placeholder="Tìm kiếm theo mã YC, sinh viên, MSSV, thủ tục..."
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
              <option value="supplement">Bổ sung</option>
              <option value="approved">Đã duyệt</option>
              <option value="completed">Hoàn thành</option>
              <option value="rejected">Từ chối</option>
            </select>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Mã YC</th>
                  <th>Sinh viên</th>
                  <th>Thủ tục</th>
                  <th>Ngày nộp</th>
                  <th>Trạng thái</th>
                  <th>Phân công chuyên viên</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#9CA3AF' }}>
                      Không tìm thấy yêu cầu nào phù hợp
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map((req) => {
                    const sc = statusConfig[req.status] || { label: req.status, color: '#6B7280', bg: '#F3F4F6' };
                    const currentAssignee = assignments[req.id] !== undefined ? assignments[req.id] : req.assignee;
                    return (
                      <tr key={req.id}>
                        <td><strong>{req.id}</strong></td>
                        <td>
                          <div>{req.student}</div>
                          <div style={{ fontSize: 12, color: '#9CA3AF' }}>{req.mssv}</div>
                        </td>
                        <td>{req.procedure}</td>
                        <td>{req.date}</td>
                        <td><Badge label={sc.label} color={sc.color} bg={sc.bg} /></td>
                        <td>
                          <select
                            className="assign-select"
                            value={currentAssignee}
                            onChange={(e) => handleAssign(req.id, e.target.value)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: '1px solid var(--color-border)',
                              fontSize: 13,
                              background: currentAssignee ? '#EFF6FF' : '#FFF',
                              color: currentAssignee ? '#1E40AF' : '#6B7280',
                              fontWeight: currentAssignee ? 500 : 400,
                            }}
                          >
                            <option value="">-- Chưa phân công --</option>
                            {staffMembers.map(s => (
                              <option key={s.id} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn--link btn--sm" onClick={() => navigate(`/dept-head/request/${req.id}`)}>
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
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DeptHeadRequestList;
