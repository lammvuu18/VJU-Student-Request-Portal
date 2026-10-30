import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SegmentedTabs from '../common/SegmentedTabs';
import { procedures, procedureCategories } from '../../data/mockData';
import './StudentPages.css';

function ProcedureCatalog() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = procedures.filter(p => {
    const matchCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Group by department
  const grouped = {};
  filtered.forEach(p => {
    if (!grouped[p.department]) grouped[p.department] = [];
    grouped[p.department].push(p);
  });

  return (
    <div className="procedure-catalog">
      <div className="page-header">
        <div>
          <h1 className="page-title">Danh mục thủ tục</h1>
          <p className="page-subtitle">Chọn thủ tục bạn muốn thực hiện</p>
        </div>
      </div>

      <div className="catalog-toolbar">
        <SegmentedTabs tabs={procedureCategories} activeTab={activeCategory} onTabChange={setActiveCategory} />
        <div className="search-input">
          <span className="search-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#9CA3AF" strokeWidth="1.5"/><path d="M11 11l3.5 3.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </span>
          <input type="text" placeholder="Tìm kiếm thủ tục..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {Object.entries(grouped).map(([dept, procs]) => (
        <div key={dept} className="catalog-section">
          <h2 className="catalog-section-title">{dept}</h2>
          <div className="catalog-grid">
            {procs.map(p => (
              <div key={p.id} className="catalog-card" onClick={() => navigate(`/student/procedure/${p.id}`)}>
                <div className="catalog-card-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#AA2327" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#AA2327" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <h3 className="catalog-card-title">{p.name}</h3>
                <p className="catalog-card-desc">{p.description}</p>
                <div className="catalog-card-meta">
                  <span>⏱ {p.time}</span>
                  <span>💰 {p.fee}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ProcedureCatalog;
