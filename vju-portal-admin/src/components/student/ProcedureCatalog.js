import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { procedures } from '../../data/mockData';
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

function ProcedureCatalog() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Count items per category
  const hocVuCount = procedures.filter(p => p.category === 'hocvu').length;
  const ctsvCount = procedures.filter(p => p.category === 'ctsv').length;
  const taiChinhCount = procedures.filter(p => p.category === 'taichinh').length;
  const totalCount = procedures.length;

  const tabs = [
    { key: 'all', label: `Tất cả (${totalCount})` },
    { key: 'hocvu', label: `Học vụ (${hocVuCount})` },
    { key: 'ctsv', label: `CTSV (${ctsvCount})` },
    { key: 'taichinh', label: `Tài chính (${taiChinhCount})` },
  ];

  // Filter procedures by category & search term
  const filteredProcedures = procedures.filter(p => {
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
                              navigate(`/student/request/new/${proc.id}`);
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
