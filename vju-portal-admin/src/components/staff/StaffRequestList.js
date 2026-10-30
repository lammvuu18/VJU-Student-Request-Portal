import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../common/Badge';
import SegmentedTabs from '../common/SegmentedTabs';
import Pagination from '../common/Pagination';
import { allRequests, statusConfig } from '../../data/mockData';
import './StaffPages.css';

const tabs = [
  { key: 'all', label: 'Tất cả' },
  { key: 'processing', label: 'Đang xử lý' },
  { key: 'supplement', label: 'Chờ bổ sung' },
  { key: 'completed', label: 'Hoàn thành' },
];

function StaffRequestList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter requests assigned to current staff
  const myRequests = allRequests.filter(r => r.assignee === 'Lê Hoàng Nam' || !r.assignee);
  const filtered = activeTab === 'all'
    ? myRequests
    : myRequests.filter(r => {
        if (activeTab === 'processing') return r.status === 'processing' || r.status === 'Đang xử lý' || r.internal_status?.includes('thẩm định') || r.internal_status?.includes('phê duyệt') || r.internal_status?.includes('ký số');
        if (activeTab === 'supplement') return r.status === 'supplement' || r.status === 'Cần bổ sung' || r.internal_status === 'Cần bổ sung';
        if (activeTab === 'completed') return r.status === 'completed' || r.status === 'Đã duyệt' || r.status === 'Đã xử lý' || r.status === 'Hoàn thành';
        return r.status === activeTab;
      });

  return (
    <div className="staff-requests">
      <div className="page-header">
        <div>
          <h1 className="page-title">Yêu cầu được giao</h1>
          <p className="page-subtitle">Danh sách yêu cầu cần xử lý</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <SegmentedTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="table-wrapper" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Mã YC</th>
                  <th>Sinh viên</th>
                  <th>Thủ tục</th>
                  <th>Ngày nộp</th>
                  <th>Ưu tiên</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#9CA3AF', padding: 32 }}>Không có yêu cầu nào</td></tr>
                ) : (
                  filtered.map((req) => {
                    const sc = statusConfig[req.status];
                    return (
                      <tr key={req.id}>
                        <td><strong>{req.id}</strong></td>
                        <td>
                          <div>{req.student}</div>
                          <div style={{ fontSize: 12, color: '#9CA3AF' }}>{req.mssv}</div>
                        </td>
                        <td>{req.procedure}</td>
                        <td>{req.date}</td>
                        <td>
                          {req.priority === 'urgent'
                            ? <Badge label="Gấp" color="#DC2626" bg="#FEF2F2" />
                            : <span style={{ color: '#9CA3AF', fontSize: 13 }}>Bình thường</span>
                          }
                        </td>
                        <td><Badge label={sc.label} color={sc.color} bg={sc.bg} /></td>
                        <td>
                          <button className="btn btn--link btn--sm" onClick={() => navigate(`/staff/request/${req.id}`)}>
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
          <Pagination currentPage={currentPage} totalPages={1} onPageChange={setCurrentPage} />
        </div>
      </div>
    </div>
  );
}

export default StaffRequestList;
