import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import { procedures, procedureStatusMap, departmentOptions, approvalLevelOptions } from '../../../data/mockData';
import './ProcedureList.css';

function ProcedureList() {
  const navigate = useNavigate();
  const [list, setList] = useState(procedures);
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Form state for adding new procedure
  const [newProcName, setNewProcName] = useState('');
  const [newProcDept, setNewProcDept] = useState(departmentOptions[0]);
  const [newProcApproval, setNewProcApproval] = useState(approvalLevelOptions[0]);
  const [newProcSla, setNewProcSla] = useState('3-5 ngày');
  const [newProcFee, setNewProcFee] = useState('Miễn phí');
  const [newProcDesc, setNewProcDesc] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleAddProcedure = (e) => {
    e.preventDefault();
    if (!newProcName.trim()) return;

    const newProc = {
      id: Date.now(),
      name: newProcName.trim(),
      department: newProcDept,
      category: newProcDept.includes('CTSV') ? 'ctsv' : newProcDept.includes('KHTC') ? 'taichinh' : 'hocvu',
      time: newProcSla,
      sla: newProcSla,
      approvalLevels: newProcApproval,
      fee: newProcFee.trim() || 'Miễn phí',
      status: 'active',
      description: newProcDesc.trim() || 'Thủ tục mới được cấu hình bởi Quản trị viên',
    };

    setList([newProc, ...list]);
    setIsAddModalOpen(false);
    setNewProcName('');
    setNewProcDesc('');
    showToast(`Đã thêm thành công thủ tục "${newProc.name}"!`);
  };

  const handleToggleStatus = (id) => {
    setList((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const newStatus = p.status === 'active' ? 'paused' : 'active';
          showToast(`Đã đổi trạng thái sang "${newStatus === 'active' ? 'Hoạt động' : 'Tạm dừng'}"`);
          return { ...p, status: newStatus };
        }
        return p;
      })
    );
  };

  const handleDeleteProcedure = (id, name) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa thủ tục "${name}"?`)) {
      setList((prev) => prev.filter((p) => p.id !== id));
      showToast(`Đã xóa thủ tục "${name}"`);
    }
  };

  const filtered = list.filter((p) => {
    if (filterDept && p.department !== filterDept) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="procedure-list-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý thủ tục</h1>
          <p className="page-subtitle">Cấu hình, giám sát và quản lý danh mục thủ tục trực tuyến</p>
        </div>
        <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>+ Thêm thủ tục</Button>
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
          animation: 'fadeIn 0.3s ease'
        }}>
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Danh mục thủ tục ({filtered.length})</h2>
        </div>

        <div className="filter-bar">
          <select
            className="filter-select"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          >
            <option value="">Tất cả phòng ban</option>
            {departmentOptions.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
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
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF' }}>
                    Không tìm thấy thủ tục nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                filtered.map((proc) => {
                  const status = procedureStatusMap[proc.status] || { label: proc.status, color: '#6B7280', bg: '#F3F4F6' };
                  return (
                    <tr key={proc.id}>
                      <td className="col-name">{proc.name}</td>
                      <td>{proc.department}</td>
                      <td>{proc.approvalLevels}</td>
                      <td>{proc.sla || proc.time}</td>
                      <td>{proc.fee}</td>
                      <td>
                        <span
                          style={{ cursor: 'pointer' }}
                          title="Nhấp để đổi trạng thái"
                          onClick={() => handleToggleStatus(proc.id)}
                        >
                          <Badge label={status.label} color={status.color} bg={status.bg} />
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          <Button
                            variant="outline-red"
                            size="sm"
                            onClick={() => navigate('/admin/procedures/edit')}
                          >
                            Chỉnh sửa
                          </Button>
                          <button
                            title="Xóa thủ tục"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '6px',
                              color: '#9CA3AF',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            onClick={() => handleDeleteProcedure(proc.id, proc.name)}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M3 4h10M6 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M4.5 4l.8 9.2a1 1 0 001 .8h3.4a1 1 0 001-.8L11.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Procedure */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm thủ tục mới"
      >
        <form onSubmit={handleAddProcedure}>
          <div className="modal-field">
            <label>Tên thủ tục <span style={{ color: '#DC2626' }}>*</span></label>
            <input
              type="text"
              placeholder="Ví dụ: Cấp giấy chứng nhận rèn luyện..."
              value={newProcName}
              onChange={(e) => setNewProcName(e.target.value)}
              required
            />
          </div>

          <div className="modal-field">
            <label>Phòng ban phụ trách</label>
            <select value={newProcDept} onChange={(e) => setNewProcDept(e.target.value)}>
              {departmentOptions.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="modal-field">
            <label>Cấp duyệt</label>
            <select value={newProcApproval} onChange={(e) => setNewProcApproval(e.target.value)}>
              {approvalLevelOptions.map((appr) => (
                <option key={appr} value={appr}>{appr}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="modal-field">
              <label>Thời gian SLA</label>
              <input
                type="text"
                placeholder="Ví dụ: 3 ngày, 5 ngày..."
                value={newProcSla}
                onChange={(e) => setNewProcSla(e.target.value)}
              />
            </div>
            <div className="modal-field">
              <label>Lệ phí</label>
              <input
                type="text"
                placeholder="Ví dụ: Miễn phí hoặc 50.000 VND"
                value={newProcFee}
                onChange={(e) => setNewProcFee(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-field">
            <label>Mô tả ngắn</label>
            <textarea
              rows={3}
              placeholder="Mô tả mục đích và điều kiện nộp..."
              value={newProcDesc}
              onChange={(e) => setNewProcDesc(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={() => setIsAddModalOpen(false)}>Hủy</Button>
            <Button variant="primary" type="submit">Tạo thủ tục</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default ProcedureList;
