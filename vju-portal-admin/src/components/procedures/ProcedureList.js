import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { procedures, procedureStatusMap } from '../../data/mockData';
import './ProcedureList.css';

function ProcedureList() {
  const navigate = useNavigate();
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const filtered = procedures.filter((p) => {
    if (filterDept && p.department !== filterDept) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="procedure-list-page">
      <h1 className="page-title">Quản lý thủ tục</h1>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Danh mục thủ tục</h2>
          <Button variant="primary">+ Thêm thủ tục</Button>
        </div>

        <div className="filter-bar">
          <select
            className="filter-select"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          >
            <option value="">Phòng ban</option>
            <option value="Phòng Đào tạo">Phòng Đào tạo</option>
            <option value="Phòng CTSV">Phòng CTSV</option>
            <option value="Phòng KHTC">Phòng KHTC</option>
          </select>

          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="paused">Tạm dừng</option>
          </select>

          <div className="filter-search">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="#9CA3AF" strokeWidth="1.5"/>
              <path d="M11 11l3.5 3.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm thủ tục..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tên thủ tục</th>
                <th>Phòng ban</th>
                <th>Cấp duyệt</th>
                <th>SLA</th>
                <th>Lệ phí</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((proc) => {
                const status = procedureStatusMap[proc.status];
                return (
                  <tr key={proc.id}>
                    <td className="col-name">{proc.name}</td>
                    <td>{proc.department}</td>
                    <td>{proc.approvalLevels}</td>
                    <td>{proc.sla}</td>
                    <td>{proc.fee}</td>
                    <td>
                      <Badge label={status.label} color={status.color} bg={status.bg} />
                    </td>
                    <td>
                      <Button
                        variant="outline-red"
                        size="sm"
                        onClick={() => navigate('/procedures/edit')}
                      >
                        Chỉnh sửa
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ProcedureList;
