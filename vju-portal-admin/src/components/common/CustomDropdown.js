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
  const [hoveredValue, setHoveredValue] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setHoveredValue(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption && selectedOption.value !== 'all' && selectedOption.value !== ''
    ? selectedOption.label
    : (placeholder || 'Tất cả');

  const handleToggle = () => {
    setIsOpen(!isOpen);
    setHoveredValue(null);
  };

  return (
    <div
      className="custom-dropdown-container"
      style={{ width }}
      ref={containerRef}
    >
      <button
        type="button"
        className={`custom-dropdown-trigger ${isOpen ? 'open' : ''}`}
        onClick={handleToggle}
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
        <div
          className="custom-dropdown-menu"
          onMouseLeave={() => setHoveredValue(null)}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value || (!value && (opt.value === '' || opt.value === 'all'));
            const isHighlighted = hoveredValue !== null ? hoveredValue === opt.value : isSelected;

            return (
              <div
                key={opt.value}
                className={`custom-dropdown-item ${isHighlighted ? 'selected' : ''}`}
                onMouseEnter={() => setHoveredValue(opt.value)}
                onClick={() => {
                  onChange(opt.value);
                  setHoveredValue(null);
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
