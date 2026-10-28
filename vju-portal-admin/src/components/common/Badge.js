import React from 'react';
import './Badge.css';

function Badge({ label, color, bg, variant = 'status' }) {
  const style = {
    color: color,
    backgroundColor: bg,
  };

  return (
    <span className={`badge badge--${variant}`} style={style}>
      {label}
    </span>
  );
}

export default Badge;
