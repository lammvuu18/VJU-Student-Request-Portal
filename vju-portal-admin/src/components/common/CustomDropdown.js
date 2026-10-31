import React, { useState, useRef, useEffect } from 'react';
import './CustomDropdown.css';

function CustomDropdown({
  value,
  options = [],
  placeholder = 'Chọn...',
  onChange,
  width = 180,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption && selectedOption.value !== 'all'
    ? selectedOption.label
    : (placeholder || 'Tất cả');

  return (
    <div
      className="custom-dropdown-container"
      style={{ width }}
      ref={containerRef}
    >
      <button
        type="button"
        className={`custom-dropdown-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="custom-dropdown-label">{displayLabel}</span>
        <svg
          className={`custom-dropdown-arrow ${isOpen ? 'rotated' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="#68717D"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="custom-dropdown-menu">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                className={`custom-dropdown-item ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                <span>{opt.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CustomDropdown;

