import React from 'react';
import './Pagination.css';

function Pagination({ currentPage = 1, totalPages = 5, onPageChange }) {
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, 2, 3);
      if (currentPage > 4) pages.push('...');
      if (currentPage > 3 && currentPage < totalPages - 2) pages.push(currentPage);
      if (currentPage < totalPages - 3) pages.push('...');
      pages.push(totalPages);
    }
    return [...new Set(pages)];
  };

  return (
    <div className="pagination">
      <button className="pagination-btn pagination-arrow" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {getPageNumbers().map((page, i) => (
        page === '...' ? (
          <span key={`d${i}`} className="pagination-dots">...</span>
        ) : (
          <button key={page} className={`pagination-btn ${page === currentPage ? 'active' : ''}`} onClick={() => onPageChange(page)}>
            {page}
          </button>
        )
      ))}
      <button className="pagination-btn pagination-arrow" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
    </div>
  );
}

export default Pagination;
