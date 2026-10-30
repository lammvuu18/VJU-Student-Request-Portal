import React from 'react';
import './Badge.css';

function Badge({ label, color, bg, variant = 'status' }) {
  return (
    <span className={`badge badge--${variant}`} style={{ color, backgroundColor: bg }}>
      {label}
    </span>
  );
}

export default Badge;
