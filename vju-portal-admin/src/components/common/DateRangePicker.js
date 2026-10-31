import React, { useState, useRef, useEffect } from 'react';
import './DateRangePicker.css';

function DateRangePicker({
  startDate,
  endDate,
  onChange,
  onClear,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Default internal selection or from props
  const [tempStart, setTempStart] = useState(startDate || null);
  const [tempEnd, setTempEnd] = useState(endDate || null);
  const [hoverDate, setHoverDate] = useState(null);

  // Month navigation: base month is October 2026
  const [baseYear, setBaseYear] = useState(2026);
  const [baseMonth, setBaseMonth] = useState(9); // 0-indexed: 9 = October

  useEffect(() => {
    setTempStart(startDate || null);
    setTempEnd(endDate || null);
  }, [startDate, endDate]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    if (baseMonth === 0) {
      setBaseMonth(11);
      setBaseYear(baseYear - 1);
    } else {
      setBaseMonth(baseMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (baseMonth === 11) {
      setBaseMonth(0);
      setBaseYear(baseYear + 1);
    } else {
      setBaseMonth(baseMonth + 1);
    }
  };

  // Helper to format Date to DD/MM/YYYY
  const formatDateStr = (d) => {
    if (!d) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Helper to parse DD/MM/YYYY to Date object
  const parseDateStr = (str) => {
    if (!str) return null;
    const parts = str.split('/');
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
  };

  const currentStartObj = typeof tempStart === 'string' ? parseDateStr(tempStart) : tempStart;
  const currentEndObj = typeof tempEnd === 'string' ? parseDateStr(tempEnd) : tempEnd;

  const handleDateClick = (dateObj) => {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dateObj);
      setTempEnd(null);
    } else {
      if (dateObj < currentStartObj) {
        setTempStart(dateObj);
        setTempEnd(currentStartObj);
      } else {
        setTempEnd(dateObj);
      }
    }
  };

  const handleApply = () => {
    if (tempStart && tempEnd) {
      const sStr = typeof tempStart === 'string' ? tempStart : formatDateStr(tempStart);
      const eStr = typeof tempEnd === 'string' ? tempEnd : formatDateStr(tempEnd);
      onChange({ startDate: sStr, endDate: eStr });
    } else if (tempStart) {
      const sStr = typeof tempStart === 'string' ? tempStart : formatDateStr(tempStart);
      onChange({ startDate: sStr, endDate: sStr });
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempStart(null);
    setTempEnd(null);
    if (onClear) onClear();
    setIsOpen(false);
  };

  const handleQuickOct2026 = () => {
    const s = new Date(2026, 9, 1);
    const e = new Date(2026, 9, 31);
    setTempStart(s);
    setTempEnd(e);
    onChange({ startDate: '01/10/2026', endDate: '31/10/2026' });
    setIsOpen(false);
  };

  // Generate calendar grid for a given year and month (0-indexed)
  // Monday is day 0 in Vietnam (T2, T3, T4, T5, T6, T7, CN)
  const generateMonthGrid = (year, month) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Day of week for 1st of month: 0=Sun, 1=Mon, ..., 6=Sat
    // Convert to Monday=0:
    let startDayOfWeek = (firstDay.getDay() + 6) % 7;

    const days = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const pDay = prevMonthLastDay - i;
      const pDate = new Date(year, month - 1, pDay);
      days.push({ dayNum: pDay, dateObj: pDate, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const cDate = new Date(year, month, d);
      days.push({ dayNum: d, dateObj: cDate, isCurrentMonth: true });
    }

    // Next month padding to fill up to 35 or 42 cells (6 rows = 42)
    const remaining = 42 - days.length;
    for (let n = 1; n <= remaining; n++) {
      const nDate = new Date(year, month + 1, n);
      days.push({ dayNum: n, dateObj: nDate, isCurrentMonth: false });
    }

    return days;
  };

  const renderMonthCalendar = (year, month, isLeft) => {
    const monthNames = [
      'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];
    const gridDays = generateMonthGrid(year, month);

    return (
      <div className="date-picker-month-panel">
        <div className="date-picker-month-header">
          {isLeft ? (
            <button type="button" className="date-picker-nav-btn" onClick={handlePrevMonth} aria-label="Tháng trước">
              ‹
            </button>
          ) : <div style={{ width: 24 }} />}

          <div className="date-picker-month-title">
            {monthNames[month]}, {year}
          </div>

          {!isLeft ? (
            <button type="button" className="date-picker-nav-btn" onClick={handleNextMonth} aria-label="Tháng sau">
              ›
            </button>
          ) : <div style={{ width: 24 }} />}
        </div>

        <div className="date-picker-weekdays">
          <span>T2</span>
          <span>T3</span>
          <span>T4</span>
          <span>T5</span>
          <span>T6</span>
          <span>T7</span>
          <span>CN</span>
        </div>

        <div className="date-picker-days-grid">
          {gridDays.map((item, idx) => {
            const time = item.dateObj.getTime();
            const startTime = currentStartObj ? currentStartObj.getTime() : null;
            const endTime = currentEndObj ? currentEndObj.getTime() : null;

            const isStart = startTime && time === startTime;
            const isEnd = endTime && time === endTime;
            const isInRange = startTime && endTime && time > startTime && time < endTime;

            let cellClass = 'date-picker-day-cell';
            if (!item.isCurrentMonth) cellClass += ' day-outside';
            if (isStart) cellClass += ' day-start';
            else if (isEnd) cellClass += ' day-end';
            else if (isInRange) cellClass += ' day-in-range';

            return (
              <div
                key={idx}
                className={cellClass}
                onClick={() => handleDateClick(item.dateObj)}
              >
                <span>{item.dayNum}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Month 2 is Month 1 + 1
  const nextMonthYear = baseMonth === 11 ? baseYear + 1 : baseYear;
  const nextMonth = baseMonth === 11 ? 0 : baseMonth + 1;

  // Display trigger label
  const hasRange = startDate && endDate;
  const displayTriggerText = hasRange ? `${startDate} - ${endDate}` : 'Lọc theo ngày';

  return (
    <div className="date-range-picker-container" ref={containerRef}>
      <button
        type="button"
        className={`date-range-picker-trigger ${isOpen ? 'open' : ''} ${hasRange ? 'has-value' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="date-range-picker-label">{displayTriggerText}</span>
        <svg
          className={`date-range-picker-arrow ${isOpen ? 'rotated' : ''}`}
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
        <div className="date-range-picker-popover">
          {/* Header row */}
          <div className="date-range-picker-popover-header">
            <div className="date-range-popover-title">Chọn khoảng ngày</div>
            <div className="date-range-popover-range-badge">
              {tempStart && tempEnd
                ? `${typeof tempStart === 'string' ? tempStart : formatDateStr(tempStart)} - ${typeof tempEnd === 'string' ? tempEnd : formatDateStr(tempEnd)}`
                : (tempStart ? `Từ ${typeof tempStart === 'string' ? tempStart : formatDateStr(tempStart)}` : '01/10/2026 - 31/10/2026')}
            </div>
            <div className="date-range-quick-actions">
              <button
                type="button"
                className="date-range-quick-btn"
                onClick={handleQuickOct2026}
              >
                Tháng 10/2026
              </button>
              {(tempStart || startDate) && (
                <button
                  type="button"
                  className="date-range-quick-btn clear"
                  onClick={handleClear}
                >
                  Xóa lọc
                </button>
              )}
            </div>
          </div>

          {/* 2 Month Calendars side by side */}
          <div className="date-range-calendars-row">
            {renderMonthCalendar(baseYear, baseMonth, true)}
            {renderMonthCalendar(nextMonthYear, nextMonth, false)}
          </div>

          {/* Bottom actions */}
          <div className="date-range-popover-footer">
            <button
              type="button"
              className="btn-date-cancel"
              onClick={() => setIsOpen(false)}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn-date-apply"
              onClick={handleApply}
            >
              Áp dụng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DateRangePicker;

