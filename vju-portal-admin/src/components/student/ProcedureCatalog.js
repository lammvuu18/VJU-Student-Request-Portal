import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { procedures as defaultProcedures } from '../../data/mockData';
import './StudentPages.css';

const SECTIONS = [
  {
    key: 'hocvu',
    title: 'Học vụ — Phòng Đào tạo',
  },
  {
    key: 'ctsv',
    title: 'CTSV — Phòng Công tác sinh viên',
  },
  {
    key: 'taichinh',
    title: 'Tài chính — Phòng Kế hoạch – Tài chính',
  },
];

// Hàm chuyển đổi cấu trúc nhóm theo phòng ban từ Backend sang mảng phẳng cho giao diện
const mapBackendToProcedures = (deptGroups) => {
  if (!Array.isArray(deptGroups)) return [];
  const list = [];
  deptGroups.forEach(group => {
    const deptName = group.department_name || '';
    let category = 'hocvu';
    if (deptName.toLowerCase().includes('công tác') || deptName.toLowerCase().includes('ctsv')) {
      category = 'ctsv';
    } else if (deptName.toLowerCase().includes('tài chính') || deptName.toLowerCase().includes('khtc')) {
      category = 'taichinh';
    }

    (group.procedures || []).forEach(p => {
      const isFee = Boolean(p.is_fee_required && p.fee_amount && Number(p.fee_amount) > 0);
      list.push({
        id: p.type_id,
        type_id: p.type_id,
        name: p.name,
        description: p.description,
        department_id: group.department_id,
        department_name: deptName,
        category,
        sla_total_days: p.sla_total_days || 1,
        time: `${p.sla_total_days || 1} ngày làm việc`,
        is_fee_required: p.is_fee_required,
        fee_amount: p.fee_amount,
        fee: isFee ? `${Number(p.fee_amount).toLocaleString('vi-VN')} VNĐ` : 'Miễn phí',
      });
    });
  });
  return list;
};

function ProcedureCatalog() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [procedureList, setProcedureList] = useState(defaultProcedures);
  const [loading, setLoading] = useState(true);

  // Fetch danh mục thủ tục từ Backend API
  useEffect(() => {
    let isMounted = true;
    const fetchProcedures = async () => {
      setLoading(true);
      try {
        const res = await api.procedures.getAll();
        if (isMounted && res && res.data) {
          // Nếu backend trả về danh sách nhóm theo phòng ban
          if (Array.isArray(res.data) && res.data.length > 0 && res.data[0].procedures) {
            const mapped = mapBackendToProcedures(res.data);
            if (mapped.length > 0) {
              setProcedureList(mapped);
            }
          } else if (Array.isArray(res.data)) {
            setProcedureList(res.data);
          }
        }
      } catch (err) {
        console.warn('Lỗi khi tải thủ tục từ Backend, dùng dữ liệu dự phòng:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProcedures();
    return () => { isMounted = false; };
  }, []);

  // Đếm số lượng theo chuyên mục
  const hocVuCount = procedureList.filter(p => p.category === 'hocvu').length;
  const ctsvCount = procedureList.filter(p => p.category === 'ctsv').length;
  const taiChinhCount = procedureList.filter(p => p.category === 'taichinh').length;
  const totalCount = procedureList.length;

  const tabs = [
    { key: 'all', label: `Tất cả (${totalCount})` },
    { key: 'hocvu', label: `Học vụ (${hocVuCount})` },
    { key: 'ctsv', label: `CTSV (${ctsvCount})` },
    { key: 'taichinh', label: `Tài chính (${taiChinhCount})` },
  ];

  // Lọc thủ tục theo category & từ khóa tìm kiếm
  const filteredProcedures = procedureList.filter(p => {
    const matchCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch = !searchTerm.trim() || p.name.toLowerCase().includes(searchTerm.toLowerCase().trim());
    return matchCategory && matchSearch;
  });

  return (
    <div className="catalog-container">
      {/* Top Toolbar */}
      <div className="catalog-toolbar">
        {/* Category Pills */}
        <div className="catalog-pills">
          {tabs.map(tab => {
            const isActive = activeCategory === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={`catalog-pill ${isActive ? 'active' : ''}`}
                onClick={() => setActiveCategory(tab.key)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search input (width 260px) */}
        <div className="catalog-search-wrap">
          <span className="catalog-search-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#68717D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input
            type="text"
            className="catalog-search-input"
            placeholder="Tìm tên thủ tục, từ khóa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Loading state indicator */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '16px', color: '#68717D', fontSize: 13 }}>
          Đang đồng bộ dữ liệu thủ tục từ máy chủ...
        </div>
      )}

      {/* Sections List */}
      <div className="catalog-sections">
        {filteredProcedures.length === 0 ? (
          <div className="catalog-empty-state">
            <p>Không tìm thấy thủ tục nào phù hợp với từ khóa "{searchTerm}".</p>
          </div>
        ) : (
          SECTIONS.map(section => {
            const sectionProcs = filteredProcedures.filter(p => p.category === section.key);
            if (sectionProcs.length === 0) return null;

            return (
              <div key={section.key} className="catalog-section">
                <div className="catalog-section-head">
                  <h2 className="catalog-section-title">{section.title}</h2>
                  <div className="catalog-section-line" />
                </div>

                <div className="catalog-cards-grid">
                  {sectionProcs.map(proc => {
                    const isFree = proc.fee === 'Miễn phí';
                    return (
                      <div
                        key={proc.id}
                        className="procedure-card"
                        onClick={() => navigate(`/student/procedure/${proc.id}`)}
                      >
                        <div className="procedure-card-title">{proc.name}</div>
                        <div className="procedure-card-time">
                          ◷ {proc.time}
                        </div>
                        <div className="procedure-card-bottom">
                          <span className={`procedure-card-fee ${isFree ? 'fee-free' : 'fee-paid'}`}>
                            {proc.fee}
                          </span>
                          <button
                            type="button"
                            className="procedure-card-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/student/procedure/${proc.id}`);
                            }}
                          >
                            Nộp ngay
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ProcedureCatalog;
